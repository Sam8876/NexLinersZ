import React, { useEffect, useRef } from 'react';
import maplibregl from 'maplibre-gl';
import { useFleetStore } from '../store/fleetStore.js';
import { TelemetryPayload } from '../types/index.js';

// GeoJSON definition of Bailadila Open-Cast Mine Haul Roads
const HAUL_ROADS_GEOJSON = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Ramp 1 Crusher Arterial', limit: '20 km/h', color: '#00e5ff' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [81.2634, 18.6521],
          [81.2648, 18.6535],
          [81.2665, 18.6552],
          [81.2680, 18.6570],
          [81.2701, 18.6588],
          [81.2720, 18.6605],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Ramp 2 West Flank', limit: '25 km/h', color: '#22d3ee' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [81.2610, 18.6610],
          [81.2625, 18.6595],
          [81.2638, 18.6575],
          [81.2642, 18.6550],
          [81.2630, 18.6530],
        ],
      },
    },
    {
      type: 'Feature',
      properties: { name: 'Spur 3B Overburden', limit: '20 km/h', color: '#38bdf8' },
      geometry: {
        type: 'LineString',
        coordinates: [
          [81.2670, 18.6480],
          [81.2690, 18.6495],
          [81.2715, 18.6510],
          [81.2740, 18.6528],
          [81.2760, 18.6545],
        ],
      },
    },
  ],
};

// Initial fallback vehicles for instant display before simulator messages connect
const DEFAULT_LOCATIONS: Record<string, TelemetryPayload> = {
  'DUMP-014': {
    vehicleId: 'DUMP-014',
    timestamp: new Date().toISOString(),
    position: { lat: 18.6535, lon: 81.2648, source: 'rtk_fixed' },
    speed_kmph: 22.4,
    heading_deg: 43,
    rtkStatus: 'fixed',
    connectivity: 'lte',
  },
  'DUMP-021': {
    vehicleId: 'DUMP-021',
    timestamp: new Date().toISOString(),
    position: { lat: 18.6552, lon: 81.2665, source: 'rtk_fixed' },
    speed_kmph: 17.8,
    heading_deg: 43,
    rtkStatus: 'fixed',
    connectivity: 'lte',
  },
  'DUMP-007': {
    vehicleId: 'DUMP-007',
    timestamp: new Date().toISOString(),
    position: { lat: 18.6575, lon: 81.2638, source: 'rtk_fixed' },
    speed_kmph: 16.5,
    heading_deg: 148,
    rtkStatus: 'fixed',
    connectivity: 'mesh',
  },
  'DUMP-019': {
    vehicleId: 'DUMP-019',
    timestamp: new Date().toISOString(),
    position: { lat: 18.6510, lon: 81.2715, source: 'rtk_fixed' },
    speed_kmph: 38.5,
    heading_deg: 53,
    rtkStatus: 'fixed',
    connectivity: 'lte',
  },
  'DUMP-031': {
    vehicleId: 'DUMP-031',
    timestamp: new Date().toISOString(),
    position: { lat: 18.6595, lon: 81.2625, source: 'rtk_float' },
    speed_kmph: 14.0,
    heading_deg: 30,
    rtkStatus: 'float',
    connectivity: 'lorawan',
  },
};

