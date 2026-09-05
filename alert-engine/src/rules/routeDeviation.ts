import { AlertEvent, AlertRule } from './types.js';

export const checkRouteDeviation: AlertRule = (fleet, telemetry) => {
  // Simplified tolerance check: in full feature, checks against GeoJSON polyline corridor.
  // We provide the pure function signature and configurable tolerance.
  const MAX_ROUTE_DEVIATION_METERS = 30.0;

  // Placeholder metric for deviations (can be supplied or calculated against corridor)
  const simulatedDeviation = (telemetry as any).deviation_m ?? 0;

  if (simulatedDeviation > MAX_ROUTE_DEVIATION_METERS) {
    return [
      {
        vehicleId: telemetry.vehicleId,
        type: 'route_deviation',
        severity: 'medium',
        details: {
          deviation_m: simulatedDeviation,
          tolerance_m: MAX_ROUTE_DEVIATION_METERS,
          assignedRoute: fleet.get(telemetry.vehicleId)?.assignedRouteId || 'ROUTE-01',
        },
        raisedAt: telemetry.timestamp || new Date().toISOString(),
      },
    ];
  }

  return [];
};
