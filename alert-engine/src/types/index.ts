/**
 * Data Contracts matching AGENTS.md Section 3 and PROJECT_PLAN.md Section 3
 */

export type PositionSource = 'rtk_fixed' | 'rtk_float' | 'gps';
export type RTKStatus = 'fixed' | 'float' | 'none';
export type ConnectivityMode = 'lte' | 'lorawan' | 'mesh';

export interface VehiclePosition {
  lat: number;
  lon: number;
  source: PositionSource;
}

export interface TelemetryPayload {
  vehicleId: string;
  timestamp: string;
  position: VehiclePosition;
  speed_kmph: number;
  heading_deg: number;
  rtkStatus: RTKStatus;
  connectivity: ConnectivityMode;
}

export type AlertType =
  | 'overspeeding'
  | 'sos'
  | 'collision_close'
  | 'unusual_halt'
  | 'route_deviation'
  | 'signal_lost';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AlertStatus = 'raised' | 'acknowledged' | 'resolved';

export interface AlertRecord {
  alert_id: string;
  vehicle_id: string;
  type: AlertType;
  severity: AlertSeverity;
  status: AlertStatus;
  raised_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  acknowledged_by?: string | null;
  details?: Record<string, unknown>;
}

export interface VehicleMetadata {
  id: string;
  model: string;
  capacity_tonnes: number;
  assigned_route_id: string;
  driver_name: string;
  last_maintenance_at: string;
  status: 'active' | 'maintenance' | 'offline';
}

export interface ActiveAlertInfo {
  alertId: string;
  severity: AlertSeverity;
  raisedAt: string;
}

export interface VehicleState {
  vehicleId: string;
  lastTelemetry: TelemetryPayload;
  lastReceivedAt: number; // Unix epoch ms
  assignedRouteId?: string;
  speedLimitKmph?: number;
  haltStartTime?: number | null;
  activeAlerts?: Map<AlertType, ActiveAlertInfo>;
}
