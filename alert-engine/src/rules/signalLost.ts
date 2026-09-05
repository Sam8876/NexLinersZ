import { AlertEvent } from './types.js';
import { VehicleState } from '../types/index.js';

export const HEARTBEAT_TIMEOUT_MS = 15 * 1000; // 15 seconds without packet

export function checkSignalLost(fleet: Map<string, VehicleState>): AlertEvent[] {
  const alerts: AlertEvent[] = [];
  const now = Date.now();

  for (const [vehicleId, state] of fleet.entries()) {
    const elapsed = now - state.lastReceivedAt;
    if (elapsed > HEARTBEAT_TIMEOUT_MS) {
      alerts.push({
        vehicleId,
        type: 'signal_lost',
        severity: 'high',
        details: {
          lastSeenMsAgo: elapsed,
          timeoutThresholdMs: HEARTBEAT_TIMEOUT_MS,
          lastKnownPosition: state.lastTelemetry.position,
        },
        raisedAt: new Date().toISOString(),
      });
    }
  }

  return alerts;
}
