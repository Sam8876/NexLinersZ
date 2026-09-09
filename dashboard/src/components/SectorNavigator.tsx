import React from 'react';
import { useFleetStore } from '../store/fleetStore.js';

interface VehicleCardItem {
  id: string;
  name: string;
  type: string;
  status: 'LOCKED' | 'STANDBY' | 'ACTIVE';
  statusColor: string;
  route: string;
  payload: string;
  speed: string;
}

const STATIC_VEHICLES: VehicleCardItem[] = [
  {
    id: 'DUMP-014',
    name: 'DUMP-014 (Komatsu 930E)',
    type: 'dumper',
    status: 'ACTIVE',
    statusColor: 'text-primary-container',
    route: 'Ramp 1 Crusher Arterial',
    payload: '290t (Iron Ore)',
    speed: '22.4 km/h',
  },
  {
    id: 'DUMP-021',
    name: 'DUMP-021 (CAT 797F)',
    type: 'dumper',
    status: 'ACTIVE',
    statusColor: 'text-primary-container',
    route: 'Ramp 1 Inbound Convoy',
    payload: '360t (High Grade)',
    speed: '17.8 km/h',
  },
  {
    id: 'DUMP-007',
    name: 'DUMP-007 (CAT 797F)',
    type: 'dumper',
    status: 'ACTIVE',
    statusColor: 'text-primary-container',
    route: 'Ramp 2 West Flank',
    payload: '0t (Empty Return)',
    speed: '16.5 km/h',
  },
  {
    id: 'DUMP-019',
    name: 'DUMP-019 (CAT 797F)',
    type: 'dumper',
    status: 'STANDBY',
    statusColor: 'text-red-400',
    route: 'Spur 3B Overburden',
    payload: '340t (Overburden)',
    speed: '38.5 km/h (OVERSPEED)',
  },
  {
    id: 'DUMP-031',
    name: 'DUMP-031 (Komatsu 830E)',
    type: 'dumper',
    status: 'STANDBY',
    statusColor: 'text-amber-400',
    route: 'Ramp 2 Switchback',
    payload: '240t (Iron Ore)',
    speed: '14.0 km/h',
  },
];

export const SectorNavigator: React.FC = () => {
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const setSelectedVehicleId = useFleetStore((s) => s.setSelectedVehicleId);
  const livePositions = useFleetStore((s) => s.livePositions);
  const searchQuery = useFleetStore((s) => s.searchQuery.toUpperCase());

  const filteredVehicles = STATIC_VEHICLES.filter(
    (v) =>
      !searchQuery ||
      v.id.includes(searchQuery) ||
      v.name.toUpperCase().includes(searchQuery)
  );

  return (
    <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] w-64 bg-surface-container-low border-r border-outline-variant/30 z-40 flex flex-col p-space-sm">
      {/* Header */}
      <div className="px-space-sm py-space-xs mb-space-sm border-b border-outline-variant/20 flex items-center justify-between">
        <span className="font-label-caps text-label-caps text-on-surface-variant uppercase tracking-wider">
          Pit Sector Navigator
        </span>
        <span className="font-mono-data-sm text-mono-data-sm px-1.5 py-0.5 rounded bg-surface-container text-primary font-bold">
          SEC-04
        </span>
      </div>

      {/* Vehicle Roster List */}
      <div className="flex-1 overflow-y-auto space-y-space-xs">
        {filteredVehicles.map((v) => {
          const isSelected = selectedVehicleId === v.id;
          const live = livePositions[v.id];
          const displaySpeed = live ? `${live.speed_kmph.toFixed(1)} km/h` : v.speed;

          return (
            <div
              key={v.id}
              onClick={() => setSelectedVehicleId(v.id)}
              className={`p-space-sm rounded bg-surface-container-lowest border cursor-pointer transition-all ${
                isSelected
                  ? 'border-primary shadow-[0_0_12px_rgba(0,229,255,0.25)] bg-surface-container/60'
                  : 'border-outline-variant/30 hover:border-primary/50'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono-data-md text-mono-data-md text-primary font-bold">
                  {v.name}
                </span>
                <span
                  className={`font-label-caps text-label-caps px-1 rounded bg-surface-container ${v.statusColor}`}
                >
                  {v.status}
                </span>
              </div>
              <div className="text-on-surface-variant font-mono-data-sm text-mono-data-sm mt-1">
                {v.route}
              </div>
              <div className="flex items-center justify-between text-on-surface-variant font-mono-data-sm text-mono-data-sm mt-1">
                <span>{v.payload}</span>
                <span className="text-primary font-bold">{displaySpeed}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Mesh Radio Quality Footer */}
      <div className="pt-space-sm border-t border-outline-variant/30">
        <div className="p-space-sm rounded bg-surface-container border border-outline-variant/40">
          <div className="flex items-center justify-between font-label-caps text-label-caps text-on-surface-variant mb-1">
            <span>MESH SIGNAL QUALITY</span>
            <span className="text-primary-fixed">99.4%</span>
          </div>
          <div className="w-full bg-surface-container-highest h-1 rounded-full overflow-hidden">
            <div className="bg-primary-container h-full w-[99.4%]" />
          </div>
        </div>
      </div>
    </aside>
  );
};
