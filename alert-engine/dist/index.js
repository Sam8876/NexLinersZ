"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalConfig = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const fleetState_js_1 = require("./state/fleetState.js");
const overspeeding_js_1 = require("./rules/overspeeding.js");
const collisionClose_js_1 = require("./rules/collisionClose.js");
const unusualHalt_js_1 = require("./rules/unusualHalt.js");
const routeDeviation_js_1 = require("./rules/routeDeviation.js");
const signalLost_js_1 = require("./rules/signalLost.js");
const sos_js_1 = require("./rules/sos.js");
const supabase_js_1 = require("./db/supabase.js");
const influx_js_1 = require("./db/influx.js");
const client_js_1 = require("./mqtt/client.js");
dotenv_1.default.config();
const siteId = process.env.MINE_SITE_ID || 'bailadila';
// Global operational speed limits (dynamically updated via settings panel)
exports.globalConfig = {
    speedLimitKmph: 20.0, // Default Level 3 fog limit
    segmentLimits: {
        'ROUTE-RAMP-01': 20.0,
        'ROUTE-RAMP-02': 25.0,
        'ROUTE-SPUR-3B': 20.0,
    },
};
console.log('=====================================================');
console.log('NMDC Bailadila Fog-Safe Haulage - Alert Engine v1.0.0');
console.log(`Monitoring site: [${siteId}]`);
console.log(`Default speed limit: [${exports.globalConfig.speedLimitKmph} km/h]`);
console.log('=====================================================');
async function handleIncomingMessage(topic, payload) {
    try {
        const raw = payload.toString();
        const data = JSON.parse(raw);
        // 1. Handle dynamic configuration updates from Dispatcher Settings Panel
        if (topic.includes('/config/')) {
            console.log(`[CONFIG] Received configuration update on topic ${topic}:`, data);
            if (typeof data.speedLimitKmph === 'number') {
                exports.globalConfig.speedLimitKmph = data.speedLimitKmph;
            }
            if (typeof data.globalSpeedLimit === 'number') {
                exports.globalConfig.speedLimitKmph = data.globalSpeedLimit;
            }
            if (data.segmentLimits && typeof data.segmentLimits === 'object') {
                exports.globalConfig.segmentLimits = { ...exports.globalConfig.segmentLimits, ...data.segmentLimits };
            }
            // Update all existing fleet vehicle states with new limit
            for (const v of fleetState_js_1.fleetState.getAllVehicles()) {
                v.speedLimitKmph = (v.assignedRouteId && exports.globalConfig.segmentLimits[v.assignedRouteId])
                    ? exports.globalConfig.segmentLimits[v.assignedRouteId]
                    : exports.globalConfig.speedLimitKmph;
            }
            console.log(`[CONFIG] Active speed limit updated to: ${exports.globalConfig.speedLimitKmph} km/h`);
            return;
        }
        // Topic format: mine/{siteId}/vehicle/{vehicleId}/{type}
        const topicParts = topic.split('/');
        const subType = topicParts[4]; // 'telemetry' or 'sos'
        const vehicleId = topicParts[3] || data.vehicleId;
        // 2. Handle SOS button signals immediately
        if (subType === 'sos' || topic.endsWith('/sos')) {
            console.warn(`[EMERGENCY] Received SOS push button signal from ${vehicleId}!`);
            const sosAlert = (0, sos_js_1.handleSosSignal)(vehicleId, data);
            await persistAlert(sosAlert);
            return;
        }
        // 3. Telemetry message
        const telemetry = data;
        if (!telemetry.vehicleId || !telemetry.position) {
            return;
        }
        // Update fleet state store with configured speed limit for this vehicle's route
        const vehicleRoute = data.routeId || 'ROUTE-01';
        const vehicleSpeedLimit = exports.globalConfig.segmentLimits[vehicleRoute] || exports.globalConfig.speedLimitKmph;
        const vState = fleetState_js_1.fleetState.updateVehicle(telemetry);
        vState.assignedRouteId = vehicleRoute;
        vState.speedLimitKmph = vehicleSpeedLimit;
        // Persist time-series to InfluxDB (history/replay)
        (0, influx_js_1.writeTelemetry)(telemetry);
        // Build fleet map for relational rules evaluation
        const fleetMap = new Map(fleetState_js_1.fleetState.getAllVehicles().map((v) => [v.vehicleId, v]));
        // 4. Evaluate Overspeeding Rule End-to-End
        const overspeedEvents = (0, overspeeding_js_1.checkOverspeeding)(fleetMap, telemetry);
        for (const ev of overspeedEvents) {
            const action = ev.details.action;
            if (action === 'raise' || action === 'escalate') {
                const record = await persistAlert(ev);
                if (record) {
                    fleetState_js_1.fleetState.setActiveAlert(ev.vehicleId, 'overspeeding', {
                        alertId: record.alert_id,
                        severity: ev.severity,
                        raisedAt: ev.raisedAt,
                    });
                }
            }
            else if (action === 'update') {
                const active = fleetState_js_1.fleetState.getActiveAlert(ev.vehicleId, 'overspeeding');
                if (active) {
                    await (0, supabase_js_1.updateAlertDetails)(active.alertId, ev.details);
                }
            }
            else if (action === 'clear') {
                const active = fleetState_js_1.fleetState.clearActiveAlert(ev.vehicleId, 'overspeeding');
                if (active) {
                    console.log(`[ALERT CLEAR] Vehicle ${ev.vehicleId} speed normalized to ${telemetry.speed_kmph} km/h (limit: ${ev.details.speed_limit_kmph} km/h). Auto-resolving alert.`);
                    await (0, supabase_js_1.resolveAlert)(active.alertId);
                    // Notify HMI that overspeeding condition has cleared
                    const alertTopic = `mine/${siteId}/vehicle/${ev.vehicleId}/alert`;
                    client_js_1.mqttManager.publish(alertTopic, JSON.stringify({
                        alert_id: active.alertId,
                        vehicle_id: ev.vehicleId,
                        type: 'overspeeding',
                        status: 'resolved',
                        resolved_at: new Date().toISOString(),
                    }));
                }
            }
        }
        // 5. Evaluate Collision Close Rule (using OSRM Road-Network Distance)
        const collisionAlerts = await (0, collisionClose_js_1.checkCollisionCloseAsync)(fleetMap, telemetry);
        for (const alert of collisionAlerts) {
            await persistAlert(alert);
        }
        // 6. Evaluate other rules
        const otherAlerts = [
            ...(0, unusualHalt_js_1.checkUnusualHalt)(fleetMap, telemetry),
            ...(0, routeDeviation_js_1.checkRouteDeviation)(fleetMap, telemetry),
        ];
        for (const alert of otherAlerts) {
            await persistAlert(alert);
        }
    }
    catch (err) {
        console.error('[Engine] Error processing incoming telemetry:', err);
    }
}
async function persistAlert(alertEvent) {
    console.log(`[ALERT FIRED] [${alertEvent.severity.toUpperCase()}] ${alertEvent.type} on ${alertEvent.vehicleId} ` +
        `details: ${JSON.stringify(alertEvent.details)}`);
    const record = {
        vehicle_id: alertEvent.vehicleId,
        type: alertEvent.type,
        severity: alertEvent.severity,
        status: 'raised',
        raised_at: alertEvent.raisedAt || new Date().toISOString(),
        details: alertEvent.details,
    };
    const inserted = await (0, supabase_js_1.insertAlert)(record);
    // Dispatch alert event back to vehicle in-cab HMI
    const alertTopic = `mine/${siteId}/vehicle/${alertEvent.vehicleId}/alert`;
    client_js_1.mqttManager.publish(alertTopic, JSON.stringify(inserted || record));
    return inserted;
}
// Background supervisor checking for signal lost (LTE/mesh silence)
setInterval(() => {
    const fleetMap = new Map(fleetState_js_1.fleetState.getAllVehicles().map((v) => [v.vehicleId, v]));
    const lostAlerts = (0, signalLost_js_1.checkSignalLost)(fleetMap);
    for (const alert of lostAlerts) {
        persistAlert(alert);
    }
}, 5000);
async function start() {
    await client_js_1.mqttManager.connect(handleIncomingMessage);
    console.log('[Engine] Alert & Monitoring Engine active and listening to fleet telemetry.');
}
start().catch((err) => {
    console.error('[Engine] Fatal startup error:', err);
    process.exit(1);
});
// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n[Engine] Shutting down gracefully...');
    await client_js_1.mqttManager.disconnect();
    process.exit(0);
});
