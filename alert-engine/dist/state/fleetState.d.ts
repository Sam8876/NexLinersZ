import { TelemetryPayload, VehicleState, AlertType, ActiveAlertInfo } from '../types/index.js';
export declare class FleetStateStore {
    private vehicles;
    updateVehicle(telemetry: TelemetryPayload): VehicleState;
    getVehicle(vehicleId: string): VehicleState | undefined;
    getAllVehicles(): VehicleState[];
    getActiveAlert(vehicleId: string, type: AlertType): ActiveAlertInfo | undefined;
    setActiveAlert(vehicleId: string, type: AlertType, alertInfo: ActiveAlertInfo): void;
    clearActiveAlert(vehicleId: string, type: AlertType): ActiveAlertInfo | undefined;
    removeVehicle(vehicleId: string): boolean;
    clear(): void;
}
export declare const fleetState: FleetStateStore;
