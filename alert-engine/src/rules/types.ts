import { TelemetryPayload, VehicleState, AlertRecord, AlertType, AlertSeverity } from '../types/index.js';

export interface AlertEvent {
  vehicleId: string;
  type: AlertType;
  severity: AlertSeverity;
  details: Record<string, unknown>;
  raisedAt: string;
}

export type AlertRule = (
  fleet: Map<string, VehicleState>,
  telemetry: TelemetryPayload
) => AlertEvent[];