export const MapLibreView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, { marker: maplibregl.Marker; chevronEl: HTMLElement; speedEl: HTMLElement }>>(new Map());

  const livePositions = useFleetStore((s) => s.livePositions);
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const setSelectedVehicleId = useFleetStore((s) => s.setSelectedVehicleId);
  const speedLimitKmph = useFleetStore((s) => s.speedLimitKmph);
  const layers = useFleetStore((s) => s.layers);

  // Initialize MapLibre GL map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          osm: {
            type: 'raster',
            tiles: [
              'https://cartodb-basemaps-a.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png',
              'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
            ],
            tileSize: 256,
            attribution: '© OpenStreetMap contributors, CartoDB',
          },
        },
        layers: [
          {
            id: 'dark-tiles',
            type: 'raster',
            source: 'osm',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: [81.2660, 18.6550], // Bailadila Deposit 14 center
      zoom: 14.5,
      pitch: 40,
      bearing: -20,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    map.on('load', () => {
      // Add haul road corridors layer
      map.addSource('haul-roads', {
        type: 'geojson',
        data: HAUL_ROADS_GEOJSON as any,
      });

      // Wide road casing
      map.addLayer({
        id: 'haul-roads-casing',
        type: 'line',
        source: 'haul-roads',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#161f30',
          'line-width': 18,
          'line-opacity': 0.8,
        },
      });

      // Road centerline
      map.addLayer({
        id: 'haul-roads-centerline',
        type: 'line',
        source: 'haul-roads',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': ['get', 'color'],
          'line-width': 2,
          'line-dasharray': [3, 2],
        },
      });
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update haul road layer visibility dynamically
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const visibility = layers.haulRoutes ? 'visible' : 'none';
    if (map.getLayer('haul-roads-casing')) {
      map.setLayoutProperty('haul-roads-casing', 'visibility', visibility);
    }
    if (map.getLayer('haul-roads-centerline')) {
      map.setLayoutProperty('haul-roads-centerline', 'visibility', visibility);
    }
  }, [layers.haulRoutes]);

  // Combine live telemetry stream with default locations for all active dumpers
  const allVehicles: Record<string, TelemetryPayload> = {
    ...DEFAULT_LOCATIONS,
    ...livePositions,
  };

  // Render & rotate vehicle markers directly in real-time
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!layers.vehicles) {
      // Hide all markers if layer is toggled off
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      return;
    }

    Object.values(allVehicles).forEach((tel) => {
      const isSelected = selectedVehicleId === tel.vehicleId;
      const isOverspeeding = tel.speed_kmph > speedLimitKmph;
      const isHalted = tel.speed_kmph < 1.0;
      const isDegraded = tel.rtkStatus !== 'fixed';

      let markerData = markersRef.current.get(tel.vehicleId);

      if (!markerData) {
        // Create custom DOM element for heading-rotating vehicle marker
        const container = document.createElement('div');
        container.className = 'relative flex flex-col items-center cursor-pointer select-none group';
        container.style.width = '48px';
        container.style.height = '48px';

        // Outer pulse circle for hazards
        const pulseRing = document.createElement('div');
        pulseRing.className = isOverspeeding
          ? 'absolute inset-0 rounded-full bg-error/30 animate-ping'
          : 'hidden';
        container.appendChild(pulseRing);

        // Rotating Chevron Wrapper
        const chevronWrapper = document.createElement('div');
        chevronWrapper.className = 'w-9 h-9 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 border border-outline-variant/60';
        chevronWrapper.style.backgroundColor = isOverspeeding
          ? '#93000a'
          : isHalted
          ? '#422c00'
          : isDegraded
          ? '#2e3545'
          : '#00363d';

        // SVG Chevron Arrow pointing North (0 deg)
        chevronWrapper.innerHTML = `
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="12,2 22,21 12,16 2,21" fill="${
              isOverspeeding
                ? '#ffb4ab'
                : isHalted
                ? '#ffd795'
                : isDegraded
                ? '#ffd9e4'
                : '#00e5ff'
            }" />
          </svg>
        `;
        chevronWrapper.style.transform = `rotate(${tel.heading_deg}deg)`;
        container.appendChild(chevronWrapper);

        // Callsign & Speed Badge attached beneath marker
        const badge = document.createElement('div');
        badge.className = 'mt-1 px-1 py-0.5 rounded text-[10px] font-mono-data-sm font-bold shadow-md text-center whitespace-nowrap border border-outline-variant/40';
        badge.style.backgroundColor = '#070e1d';
        badge.style.color = isOverspeeding ? '#ffb4ab' : '#dce2f7';
        badge.innerText = `${tel.vehicleId.slice(-3)} | ${tel.speed_kmph.toFixed(0)}k`;
        container.appendChild(badge);

        // Click handler to select vehicle and open detail drawer
        container.onclick = (e) => {
          e.stopPropagation();
          setSelectedVehicleId(tel.vehicleId);
        };

        const marker = new maplibregl.Marker({
          element: container,
          anchor: 'center',
        })
          .setLngLat([tel.position.lon, tel.position.lat])
          .addTo(map);

        markersRef.current.set(tel.vehicleId, {
          marker,
          chevronEl: chevronWrapper,
          speedEl: badge,
        });
      } else {
        // Direct zero-cache updates: update coordinates and heading angle immediately
        markerData.marker.setLngLat([tel.position.lon, tel.position.lat]);
        markerData.chevronEl.style.transform = `rotate(${tel.heading_deg}deg)`;

        // Update color and text based on live overspeeding / status
        markerData.speedEl.style.color = isOverspeeding ? '#ffb4ab' : '#dce2f7';
        markerData.speedEl.innerText = `${tel.vehicleId.slice(-3)} | ${tel.speed_kmph.toFixed(0)}k`;

        if (isOverspeeding) {
          markerData.chevronEl.style.backgroundColor = '#93000a';
          markerData.chevronEl.style.boxShadow = '0 0 14px rgba(239, 68, 68, 0.7)';
        } else if (isHalted) {
          markerData.chevronEl.style.backgroundColor = '#422c00';
          markerData.chevronEl.style.boxShadow = '0 0 10px rgba(251, 180, 0, 0.4)';
        } else {
          markerData.chevronEl.style.backgroundColor = '#00363d';
          markerData.chevronEl.style.boxShadow = isSelected ? '0 0 14px rgba(0, 229, 255, 0.8)' : 'none';
        }
      }
    });
  }, [allVehicles, selectedVehicleId, speedLimitKmph, layers.vehicles, setSelectedVehicleId]);

  return (
    <div className="relative flex-1 bg-surface-container-lowest rounded overflow-hidden min-h-[580px] lg:min-h-[640px] flex flex-col border border-outline-variant/30">
      {/* Top Left Status HUD Overlay */}
      <div className="absolute top-space-sm left-space-sm z-20 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-2 bg-surface-container-lowest/90 px-space-sm py-1 rounded backdrop-blur border border-outline-variant/30">
          <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
          <span className="font-mono-data-sm text-mono-data-sm text-primary font-bold">
            MAPLIBRE GL GIS DIGITAL TWIN // BAILADILA DEP 14
          </span>
          <span className="text-outline text-label-caps font-label-caps">EPSG:4326 WGS84</span>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-lowest/80 px-space-sm py-0.5 rounded text-secondary font-mono-data-sm text-mono-data-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-[13px]">speed</span>
          <span>
            ACTIVE SPEED CAP: <strong className="text-primary">{speedLimitKmph} km/h</strong> (OSRM ROAD ROUTING ACTIVE)
          </span>
        </div>
      </div>

      {/* Map Container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 relative" />

      {/* Bottom Map Status Ticker */}
      <div className="w-full bg-surface-container-low px-space-md py-1 flex items-center justify-between text-mono-data-sm font-mono-data-sm text-on-surface-variant border-t border-outline-variant/30 z-10">
        <div className="flex items-center gap-space-md">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">satellite_alt</span>
            <span>DIRECT MQTT STREAM [AWS IOT WSS // ZERO CACHE]</span>
          </span>
          <span className="hidden sm:inline-block text-outline-variant">|</span>
          <span className="hidden sm:flex items-center gap-1 text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
            <span>5 VEHICLES TRACKED IN REAL-TIME</span>
          </span>
        </div>
        <div className="flex items-center gap-space-sm font-label-caps text-label-caps">
          <span className="text-outline">TERRAIN:</span>
          <span className="text-primary font-bold">BAILADILA IRON ORE PIT 14</span>
        </div>
      </div>
    </div>
  );
};
