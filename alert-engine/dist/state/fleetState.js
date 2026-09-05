"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fleetState = exports.FleetStateStore = void 0;
class FleetStateStore {
    vehicles = new Map();
    updateVehicle(telemetry) {
        const existing = this.vehicles.get(telemetry.vehicleId);
        const now = Date.now();
        const isHalted = telemetry.speed_kmph < 1.0;
        let haltStartTime = existing?.haltStartTime ?? null;
        if (isHalted) {
            if (!haltStartTime) {
                haltStartTime = now;
            }
        }
        else {
            haltStartTime = null;
        }
        const updatedState = {
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
    getVehicle(vehicleId) {
        return this.vehicles.get(vehicleId);
    }
    getAllVehicles() {
        return Array.from(this.vehicles.values());
    }
    getActiveAlert(vehicleId, type) {
        const state = this.vehicles.get(vehicleId);
        return state?.activeAlerts?.get(type);
    }
    setActiveAlert(vehicleId, type, alertInfo) {
        const state = this.vehicles.get(vehicleId);
        if (state) {
            if (!state.activeAlerts) {
                state.activeAlerts = new Map();
            }
            state.activeAlerts.set(type, alertInfo);
        }
    }
    clearActiveAlert(vehicleId, type) {
        const state = this.vehicles.get(vehicleId);
        if (state?.activeAlerts) {
            const existing = state.activeAlerts.get(type);
            state.activeAlerts.delete(type);
            return existing;
        }
        return undefined;
    }
    removeVehicle(vehicleId) {
        return this.vehicles.delete(vehicleId);
    }
    clear() {
        this.vehicles.clear();
    }
}
exports.FleetStateStore = FleetStateStore;
exports.fleetState = new FleetStateStore();
