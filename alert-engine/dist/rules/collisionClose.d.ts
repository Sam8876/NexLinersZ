import { AlertEvent, AlertRule } from './types.js';
import { VehicleState, TelemetryPayload } from '../types/index.js';
/**
 * Haversine great-circle distance algorithm for high-precision inter-vehicle proximity.
 * Computes spherical surface distance in meters between two (lat, lon) WGS84 coordinates.
 */
export declare function calculateHaversineDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number;
export declare const calculateDistanceMeters: typeof calculateHaversineDistanceMeters;
/**
 * Synchronous collision close rule using Haversine algorithm
 */
export declare const checkCollisionClose: AlertRule;
/**
 * Advanced collision close rule using Open Source Routing Machine (OSRM)
 * road-network distance calculation to prevent false alarms between adjacent pit benches.
 */
export declare function checkCollisionCloseAsync(fleet: Map<string, VehicleState>, telemetry: TelemetryPayload): Promise<AlertEvent[]>;
