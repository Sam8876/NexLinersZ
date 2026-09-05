import dotenv from 'dotenv';
import { TelemetryPayload, AlertRecord } from './types/index.js';
import { fleetState } from './state/fleetState.js';
import { checkOverspeeding } from './rules/overspeeding.js';
import { checkCollisionCloseAsync } from './rules/collisionClose.js';
import { checkUnusualHalt } from './rules/unusualHalt.js';
import { checkRouteDeviation } from './rules/routeDeviation.js';
import { checkSignalLost } from './rules/signalLost.js';
import { handleSosSignal } from './rules/sos.js';
import { insertAlert, updateAlertDetails, resolveAlert } from './db/supabase.js';
import { writeTelemetry } from './db/influx.js';
import { mqttManager } from './mqtt/client.js';

dotenv.config();

const siteId = process.env.MINE_SITE_ID || 'bailadila';

// Global operational speed limits (dynamically updated via settings panel)
export let globalConfig = {
  speedLimitKmph: 20.0, // Default Level 3 fog limit
  segmentLimits: {
    'ROUTE-RAMP-01': 20.0,
    'ROUTE-RAMP-02': 25.0,
    'ROUTE-SPUR-3B': 20.0,
  } as Record<string, number>,
};

console.log('=====================================================');
console.log('NMDC Bailadila Fog-Safe Haulage - Alert Engine v1.0.0');
console.log(`Monitoring site: [${siteId}]`);
console.log(`Default speed limit: [${globalConfig.speedLimitKmph} km/h]`);
console.log('=====================================================');

async function handleIncomingMessage(topic: string, payload: Buffer): Promise<void> {
  try {
    const raw = payload.toString();
    const data = JSON.parse(raw);

    // 1. Handle dynamic configuration updates from Dispatcher Settings Panel
    if (topic.includes('/config/')) {
      console.log(`[CONFIG] Received configuration update on topic ${topic}:`, data);
      if (typeof data.speedLimitKmph === 'number') {
        globalConfig.speedLimitKmph = data.speedLimitKmph;
      }
      if (typeof data.globalSpeedLimit === 'number') {
        globalConfig.speedLimitKmph = data.globalSpeedLimit;
      }
      if (data.segmentLimits && typeof data.segmentLimits === 'object') {
        globalConfig.segmentLimits = { ...globalConfig.segmentLimits, ...data.segmentLimits };
      }

      // Update all existing fleet vehicle states with new limit
      for (const v of fleetState.getAllVehicles()) {
        v.speedLimitKmph = (v.assignedRouteId && globalConfig.segmentLimits[v.assignedRouteId])
          ? globalConfig.segmentLimits[v.assignedRouteId]
          : globalConfig.speedLimitKmph;
      }

      console.log(`[CONFIG] Active speed limit updated to: ${globalConfig.speedLimitKmph} km/h`);
      return;
    }

    // Topic format: mine/{siteId}/vehicle/{vehicleId}/{type}
    const topicParts = topic.split('/');
    const subType = topicParts[4]; // 'telemetry' or 'sos'
    const vehicleId = topicParts[3] || data.vehicleId;

    // 2. Handle SOS button signals immediately
    if (subType === 'sos' || topic.endsWith('/sos')) {
      console.warn(`[EMERGENCY] Received SOS push button signal from ${vehicleId}!`);
      const sosAlert = handleSosSignal(vehicleId, data);
      await persistAlert(sosAlert);
      return;
    }

    // 3. Telemetry message
    const telemetry = data as TelemetryPayload;
    if (!telemetry.vehicleId || !telemetry.position) {
      return;
    }

    // Update fleet state store with configured speed limit for this vehicle's route
    const vehicleRoute = data.routeId || 'ROUTE-01';
    const vehicleSpeedLimit = globalConfig.segmentLimits[vehicleRoute] || globalConfig.speedLimitKmph;

    const vState = fleetState.updateVehicle(telemetry);
    vState.assignedRouteId = vehicleRoute;
    vState.speedLimitKmph = vehicleSpeedLimit;

    // Persist time-series to InfluxDB (history/replay)
    writeTelemetry(telemetry);

    // Build fleet map for relational rules evaluation
    const fleetMap = new Map(
      fleetState.getAllVehicles().map((v) => [v.vehicleId, v])
    );

    // 4. Evaluate Overspeeding Rule End-to-End
    const overspeedEvents = checkOverspeeding(fleetMap, telemetry);
    for (const ev of overspeedEvents) {
      const action = (ev.details as any).action;

      if (action === 'raise' || action === 'escalate') {
        const record = await persistAlert(ev);
        if (record) {
          fleetState.setActiveAlert(ev.vehicleId, 'overspeeding', {
            alertId: record.alert_id,
            severity: ev.severity,
            raisedAt: ev.raisedAt,
          });
        }
      } else if (action === 'update') {
        const active = fleetState.getActiveAlert(ev.vehicleId, 'overspeeding');
        if (active) {
          await updateAlertDetails(active.alertId, ev.details);
        }
      } else if (action === 'clear') {
        const active = fleetState.clearActiveAlert(ev.vehicleId, 'overspeeding');
        if (active) {
          console.log(`[ALERT CLEAR] Vehicle ${ev.vehicleId} speed normalized to ${telemetry.speed_kmph} km/h (limit: ${(ev.details as any).speed_limit_kmph} km/h). Auto-resolving alert.`);
          await resolveAlert(active.alertId);
          // Notify HMI that overspeeding condition has cleared
          const alertTopic = `mine/${siteId}/vehicle/${ev.vehicleId}/alert`;
          mqttManager.publish(
            alertTopic,
            JSON.stringify({
              alert_id: active.alertId,
              vehicle_id: ev.vehicleId,
              type: 'overspeeding',
              status: 'resolved',
              resolved_at: new Date().toISOString(),
            })
          );
        }
      }
    }

    // 5. Evaluate Collision Close Rule (using OSRM Road-Network Distance)
    const collisionAlerts = await checkCollisionCloseAsync(fleetMap, telemetry);
    for (const alert of collisionAlerts) {
      await persistAlert(alert);
    }

    // 6. Evaluate other rules
    const otherAlerts = [
      ...checkUnusualHalt(fleetMap, telemetry),
      ...checkRouteDeviation(fleetMap, telemetry),
    ];
    for (const alert of otherAlerts) {
      await persistAlert(alert);
    }
  } catch (err) {
    console.error('[Engine] Error processing incoming telemetry:', err);
  }
}

