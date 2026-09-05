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

export interface SimulatedVehicle {
  vehicleId: string;
  model: string;
  routeId: string;
  targetSpeedKmph: number;
  rtkStatus: RTKStatus;
  connectivity: ConnectivityMode;
  currentWaypointIdx: number;
  progressAlongSegment: number; // 0.0 to 1.0
}
