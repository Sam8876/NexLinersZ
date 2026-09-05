"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOverspeeding = void 0;
const checkOverspeeding = (fleet, telemetry) => {
    const currentState = fleet.get(telemetry.vehicleId);
    const speedLimit = currentState?.speedLimitKmph ?? 20.0;
    const speed = telemetry.speed_kmph;
    const activeAlert = currentState?.activeAlerts?.get('overspeeding');
    if (speed > speedLimit) {
        const delta = Math.round((speed - speedLimit) * 10) / 10;
        const severity = delta >= 15 ? 'critical' : delta > 8 ? 'high' : 'medium';
        let action = 'raise';
        if (activeAlert) {
            if ((activeAlert.severity === 'medium' && (severity === 'high' || severity === 'critical')) ||
                (activeAlert.severity === 'high' && severity === 'critical')) {
                action = 'escalate';
            }
            else {
                action = 'update';
            }
        }
        return [
            {
                vehicleId: telemetry.vehicleId,
                type: 'overspeeding',
                severity,
                details: {
                    speed_kmph: speed,
                    speed_limit_kmph: speedLimit,
                    delta_kmph: delta,
                    action,
                    assigned_route_id: currentState?.assignedRouteId ?? 'ROUTE-01',
                },
                raisedAt: activeAlert ? activeAlert.raisedAt : (telemetry.timestamp || new Date().toISOString()),
            },
        ];
    }
    // If vehicle has returned to safe speed and has an active overspeeding alert
    if (activeAlert) {
        return [
            {
                vehicleId: telemetry.vehicleId,
                type: 'overspeeding',
                severity: activeAlert.severity,
                details: {
                    speed_kmph: speed,
                    speed_limit_kmph: speedLimit,
                    delta_kmph: 0,
                    action: 'clear',
                    assigned_route_id: currentState?.assignedRouteId ?? 'ROUTE-01',
                },
                raisedAt: activeAlert.raisedAt,
            },
        ];
    }
    return [];
};
exports.checkOverspeeding = checkOverspeeding;