async function persistAlert(alertEvent: any): Promise<AlertRecord | null> {
  console.log(
    `[ALERT FIRED] [${alertEvent.severity.toUpperCase()}] ${alertEvent.type} on ${alertEvent.vehicleId} ` +
    `details: ${JSON.stringify(alertEvent.details)}`
  );

  const record: Omit<AlertRecord, 'alert_id'> = {
    vehicle_id: alertEvent.vehicleId,
    type: alertEvent.type,
    severity: alertEvent.severity,
    status: 'raised',
    raised_at: alertEvent.raisedAt || new Date().toISOString(),
    details: alertEvent.details,
  };

  const inserted = await insertAlert(record);

  // Dispatch alert event back to vehicle in-cab HMI
  const alertTopic = `mine/${siteId}/vehicle/${alertEvent.vehicleId}/alert`;
  mqttManager.publish(alertTopic, JSON.stringify(inserted || record));

  return inserted;
}

// Background supervisor checking for signal lost (LTE/mesh silence)
setInterval(() => {
  const fleetMap = new Map(
    fleetState.getAllVehicles().map((v) => [v.vehicleId, v])
  );
  const lostAlerts = checkSignalLost(fleetMap);
  for (const alert of lostAlerts) {
    persistAlert(alert);
  }
}, 5000);

async function start(): Promise<void> {
  await mqttManager.connect(handleIncomingMessage);
  console.log('[Engine] Alert & Monitoring Engine active and listening to fleet telemetry.');
}

start().catch((err) => {
  console.error('[Engine] Fatal startup error:', err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[Engine] Shutting down gracefully...');
  await mqttManager.disconnect();
  process.exit(0);
});
