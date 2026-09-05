import { AlertEvent, AlertRule } from './types.js';
import { calculateRoadDistanceBetweenVehicles } from './osrmRouting.js';
import { VehicleState, TelemetryPayload } from '../types/index.js';

/**
 * Haversine great-circle distance algorithm for high-precision inter-vehicle proximity.
 * Computes spherical surface distance in meters between two (lat, lon) WGS84 coordinates.
 */
export function calculateHaversineDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  if (lat1 === lat2 && lon1 === lon2) {
    return 0;
  }

  const R = 6371000; // Mean radius of the Earth in meters
  const toRad = Math.PI / 180;
  const dLat = (lat2 - lat1) * toRad;
  const dLon = (lon2 - lon1) * toRad;

  const lat1Rad = lat1 * toRad;
  const lat2Rad = lat2 * toRad;

  const sinHalfDlat = Math.sin(dLat / 2);
  const sinHalfDlon = Math.sin(dLon / 2);

  const a =
    sinHalfDlat * sinHalfDlat +
    Math.cos(lat1Rad) * Math.cos(lat2Rad) * sinHalfDlon * sinHalfDlon;

  const clampedA = Math.min(Math.max(a, 0), 1);
  const c = 2 * Math.atan2(Math.sqrt(clampedA), Math.sqrt(1 - clampedA));

  return R * c;
}

export const calculateDistanceMeters = calculateHaversineDistanceMeters;

/**
 * Synchronous collision close rule using Haversine algorithm
 */
export const checkCollisionClose: AlertRule = (fleet, telemetry) => {
  const alerts: AlertEvent[] = [];
  const SAFE_FOLLOWING_THRESHOLD_M = 50.0;

  for (const [otherId, otherState] of fleet.entries()) {
    if (otherId === telemetry.vehicleId) continue;

    const otherTel = otherState.lastTelemetry;
    const distanceM = calculateHaversineDistanceMeters(
      telemetry.position.lat,
      telemetry.position.lon,
      otherTel.position.lat,
      otherTel.position.lon
    );

    if (distanceM < SAFE_FOLLOWING_THRESHOLD_M) {
      alerts.push({
        vehicleId: telemetry.vehicleId,
        type: 'collision_close',
        severity: distanceM < 25 ? 'critical' : 'high',
        details: {
          otherVehicleId: otherId,
          distance_m: Math.round(distanceM * 10) / 10,
          currentSpeed: telemetry.speed_kmph,
          otherSpeed: otherTel.speed_kmph,
          threshold_m: SAFE_FOLLOWING_THRESHOLD_M,
          algorithm: 'haversine',
        },
        raisedAt: telemetry.timestamp || new Date().toISOString(),
      });
    }
  }

  return alerts;
};

/**
 * Advanced collision close rule using Open Source Routing Machine (OSRM)
 * road-network distance calculation to prevent false alarms between adjacent pit benches.
 */
export async function checkCollisionCloseAsync(
  fleet: Map<string, VehicleState>,
  telemetry: TelemetryPayload
): Promise<AlertEvent[]> {
  const alerts: AlertEvent[] = [];
  const SAFE_ROAD_CLEARANCE_THRESHOLD_M = 60.0; // Distance along haul road

  for (const [otherId, otherState] of fleet.entries()) {
    if (otherId === telemetry.vehicleId) continue;

    const otherTel = otherState.lastTelemetry;

    // Fast bounding box pre-filter using Haversine
    const straightLineM = calculateHaversineDistanceMeters(
      telemetry.position.lat,
      telemetry.position.lon,
      otherTel.position.lat,
      otherTel.position.lon
    );

    // If straight-line distance is > 200m, road distance cannot be < 60m
    if (straightLineM > 200) {
      continue;
    }

    // Query OSRM / Mine Road Graph for true driving distance
    const roadResult = await calculateRoadDistanceBetweenVehicles(telemetry, otherTel);

    if (roadResult.distanceMeters < SAFE_ROAD_CLEARANCE_THRESHOLD_M) {
      alerts.push({
        vehicleId: telemetry.vehicleId,
        type: 'collision_close',
        severity: roadResult.distanceMeters < 30 ? 'critical' : 'high',
        details: {
          otherVehicleId: otherId,
          distance_m: roadResult.distanceMeters,
          straight_line_m: Math.round(straightLineM * 10) / 10,
          routing_source: roadResult.source,
          duration_seconds: roadResult.durationSeconds,
          currentSpeed: telemetry.speed_kmph,
          otherSpeed: otherTel.speed_kmph,
          threshold_m: SAFE_ROAD_CLEARANCE_THRESHOLD_M,
          algorithm: 'osrm_road_routing',
        },
        raisedAt: telemetry.timestamp || new Date().toISOString(),
      });
    }
  }

  return alerts;
}
