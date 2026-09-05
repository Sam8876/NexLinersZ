import { TelemetryPayload } from '../types/index.js';
export interface RouteDistanceResult {
    distanceMeters: number;
    source: 'osrm_service' | 'mine_road_graph' | 'haversine_fallback';
    durationSeconds?: number;
}
export declare const MINE_HAUL_NETWORK: Array<{
    id: string;
    waypoints: Array<{
        lat: number;
        lon: number;
    }>;
}>;
/**
 * Computes road distance between two vehicles using Open Source Routing Machine (OSRM).
 * Falls back to Mine Haul Road Network Graph or Haversine if service is offline or road is private.
 */
export declare function calculateRoadDistanceBetweenVehicles(v1: TelemetryPayload, v2: TelemetryPayload): Promise<RouteDistanceResult>;
