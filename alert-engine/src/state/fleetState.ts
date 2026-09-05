import { TelemetryPayload, VehicleState, AlertType, ActiveAlertInfo } from '../types/index.js';

export class FleetStateStore {
  private vehicles: Map<string, VehicleState> = new Map();

  public updateVehicle(telemetry: TelemetryPayload): VehicleState {
    const existing = this.vehicles.get(telemetry.vehicleId);
    const now = Date.now();

    const isHalted = telemetry.speed_kmph < 1.0;
    let haltStartTime = existing?.haltStartTime ?? null;
    if (isHalted) {
      if (!haltStartTime) {
        haltStartTime = now;
      }
    } else {
      haltStartTime = null;
    }

    const updatedState: VehicleState = {
      vehicleId: telemetry.vehicleId,
      lastTelemetry: telemetry,
      lastReceivedAt: now,
      assignedRouteId: existing?.assignedRouteId ?? 'ROUTE-01',
      speedLimitKmph: existing?.speedLimitKmph ?? 20.0,
      haltStartTime,
      activeAlerts: existing?.activeAlerts ?? new Map(),
    };

    this.vehicles.set(telemetry.vehicleId, updatedState);
    return updatedState;
  }

  public getVehicle(vehicleId: string): VehicleState | undefined {
    return this.vehicles.get(vehicleId);
  }

  public getAllVehicles(): VehicleState[] {
    return Array.from(this.vehicles.values());
  }

  public getActiveAlert(vehicleId: string, type: AlertType): ActiveAlertInfo | undefined {
    const state = this.vehicles.get(vehicleId);
    return state?.activeAlerts?.get(type);
  }

  public setActiveAlert(vehicleId: string, type: AlertType, alertInfo: ActiveAlertInfo): void {
    const state = this.vehicles.get(vehicleId);
    if (state) {
      if (!state.activeAlerts) {
        state.activeAlerts = new Map();
      }
      state.activeAlerts.set(type, alertInfo);
    }
  }

  public clearActiveAlert(vehicleId: string, type: AlertType): ActiveAlertInfo | undefined {
    const state = this.vehicles.get(vehicleId);
    if (state?.activeAlerts) {
      const existing = state.activeAlerts.get(type);
      state.activeAlerts.delete(type);
      return existing;
    }
    return undefined;
  }

  public removeVehicle(vehicleId: string): boolean {
    return this.vehicles.delete(vehicleId);
  }

  public clear(): void {
    this.vehicles.clear();
  }
}

export const fleetState = new FleetStateStore();
