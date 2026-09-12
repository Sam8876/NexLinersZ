import React, { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import { useFleetStore } from '../store/fleetStore.js';
import { TelemetryPayload } from '../types/index.js';

// Sectors Configuration with realistic Bailadila & Kirandul mining coordinates
export interface SectorConfig {
  id: string;
  name: string;
  center: [number, number]; // [lon, lat]
  zoom: number;
  pitch: number;
  bearing: number;
  roads: {
    type: 'FeatureCollection';
    features: Array<{
      type: 'Feature';
      properties: { name: string; limit: string; color: string };
      geometry: { type: 'LineString'; coordinates: number[][] };
    }>;
  };
}

export const SECTOR_CONFIGS: Record<string, SectorConfig> = {
  'NMDC Bailadila - Dep 14 (Kirandul)': {
    id: 'dep-14',
    name: 'NMDC Bailadila - Dep 14 (Kirandul)',
    // Exact Deposit 14 mining pit coordinates (south of Kirandul on the Bailadila iron ridge)
    center: [81.2585, 18.6320],
    zoom: 15.0,
    pitch: 50,
    bearing: -25,
    roads: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Deposit 14 Main Pit Haul Ramp', limit: '20 km/h', color: '#0284c7' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [81.2540, 18.6275],
              [81.2562, 18.6295],
              [81.2585, 18.6320],
              [81.2608, 18.6345],
              [81.2630, 18.6370],
              [81.2615, 18.6395],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { name: 'Crusher Inbound Switchback', limit: '25 km/h', color: '#0d9488' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [81.2530, 18.6360],
              [81.2550, 18.6345],
              [81.2575, 18.6330],
              [81.2600, 18.6315],
              [81.2618, 18.6290],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { name: 'Waste Dump Spur 3', limit: '20 km/h', color: '#ea580c' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [81.2590, 18.6250],
              [81.2612, 18.6270],
              [81.2635, 18.6295],
              [81.2650, 18.6320],
            ],
          },
        },
      ],
    },
  },
  'NMDC Bailadila - Dep 11 (Bacheli)': {
    id: 'dep-11',
    name: 'NMDC Bailadila - Dep 11 (Bacheli)',
    // Exact Deposit 11 / Bacheli mining complex coordinates
    center: [81.2310, 18.6820],
    zoom: 15.0,
    pitch: 50,
    bearing: -15,
    roads: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Dep 11A North Ridge Haulage', limit: '20 km/h', color: '#0284c7' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [81.2260, 18.6770],
              [81.2285, 18.6795],
              [81.2310, 18.6820],
              [81.2335, 18.6845],
              [81.2360, 18.6870],
            ],
          },
        },
        {
          type: 'Feature',
          properties: { name: 'Bacheli Secondary Processing Link', limit: '25 km/h', color: '#0d9488' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [81.2280, 18.6860],
              [81.2305, 18.6840],
              [81.2330, 18.6815],
              [81.2355, 18.6790],
            ],
          },
        },
      ],
    },
  },
  'Pilbara Zone 4 - Sector North Pit': {
    id: 'pilbara-4',
    name: 'Pilbara Zone 4 - Sector North Pit',
    center: [119.5540, -22.3120],
    zoom: 14.5,
    pitch: 45,
    bearing: -30,
    roads: {
      type: 'FeatureCollection',
      features: [
        {
          type: 'Feature',
          properties: { name: 'Pilbara North Arterial', limit: '30 km/h', color: '#0284c7' },
          geometry: {
            type: 'LineString',
            coordinates: [
              [119.5480, -22.3180],
              [119.5510, -22.3150],
              [119.5540, -22.3120],
              [119.5570, -22.3090],
              [119.5600, -22.3060],
            ],
          },
        },
      ],
    },
  },
};

