import { AlertEvent, AlertRule } from './types.js';

export const UNUSUAL_HALT_THRESHOLD_MS = 60 * 1000; // 60 seconds

export const checkUnusualHalt: AlertRule = (fleet, telemetry) => {
  const currentState = fleet.get(telemetry.vehicleId);
  if (!currentState) return [];

  // If vehicle has been stopped for longer than threshold
  if (telemetry.speed_kmph < 1.0 && currentState.haltStartTime) {
    const haltedDurationMs = Date.now() - currentState.haltStartTime;

    if (haltedDurationMs > UNUSUAL_HALT_THRESHOLD_MS) {
      return [
        {
          vehicleId: telemetry.vehicleId,
          type: 'unusual_halt',
          severity: 'medium',
          details: {
            haltDurationSeconds: Math.round(haltedDurationMs / 1000),
            thresholdSeconds: UNUSUAL_HALT_THRESHOLD_MS / 1000,
            location: telemetry.position,
          },
          raisedAt: telemetry.timestamp || new Date().toISOString(),
        },
      ];
    }
  }

  return [];
};
