"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateHeading = calculateHeading;
exports.advanceVehicle = advanceVehicle;
const routes_js_1 = require("./routes.js");
// Calculate heading angle in degrees (0 = North, 90 = East, 180 = South, 270 = West)
function calculateHeading(lat1, lon1, lat2, lon2) {
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const y = Math.sin(dLon) * Math.cos((lat2 * Math.PI) / 180);
    const x = Math.cos((lat1 * Math.PI) / 180) * Math.sin((lat2 * Math.PI) / 180) -
        Math.sin((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.cos(dLon);
    const bearing = (Math.atan2(y, x) * 180) / Math.PI;
    return (bearing + 360) % 360;
}
function advanceVehicle(vehicle, intervalSeconds = 1) {
    const route = routes_js_1.SIMULATED_ROUTES[vehicle.routeId];
    if (!route || route.length < 2) {
        throw new Error(`Route ${vehicle.routeId} invalid`);
    }
    const currentWp = route[vehicle.currentWaypointIdx];
    const nextWpIdx = (vehicle.currentWaypointIdx + 1) % route.length;
    const nextWp = route[nextWpIdx];
    // Advance along segment based on speed
    // Approx 1 km/h = 0.2778 m/s, Bailadila latitude 1 deg ~ 111,000m
    const speedMps = (vehicle.targetSpeedKmph * 1000) / 3600;
    const stepFraction = (speedMps * intervalSeconds) / 250; // Approx 250m per segment
    vehicle.progressAlongSegment += stepFraction;
    if (vehicle.progressAlongSegment >= 1.0) {
        vehicle.progressAlongSegment = 0;
        vehicle.currentWaypointIdx = nextWpIdx;
    }
    const p = vehicle.progressAlongSegment;
    const lat = currentWp.lat + (nextWp.lat - currentWp.lat) * p;
    const lon = currentWp.lon + (nextWp.lon - currentWp.lon) * p;
    const heading = Math.round(calculateHeading(currentWp.lat, currentWp.lon, nextWp.lat, nextWp.lon));
    // Small speed jitter (+/- 0.5 km/h) for realism
    const jitter = (Math.random() - 0.5) * 0.8;
    const actualSpeed = Math.max(0, Math.round((vehicle.targetSpeedKmph + jitter) * 10) / 10);
    const positionSource = vehicle.rtkStatus === 'fixed'
        ? 'rtk_fixed'
        : vehicle.rtkStatus === 'float'
            ? 'rtk_float'
            : 'gps';
    return {
        vehicleId: vehicle.vehicleId,
        timestamp: new Date().toISOString(),
        position: {
            lat: Math.round(lat * 1000000) / 1000000,
            lon: Math.round(lon * 1000000) / 1000000,
            source: positionSource,
        },
        speed_kmph: actualSpeed,
        heading_deg: heading,
        rtkStatus: vehicle.rtkStatus,
        connectivity: vehicle.connectivity,
    };
}