// Initial fallback vehicles matching Deposit 14 haul road coordinates
const DEFAULT_LOCATIONS: Record<string, TelemetryPayload> = {
  'DUMP-014': {
    vehicleId: 'DUMP-014',
    timestamp: new Date().toISOString(),
    position: { lat: 18.6295, lon: 81.2562, source: 'rtk_fixed' },
    speed_kmph: 22.4,
    heading_deg: 45,
    rtkStatus: 'fixed',
    connectivity: 'lte',
  },
  'DUMP-021': {
    vehicleId: 'DUMP-021',
    timestamp: new Date().toISOString(),
    position: { lat: 18.6320, lon: 81.2585, source: 'rtk_fixed' },
    speed_kmph: 17.8,
    heading_deg: 45,
    rtkStatus: 'fixed',
    connectivity: 'lte',
  },
  'DUMP-007': {
    vehicleId: 'DUMP-007',
    timestamp: new Date().toISOString(),
    position: { lat: 18.6345, lon: 81.2550, source: 'rtk_fixed' },
    speed_kmph: 16.5,
    heading_deg: 135,
    rtkStatus: 'fixed',
    connectivity: 'mesh',
  },
  'DUMP-019': {
    vehicleId: 'DUMP-019',
    timestamp: new Date().toISOString(),
    position: { lat: 18.6270, lon: 81.2612, source: 'rtk_fixed' },
    speed_kmph: 38.5,
    heading_deg: 40,
    rtkStatus: 'fixed',
    connectivity: 'lte',
  },
  'DUMP-031': {
    vehicleId: 'DUMP-031',
    timestamp: new Date().toISOString(),
    position: { lat: 18.6370, lon: 81.2630, source: 'rtk_float' },
    speed_kmph: 14.0,
    heading_deg: 320,
    rtkStatus: 'float',
    connectivity: 'lorawan',
  },
};

interface MarkerEntry {
  marker: maplibregl.Marker;
  containerEl: HTMLElement;
  wrapperEl: HTMLElement;
  badgeEl: HTMLElement;
  pulseEl: HTMLElement;
}

