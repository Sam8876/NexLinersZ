"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkUnusualHalt = exports.UNUSUAL_HALT_THRESHOLD_MS = void 0;
exports.UNUSUAL_HALT_THRESHOLD_MS = 60 * 1000; // 60 seconds
const checkUnusualHalt = (fleet, telemetry) => {
    const currentState = fleet.get(telemetry.vehicleId);
    if (!currentState)
        return [];
    // If vehicle has been stopped for longer than threshold
    if (telemetry.speed_kmph < 1.0 && currentState.haltStartTime) {
        const haltedDurationMs = Date.now() - currentState.haltStartTime;
        if (haltedDurationMs > exports.UNUSUAL_HALT_THRESHOLD_MS) {
            return [
                {
                    vehicleId: telemetry.vehicleId,
                    type: 'unusual_halt',
                    severity: 'medium',
                    details: {
                        haltDurationSeconds: Math.round(haltedDurationMs / 1000),
                        thresholdSeconds: exports.UNUSUAL_HALT_THRESHOLD_MS / 1000,
                        location: telemetry.position,
                    },
                    raisedAt: telemetry.timestamp || new Date().toISOString(),
                },
            ];
        }
    }
    return [];
};
exports.checkUnusualHalt = checkUnusualHalt;
