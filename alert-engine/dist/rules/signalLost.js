"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HEARTBEAT_TIMEOUT_MS = void 0;
exports.checkSignalLost = checkSignalLost;
exports.HEARTBEAT_TIMEOUT_MS = 15 * 1000; // 15 seconds without packet
function checkSignalLost(fleet) {
    const alerts = [];
    const now = Date.now();
    for (const [vehicleId, state] of fleet.entries()) {
        const elapsed = now - state.lastReceivedAt;
        if (elapsed > exports.HEARTBEAT_TIMEOUT_MS) {
            alerts.push({
                vehicleId,
                type: 'signal_lost',
                severity: 'high',
                details: {
                    lastSeenMsAgo: elapsed,
                    timeoutThresholdMs: exports.HEARTBEAT_TIMEOUT_MS,
                    lastKnownPosition: state.lastTelemetry.position,
                },
                raisedAt: new Date().toISOString(),
            });
        }
    }
    return alerts;
}