export const MapLibreView: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, MarkerEntry>>(new Map());

  const livePositions = useFleetStore((s) => s.livePositions);
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const setSelectedVehicleId = useFleetStore((s) => s.setSelectedVehicleId);
  const speedLimitKmph = useFleetStore((s) => s.speedLimitKmph);
  const layers = useFleetStore((s) => s.layers);
  const basemapStyle = useFleetStore((s) => s.basemapStyle);
  const selectedSector = useFleetStore((s) => s.selectedSector);

  const [currentPitch, setCurrentPitch] = useState<number>(50);
  const [currentBearing, setCurrentBearing] = useState<number>(-25);

  const activeSector = useMemo(() => {
    return SECTOR_CONFIGS[selectedSector] || SECTOR_CONFIGS['NMDC Bailadila - Dep 14 (Kirandul)'];
  }, [selectedSector]);

  // Return clean tile URL without interleaving
  const getBasemapTileUrl = (style: 'normal' | 'dark'): string => {
    const cartoKey = import.meta.env.VITE_CARTO_API_KEY;
    const sub = ['a', 'b', 'c'][Math.floor(Math.random() * 3)];

    if (style === 'normal') {
      return cartoKey
        ? `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${cartoKey}`
        : `https://${sub}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png`;
    }

    return cartoKey
      ? `https://${sub}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${cartoKey}`
      : `https://${sub}.basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png`;
  };

  // High-fidelity 2D and 3D Isometric SVG haul truck renderers
  const renderTruckSvg = (is3D: boolean, isOverspeeding: boolean, isHalted: boolean, isDegraded: boolean): string => {
    const bodyColor = isOverspeeding ? '#dc2626' : isHalted ? '#d97706' : isDegraded ? '#9333ea' : '#0284c7';
    const bedSideColor = isOverspeeding ? '#991b1b' : isHalted ? '#92400e' : isDegraded ? '#6b21a8' : '#0369a1';
    const bedCavityColor = isOverspeeding ? '#f87171' : isHalted ? '#fbbf24' : isDegraded ? '#c084fc' : '#38bdf8';
    const cabColor = '#f1f5f9';
    const tireColor = '#18181b';

    if (!is3D) {
      // 2D Plan View: Top-down dump truck with distinct cab, payload bay, and forward headlights
      return `
        <svg width="42" height="42" viewBox="0 0 42 42" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.6));">
          <!-- Outer chassis / tires -->
          <rect x="5" y="7" width="5" height="10" rx="2" fill="${tireColor}" stroke="#52525b" stroke-width="0.8"/>
          <rect x="32" y="7" width="5" height="10" rx="2" fill="${tireColor}" stroke="#52525b" stroke-width="0.8"/>
          <rect x="4" y="24" width="6" height="13" rx="2" fill="${tireColor}" stroke="#52525b" stroke-width="0.8"/>
          <rect x="32" y="24" width="6" height="13" rx="2" fill="${tireColor}" stroke="#52525b" stroke-width="0.8"/>
          <!-- Dump Bed -->
          <rect x="9" y="14" width="24" height="23" rx="2.5" fill="${bodyColor}" stroke="#ffffff" stroke-width="1.2"/>
          <!-- Interior ribbing -->
          <line x1="15" y1="16" x2="15" y2="34" stroke="${bedSideColor}" stroke-width="1.4"/>
          <line x1="21" y1="16" x2="21" y2="34" stroke="${bedSideColor}" stroke-width="1.4"/>
          <line x1="27" y1="16" x2="27" y2="34" stroke="${bedSideColor}" stroke-width="1.4"/>
          <!-- Front Operator Cab -->
          <rect x="13" y="4" width="16" height="9" rx="2" fill="${cabColor}" stroke="#334155" stroke-width="1.2"/>
          <!-- Windshield pointing forward (North) -->
          <polygon points="15,6 27,6 25,10 17,10" fill="#0284c7"/>
          <!-- Headlights -->
          <circle cx="15" cy="4.5" r="1.2" fill="#fef08a"/>
          <circle cx="27" cy="4.5" r="1.2" fill="#fef08a"/>
        </svg>
      `;
    }

    // 3D Isometric View: Rich 3D heavy mining dump truck with perspective canopy, dump body, and tires
    return `
      <svg width="58" height="58" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" style="filter: drop-shadow(0 6px 12px rgba(0,0,0,0.7));">
        <!-- Ground Shadow -->
        <ellipse cx="32" cy="52" rx="22" ry="8" fill="#000000" fill-opacity="0.4"/>

        <!-- Heavy Mining Tires (Front & Rear Duals) -->
        <rect x="7" y="32" width="8" height="18" rx="3.5" fill="${tireColor}" stroke="#52525b" stroke-width="1"/>
        <rect x="49" y="32" width="8" height="18" rx="3.5" fill="${tireColor}" stroke="#52525b" stroke-width="1"/>
        <rect x="11" y="14" width="6" height="13" rx="2.5" fill="${tireColor}" stroke="#52525b" stroke-width="1"/>
        <rect x="47" y="14" width="6" height="13" rx="2.5" fill="${tireColor}" stroke="#52525b" stroke-width="1"/>

        <!-- 3D Rock Dump Bed - Left side wall -->
        <polygon points="16,22 32,32 32,46 16,36" fill="${bedSideColor}"/>
        <!-- 3D Rock Dump Bed - Right side wall -->
        <polygon points="48,22 32,32 32,46 48,36" fill="${bodyColor}"/>
        <!-- 3D Rock Dump Bed - Top cavity/lip -->
        <polygon points="32,14 48,22 32,32 16,22" fill="${bedCavityColor}" stroke="#ffffff" stroke-width="1"/>

        <!-- Dump Bed Structural Ribs -->
        <line x1="21" y1="25" x2="21" y2="39" stroke="#0f172a" stroke-width="1.2" opacity="0.6"/>
        <line x1="27" y1="29" x2="27" y2="43" stroke="#0f172a" stroke-width="1.2" opacity="0.6"/>
        <line x1="37" y1="29" x2="37" y2="43" stroke="#ffffff" stroke-width="1.2" opacity="0.5"/>
        <line x1="43" y1="25" x2="43" y2="39" stroke="#ffffff" stroke-width="1.2" opacity="0.5"/>

        <!-- Cab Canopy Overhead (Front) -->
        <polygon points="32,6 42,10 32,15 22,10" fill="#f8fafc" stroke="#64748b" stroke-width="1"/>
        <!-- Operator Windshield Glass -->
        <polygon points="22,10 32,15 32,20 22,16" fill="#38bdf8" stroke="#0284c7" stroke-width="0.8"/>
        <polygon points="42,10 32,15 32,20 42,16" fill="#0284c7" stroke="#0369a1" stroke-width="0.8"/>

        <!-- Grille & Radiator -->
        <polygon points="32,19 37,21 32,24 27,21" fill="#f59e0b"/>
      </svg>
    `;
  };

  // 1. Initialize MapLibre GL instance
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const tileUrl = getBasemapTileUrl(basemapStyle);

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: {
        version: 8,
        sources: {
          basemap: {
            type: 'raster',
            tiles: [tileUrl],
            tileSize: 256,
            attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors, © <a href="https://carto.com/attributions" target="_blank">CARTO</a>',
          },
        },
        layers: [
          {
            id: 'basemap-tiles',
            type: 'raster',
            source: 'basemap',
            minzoom: 0,
            maxzoom: 19,
          },
        ],
      },
      center: activeSector.center,
      zoom: activeSector.zoom,
      pitch: activeSector.pitch,
      bearing: activeSector.bearing,
    });

    map.addControl(new maplibregl.NavigationControl({ visualizePitch: true }), 'top-right');

    const updatePitchBearing = () => {
      setCurrentPitch(map.getPitch());
      setCurrentBearing(map.getBearing());
    };

    map.on('pitch', updatePitchBearing);
    map.on('rotate', updatePitchBearing);

    map.on('load', () => {
      // Add haul road corridors layer
      map.addSource('haul-roads', {
        type: 'geojson',
        data: activeSector.roads as any,
      });

      // Wide road casing
      map.addLayer({
        id: 'haul-roads-casing',
        type: 'line',
        source: 'haul-roads',
        layout: { 'line-cap': 'round', 'line-join': 'round' },
        paint: {
          'line-color': '#0f172a',
          'line-width': 16,
          'line-opacity': 0.75,
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
          'line-width': 3,
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

  // 2. React to Sector Dropdown Changes: fly camera to new coordinates & update haul roads
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    map.flyTo({
      center: activeSector.center,
      zoom: activeSector.zoom,
      pitch: activeSector.pitch,
      bearing: activeSector.bearing,
      essential: true,
      duration: 1500,
    });

    if (map.isStyleLoaded()) {
      const roadSource = map.getSource('haul-roads') as maplibregl.GeoJSONSource | undefined;
      if (roadSource) {
        roadSource.setData(activeSector.roads as any);
      }
    }
  }, [activeSector]);

  // 3. Basemap style toggle (Normal / Dark)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    const source = map.getSource('basemap') as maplibregl.RasterTileSource | undefined;
    const tileUrl = getBasemapTileUrl(basemapStyle);

    if (source && (source as any).setTiles) {
      (source as any).setTiles([tileUrl]);
    } else {
      const style = map.getStyle();
      if (style && style.sources && style.sources.basemap) {
        (style.sources.basemap as any).tiles = [tileUrl];
        map.setStyle(style);
      }
    }
  }, [basemapStyle]);

  // 4. Update haul road layer visibility dynamically
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

  // 5. Combine live telemetry stream with fallback locations
  const allVehicles: Record<string, TelemetryPayload> = {
    ...DEFAULT_LOCATIONS,
    ...livePositions,
  };

  // Determine whether current map view triggers 3D representation
  // Pitch > 20° = 3D isometric perspective view; Pitch <= 20° = 2D top-down plan view
  const is3DView = currentPitch > 20;

  // 6. Render & rotate vehicle markers directly in real-time with lightweight 2D/3D CSS transforms
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (!layers.vehicles) {
      markersRef.current.forEach(({ marker }) => marker.remove());
      markersRef.current.clear();
      return;
    }

    Object.values(allVehicles).forEach((tel) => {
      const isSelected = selectedVehicleId === tel.vehicleId;
      const isOverspeeding = tel.speed_kmph > speedLimitKmph;
      const isHalted = tel.speed_kmph < 1.0;
      const isDegraded = tel.rtkStatus !== 'fixed';

      let entry = markersRef.current.get(tel.vehicleId);

      if (!entry) {
        // Create custom DOM element for vehicle marker
        const container = document.createElement('div');
        container.className = 'relative flex flex-col items-center cursor-pointer select-none group';
        container.style.width = is3DView ? '64px' : '48px';
        container.style.height = is3DView ? '64px' : '48px';
        container.style.perspective = '600px';

        // Outer pulse circle for hazards
        const pulseRing = document.createElement('div');
        pulseRing.className = isOverspeeding
          ? 'absolute inset-0 rounded-full bg-red-500/30 animate-ping'
          : 'hidden';
        container.appendChild(pulseRing);

        // Rotating Truck Wrapper
        const truckWrapper = document.createElement('div');
        truckWrapper.className = 'relative flex items-center justify-center transition-all duration-300';
        truckWrapper.innerHTML = renderTruckSvg(is3DView, isOverspeeding, isHalted, isDegraded);
        
        // CSS 3D pitch/bearing compensation: rotate to vehicle heading, then pitch with camera
        truckWrapper.style.transform = is3DView
          ? `rotate(${tel.heading_deg}deg) rotateX(${Math.min(currentPitch, 55)}deg)`
          : `rotate(${tel.heading_deg}deg)`;

        container.appendChild(truckWrapper);

        // Callsign & Speed Badge attached beneath marker
        const badge = document.createElement('div');
        badge.className = 'mt-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold shadow-md text-center whitespace-nowrap border border-slate-700/50';
        badge.style.backgroundColor = '#090d16';
        badge.style.color = isOverspeeding ? '#f87171' : '#38bdf8';
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

        entry = {
          marker,
          containerEl: container,
          wrapperEl: truckWrapper,
          badgeEl: badge,
          pulseEl: pulseRing,
        };
        markersRef.current.set(tel.vehicleId, entry);
      } else {
        // Direct updates: update coordinates and heading angle immediately
        entry.marker.setLngLat([tel.position.lon, tel.position.lat]);

        // Smooth CSS 3D tilt and heading rotation
        entry.wrapperEl.style.transform = is3DView
          ? `rotate(${tel.heading_deg}deg) rotateX(${Math.min(currentPitch, 55)}deg)`
          : `rotate(${tel.heading_deg}deg)`;

        entry.wrapperEl.innerHTML = renderTruckSvg(is3DView, isOverspeeding, isHalted, isDegraded);

        entry.badgeEl.style.color = isOverspeeding ? '#f87171' : isSelected ? '#38bdf8' : '#e2e8f0';
        entry.badgeEl.style.borderColor = isSelected ? '#38bdf8' : 'rgba(51, 65, 85, 0.6)';
        entry.badgeEl.innerText = `${tel.vehicleId.slice(-3)} | ${tel.speed_kmph.toFixed(0)}k`;

        if (isOverspeeding) {
          entry.pulseEl.className = 'absolute inset-0 rounded-full bg-red-500/30 animate-ping';
        } else {
          entry.pulseEl.className = 'hidden';
        }
      }
    });
  }, [allVehicles, selectedVehicleId, speedLimitKmph, layers.vehicles, is3DView, currentPitch, currentBearing, setSelectedVehicleId]);

  // Quick Camera Preset actions
  const setTopDown2DView = () => {
    mapRef.current?.easeTo({ pitch: 0, bearing: 0, duration: 800 });
  };

  const setPerspective3DView = () => {
    mapRef.current?.easeTo({ pitch: 55, bearing: -25, duration: 800 });
  };

  return (
    <div className="relative flex-1 bg-surface-container-lowest rounded overflow-hidden min-h-[580px] lg:min-h-[640px] flex flex-col border border-outline-variant/30">
      {/* Top Left Status HUD Overlay */}
      <div className="absolute top-space-sm left-space-sm z-20 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-2 bg-surface-container-lowest/90 px-space-sm py-1 rounded backdrop-blur border border-outline-variant/30">
          <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
          <span className="font-mono-data-sm text-mono-data-sm text-primary font-bold">
            {activeSector.name.toUpperCase()}
          </span>
          <span className="text-outline text-label-caps font-label-caps">WGS84 EPSG:4326</span>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-lowest/80 px-space-sm py-0.5 rounded text-secondary font-mono-data-sm text-mono-data-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-[13px]">speed</span>
          <span>
            ACTIVE SPEED CAP: <strong className="text-primary">{speedLimitKmph} km/h</strong> (OSRM ROADS ACTIVE)
          </span>
        </div>
      </div>

      {/* Top Right Floating 2D / 3D Perspective Controls */}
      <div className="absolute top-14 right-2.5 z-20 flex flex-col gap-1.5">
        <div className="flex flex-col bg-surface-container-lowest/95 p-1 rounded shadow-lg border border-outline-variant/40 backdrop-blur">
          <button
            onClick={setTopDown2DView}
            className={`px-2 py-1 rounded font-mono text-[11px] font-bold flex items-center gap-1 transition-all ${
              !is3DView
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            title="Top-Down Plan View (Pitch: 0°)"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">view_agenda</span>
            <span>2D VIEW</span>
          </button>
          <button
            onClick={setPerspective3DView}
            className={`px-2 py-1 rounded font-mono text-[11px] font-bold flex items-center gap-1 transition-all ${
              is3DView
                ? 'bg-primary-container text-on-primary-container'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            title="Perspective Isometric View (Pitch: 55°)"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">3d_rotation</span>
            <span>3D VIEW</span>
          </button>
        </div>

        {/* Camera Tilt Angle Indicator */}
        <div className="bg-surface-container-lowest/90 px-2 py-1 rounded text-center border border-outline-variant/30 text-[10px] font-mono text-outline">
          PITCH: <span className="text-primary font-bold">{Math.round(currentPitch)}°</span> (
          <span className={is3DView ? 'text-emerald-400 font-bold' : 'text-sky-400'}>
            {is3DView ? '3D TRUCK' : '2D CAB'}
          </span>
          )
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
            <span>5 VEHICLES TRACKED (2D/3D ADAPTIVE MESH)</span>
          </span>
        </div>
        <div className="flex items-center gap-space-sm font-label-caps text-label-caps">
          <span className="text-outline">TERRAIN:</span>
          <span className="text-primary font-bold">{activeSector.name}</span>
        </div>
      </div>
    </div>
  );
};
