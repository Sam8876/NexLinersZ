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
  details?: Record<string, any>;
}

export interface VehicleItem {
  id: string;
  callsign: string;
  model: string;
  status: 'LOCKED' | 'STANDBY' | 'ACTIVE' | 'MAINTENANCE';
  route: string;
  payloadTonnes: number;
  speedKmph: number;
  assignedRouteId: string;
  // SVG coordinates for tactical view
  svgX?: number;
  svgY?: number;
  headingDeg?: number;
  alertLevel?: 'normal' | 'warning' | 'critical' | 'lost';
}
