"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MINE_HAUL_NETWORK = void 0;
exports.calculateRoadDistanceBetweenVehicles = calculateRoadDistanceBetweenVehicles;
const collisionClose_js_1 = require("./collisionClose.js");
// Digitzed Bailadila Deposit 14 Haul Road Network Polylines
exports.MINE_HAUL_NETWORK = [
    {
        id: 'RAMP-01-CRUSHER',
        waypoints: [
            { lat: 18.6521, lon: 81.2634 },
            { lat: 18.6535, lon: 81.2648 },
            { lat: 18.6552, lon: 81.2665 },
            { lat: 18.6570, lon: 81.2680 },
            { lat: 18.6588, lon: 81.2701 },
            { lat: 18.6605, lon: 81.2720 },
        ],
    },
    {
        id: 'RAMP-02-WEST',
        waypoints: [
            { lat: 18.6610, lon: 81.2610 },
            { lat: 18.6595, lon: 81.2625 },
            { lat: 18.6575, lon: 81.2638 },
            { lat: 18.6550, lon: 81.2642 },
            { lat: 18.6530, lon: 81.2630 },
        ],
    },
    {
        id: 'SPUR-3B-OVERBURDEN',
        waypoints: [
            { lat: 18.6480, lon: 81.2670 },
            { lat: 18.6495, lon: 81.2690 },
            { lat: 18.6510, lon: 81.2715 },
            { lat: 18.6528, lon: 81.2740 },
            { lat: 18.6545, lon: 81.2760 },
        ],
    },
];
/**
 * Projects a point onto a polyline segment and calculates chain distance along the haul road.
 */
function calculateGraphDistance(lat1, lon1, lat2, lon2) {
    // Check if both points project onto the same haul road corridor
    for (const road of exports.MINE_HAUL_NETWORK) {
        let minDist1 = Infinity;
        let minDist2 = Infinity;
        let idx1 = -1;
        let idx2 = -1;
        for (let i = 0; i < road.waypoints.length; i++) {
            const wp = road.waypoints[i];
            const d1 = (0, collisionClose_js_1.calculateHaversineDistanceMeters)(lat1, lon1, wp.lat, wp.lon);
            const d2 = (0, collisionClose_js_1.calculateHaversineDistanceMeters)(lat2, lon2, wp.lat, wp.lon);
            if (d1 < minDist1) {
                minDist1 = d1;
                idx1 = i;
            }
            if (d2 < minDist2) {
                minDist2 = d2;
                idx2 = i;
            }
        }
        // If both vehicles are within 100m of this road corridor
        if (minDist1 < 100 && minDist2 < 100 && idx1 !== -1 && idx2 !== -1) {
            const startIdx = Math.min(idx1, idx2);
            const endIdx = Math.max(idx1, idx2);
            if (startIdx === endIdx) {
                return (0, collisionClose_js_1.calculateHaversineDistanceMeters)(lat1, lon1, lat2, lon2);
            }
            let roadDistance = 0;
            for (let j = startIdx; j < endIdx; j++) {
                roadDistance += (0, collisionClose_js_1.calculateHaversineDistanceMeters)(road.waypoints[j].lat, road.waypoints[j].lon, road.waypoints[j + 1].lat, road.waypoints[j + 1].lon);
            }
            return roadDistance;
        }
    }
    return null;
}
/**
 * Computes road distance between two vehicles using Open Source Routing Machine (OSRM).
 * Falls back to Mine Haul Road Network Graph or Haversine if service is offline or road is private.
 */
async function calculateRoadDistanceBetweenVehicles(v1, v2) {
    // 1. Check Mine Haul Road Network Graph first (dedicated private pit haul roads)
    const graphDist = calculateGraphDistance(v1.position.lat, v1.position.lon, v2.position.lat, v2.position.lon);
    if (graphDist !== null) {
        return {
            distanceMeters: Math.round(graphDist * 10) / 10,
            source: 'mine_road_graph',
        };
    }
    // 2. Query OSRM routing service if custom host or public endpoint available
    const osrmBaseUrl = process.env.OSRM_BASE_URL;
    if (osrmBaseUrl) {
        const coords = `${v1.position.lon},${v1.position.lat};${v2.position.lon},${v2.position.lat}`;
        const url = `${osrmBaseUrl}/route/v1/driving/${coords}?overview=false`;
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 1200);
            const response = await fetch(url, { signal: controller.signal });
            clearTimeout(timeout);
            if (response.ok) {
                const data = (await response.json());
                if (data && data.routes && data.routes.length > 0 && typeof data.routes[0].distance === 'number') {
                    return {
                        distanceMeters: Math.round(data.routes[0].distance * 10) / 10,
                        source: 'osrm_service',
                        durationSeconds: data.routes[0].duration,
                    };
                }
            }
        }
        catch (_err) {
            // OSRM unreachable
        }
    }
    // 3. Fallback: Haversine distance
    const haversineDist = (0, collisionClose_js_1.calculateHaversineDistanceMeters)(v1.position.lat, v1.position.lon, v2.position.lat, v2.position.lon);
    return {
        distanceMeters: Math.round(haversineDist * 10) / 10,
        source: 'haversine_fallback',
    };
}
