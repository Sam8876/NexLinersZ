"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SIMULATED_VEHICLES = void 0;
exports.SIMULATED_VEHICLES = [
    {
        vehicleId: 'DUMP-014',
        model: 'Komatsu 930E-5',
        routeId: 'ROUTE-RAMP-01',
        targetSpeedKmph: 22.4,
        rtkStatus: 'fixed',
        connectivity: 'lte',
        currentWaypointIdx: 0,
        progressAlongSegment: 0.1,
    },
    {
        vehicleId: 'DUMP-021',
        model: 'CAT 797F',
        routeId: 'ROUTE-RAMP-01',
        targetSpeedKmph: 18.0,
        rtkStatus: 'fixed',
        connectivity: 'lte',
        currentWaypointIdx: 0,
        progressAlongSegment: 0.35, // Ahead of D-014 for proximity/convergence testing
    },
    {
        vehicleId: 'DUMP-007',
        model: 'CAT 797F',
        routeId: 'ROUTE-RAMP-02',
        targetSpeedKmph: 16.5,
        rtkStatus: 'fixed',
        connectivity: 'mesh',
        currentWaypointIdx: 1,
        progressAlongSegment: 0.5,
    },
    {
        vehicleId: 'DUMP-019',
        model: 'CAT 797F',
        routeId: 'ROUTE-SPUR-3B',
        targetSpeedKmph: 38.5, // Overspeeding test scenario (> 20 km/h)
        rtkStatus: 'fixed',
        connectivity: 'lte',
        currentWaypointIdx: 2,
        progressAlongSegment: 0.2,
    },
    {
        vehicleId: 'DUMP-031',
        model: 'Komatsu 830E',
        routeId: 'ROUTE-RAMP-02',
        targetSpeedKmph: 14.0,
        rtkStatus: 'float',
        connectivity: 'lorawan',
        currentWaypointIdx: 4,
        progressAlongSegment: 0.7,
    },
];
