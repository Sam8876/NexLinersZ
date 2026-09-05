import React from 'react';
import { useFleetStore } from '../store/fleetStore.js';

export const TopToolbar: React.FC = () => {
  const viewMode = useFleetStore((s) => s.viewMode);
  const setViewMode = useFleetStore((s) => s.setViewMode);
  const mapType = useFleetStore((s) => s.mapType);
  const setMapType = useFleetStore((s) => s.setMapType);
  const layers = useFleetStore((s) => s.layers);
  const toggleLayer = useFleetStore((s) => s.toggleLayer);
  const searchQuery = useFleetStore((s) => s.searchQuery);
  const setSearchQuery = useFleetStore((s) => s.setSearchQuery);
  const addAlert = useFleetStore((s) => s.addAlert);

  const handleBroadcastEmergency = () => {
    addAlert({
      alert_id: 'alt-' + Date.now(),
      vehicle_id: 'FLEET-BROADCAST',
      type: 'sos',
      severity: 'critical',
      status: 'raised',
      raised_at: new Date().toISOString(),
      details: {
        message: 'GLOBAL EMERGENCY BROADCAST: VISIBILITY < 20M PROTOCOL ENFORCED',
        speedCapKmph: 15,
        action: 'All haul vehicles reduce speed and engage fog beacons',
      },
    });
  };

  return (
    <div className="w-full bg-surface-container-low px-gutter-screen py-space-xs flex flex-wrap items-center justify-between gap-space-md border-b border-outline-variant/30">
      {/* View Switcher & Quick Overlays */}
      <div className="flex items-center flex-wrap gap-space-sm">
        {/* Mode Segmented Toggle */}
        <div className="flex items-center bg-surface-container-lowest p-space-xxs rounded border border-outline-variant/30">
          <button
            onClick={() => setViewMode('map')}
            className={`px-space-md py-1 rounded font-label-caps text-label-caps flex items-center gap-1 transition-all ${
              viewMode === 'map'
                ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">map</span>
            <span>MAP VIEW (LIVE)</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`px-space-md py-1 rounded font-label-caps text-label-caps flex items-center gap-1 transition-all ${
              viewMode === 'list'
                ? 'bg-primary-container text-on-primary-container font-bold shadow-sm'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">view_timeline</span>
            <span>COMPACT LIST (26)</span>
          </button>
        </div>

        {/* Map Type Switcher: Tactical HUD vs MapLibre */}
        {viewMode === 'map' && (
          <div className="flex items-center bg-surface-container-lowest p-space-xxs rounded border border-outline-variant/30">
            <button
              onClick={() => setMapType('tactical')}
              className={`px-space-sm py-1 rounded font-mono-data-sm text-mono-data-sm transition-all ${
                mapType === 'tactical'
                  ? 'bg-surface-container-high text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              TACTICAL HUD
            </button>
            <button
              onClick={() => setMapType('maplibre')}
              className={`px-space-sm py-1 rounded font-mono-data-sm text-mono-data-sm transition-all ${
                mapType === 'maplibre'
                  ? 'bg-surface-container-high text-primary font-bold'
                  : 'text-on-surface-variant hover:text-on-surface'
              }`}
              type="button"
            >
              MAPLIBRE GIS
            </button>
          </div>
        )}

        {/* Quick Toggles / Overlay Filters */}
        <div className="flex items-center gap-space-xxs overflow-x-auto">
          <label className="flex items-center gap-1 px-space-xs py-1 rounded bg-surface-container-highest cursor-pointer text-primary text-mono-data-sm font-mono-data-sm">
            <input
              type="checkbox"
              checked={layers.haulRoutes}
              onChange={() => toggleLayer('haulRoutes')}
              className="accent-primary-container h-3 w-3 rounded-none cursor-pointer"
            />
            <span>HAUL ROUTES</span>
          </label>

          <label className="flex items-center gap-1 px-space-xs py-1 rounded bg-surface-container-highest cursor-pointer text-primary text-mono-data-sm font-mono-data-sm">
            <input
              type="checkbox"
              checked={layers.vehicles}
              onChange={() => toggleLayer('vehicles')}
              className="accent-primary-container h-3 w-3 rounded-none cursor-pointer"
            />
            <span>VEHICLES (26)</span>
          </label>

          <label className="flex items-center gap-1 px-space-xs py-1 rounded bg-error/20 text-error text-mono-data-sm font-mono-data-sm cursor-pointer">
            <input
              type="checkbox"
              checked={layers.collisionHeatmap}
              onChange={() => toggleLayer('collisionHeatmap')}
              className="accent-error h-3 w-3 rounded-none cursor-pointer"
            />
            <span className="font-bold">COLLISION HEATMAP</span>
          </label>

          <label className="flex items-center gap-1 px-space-xs py-1 rounded bg-surface-container-highest cursor-pointer text-on-surface-variant text-mono-data-sm font-mono-data-sm">
            <input
              type="checkbox"
              checked={layers.fogStations}
              onChange={() => toggleLayer('fogStations')}
              className="accent-primary-container h-3 w-3 rounded-none cursor-pointer"
            />
            <span>FOG STATIONS</span>
          </label>

          <label className="flex items-center gap-1 px-space-xs py-1 rounded bg-surface-container-highest cursor-pointer text-on-surface-variant text-mono-data-sm font-mono-data-sm">
            <input
              type="checkbox"
              checked={layers.geofences}
              onChange={() => toggleLayer('geofences')}
              className="accent-primary-container h-3 w-3 rounded-none cursor-pointer"
            />
            <span>GEOFENCES (20 km/h)</span>
          </label>
        </div>
      </div>

      {/* Center/Right Search & Global Emergency Broadcast Action */}
      <div className="flex items-center gap-space-sm flex-1 max-w-xl justify-end">
        {/* Search dumper */}
        <div className="relative w-48 lg:w-64">
          <span className="material-symbols-outlined absolute left-2 top-1.5 text-outline text-[16px]">
            search
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="FILTER VEHICLE (D-014)..."
            className="w-full bg-surface-container-lowest text-on-surface font-mono-data-sm text-mono-data-sm pl-7 pr-2 py-1 rounded outline-none focus:bg-surface-container-high placeholder:text-outline/70 border border-outline-variant/30"
          />
        </div>

        {/* Global Emergency Broadcast Caution Button */}
        <button
          onClick={handleBroadcastEmergency}
          className="relative group px-space-md py-1 bg-error text-on-error font-mono-data-sm text-mono-data-sm font-bold rounded flex items-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.45)] hover:brightness-110 active:scale-95 transition-all animate-pulse"
          type="button"
        >
          <span className="material-symbols-outlined text-[16px]">campaign</span>
          <span className="tracking-wide">BROADCAST: VISIBILITY &lt; 20M</span>
        </button>
      </div>
    </div>
  );
};
