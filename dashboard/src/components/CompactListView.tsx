import React from 'react';
import { useFleetStore } from '../store/fleetStore.js';

interface VehicleRow {
  id: string;
  model: string;
  driver: string;
  route: string;
  speed: number;
  payload: number;
  rtk: string;
  connectivity: string;
  status: string;
}

const FLEET_ROSTER: VehicleRow[] = [
  { id: 'DUMP-002', model: 'CAT 797F', driver: 'R. Sharma', route: 'Bench 02 → Rim', speed: 18.0, payload: 350, rtk: 'FIXED', connectivity: 'LTE', status: 'ACTIVE' },
  { id: 'DUMP-005', model: 'CAT 797F', driver: 'A. Patel', route: 'Bench 06 → Crusher 1', speed: 16.2, payload: 360, rtk: 'FIXED', connectivity: 'LTE', status: 'ACTIVE' },
  { id: 'DUMP-007', model: 'Komatsu 930E', driver: 'K. Rao', route: 'Switchback Bench 12', speed: 0.0, payload: 280, rtk: 'FIXED', connectivity: 'MESH', status: 'HALTED' },
  { id: 'DUMP-009', model: 'Komatsu 930E', driver: 'S. Verma', route: 'Face 09 Loader', speed: 14.1, payload: 310, rtk: 'FIXED', connectivity: 'LTE', status: 'ACTIVE' },
  { id: 'DUMP-014', model: 'Komatsu 930E', driver: 'M. Khan', route: 'Bench 12 → Crusher 2', speed: 34.0, payload: 290, rtk: 'FIXED', connectivity: 'LTE', status: 'HAZARD' },
  { id: 'DUMP-018', model: 'CAT 797F', driver: 'V. Singh', route: 'Ramp 1 Crusher', speed: 17.0, payload: 355, rtk: 'FIXED', connectivity: 'LTE', status: 'ACTIVE' },
  { id: 'DUMP-019', model: 'CAT 797F', driver: 'D. Kumar', route: 'Crusher Inbound Ramp', speed: 42.0, payload: 365, rtk: 'FIXED', connectivity: 'LTE', status: 'OVERSPEED' },
  { id: 'DUMP-021', model: 'CAT 797F', driver: 'P. Nair', route: 'Ramp 1 North', speed: 16.0, payload: 340, rtk: 'FIXED', connectivity: 'LTE', status: 'ACTIVE' },
  { id: 'DUMP-022', model: 'CAT 797F', driver: 'H. Jena', route: 'Pit Rim → Waste Dump', speed: 28.5, payload: 0, rtk: 'FIXED', connectivity: 'LTE', status: 'ACTIVE' },
  { id: 'DUMP-026', model: 'CAT 797F', driver: 'T. Das', route: 'Crusher Return Path', speed: 19.0, payload: 0, rtk: 'FIXED', connectivity: 'LTE', status: 'ACTIVE' },
  { id: 'DUMP-031', model: 'Komatsu 830E', driver: 'B. Sahu', route: 'South Pit Sump', speed: 14.0, payload: 240, rtk: 'FLOAT', connectivity: 'LORAWAN', status: 'SIG_LOST' },
];

export const CompactListView: React.FC = () => {
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const setSelectedVehicleId = useFleetStore((s) => s.setSelectedVehicleId);
  const livePositions = useFleetStore((s) => s.livePositions);
  const searchQuery = useFleetStore((s) => s.searchQuery.toUpperCase());

  const filtered = FLEET_ROSTER.filter(
    (v) =>
      !searchQuery ||
      v.id.includes(searchQuery) ||
      v.model.toUpperCase().includes(searchQuery) ||
      v.driver.toUpperCase().includes(searchQuery)
  );

  return (
    <div className="relative flex-1 bg-surface-container-lowest rounded overflow-hidden min-h-[580px] lg:min-h-[640px] flex flex-col border border-outline-variant/30">
      <div className="p-space-sm bg-surface-container-low flex items-center justify-between border-b border-outline-variant/30">
        <div className="flex items-center gap-space-xs font-mono-data-sm text-mono-data-sm text-primary font-bold">
          <span className="material-symbols-outlined text-[16px]">view_timeline</span>
          <span>COMPACT TELEMETRY TABLE (BAILADILA SECTOR 04)</span>
        </div>
        <span className="font-mono-data-sm text-mono-data-sm text-outline">
          SHOWING {filtered.length} DUMPERS
        </span>
      </div>

      <div className="flex-1 overflow-auto">
        <table className="w-full text-left font-mono-data-sm text-mono-data-sm">
          <thead className="bg-surface-container-lowest text-outline font-label-caps text-label-caps uppercase sticky top-0 border-b border-outline-variant/30">
            <tr>
              <th className="py-2 px-3">Vehicle ID</th>
              <th className="py-2 px-3">Model</th>
              <th className="py-2 px-3">Operator</th>
              <th className="py-2 px-3">Assigned Route</th>
              <th className="py-2 px-3 text-right">Speed (km/h)</th>
              <th className="py-2 px-3 text-right">Payload</th>
              <th className="py-2 px-3">RTK Fix</th>
              <th className="py-2 px-3">Comms</th>
              <th className="py-2 px-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((v, idx) => {
              const live = livePositions[v.id];
              const speed = live ? live.speed_kmph : v.speed;
              const isSelected = selectedVehicleId === v.id;

              return (
                <tr
                  key={v.id}
                  onClick={() => setSelectedVehicleId(v.id)}
                  className={`border-b border-outline-variant/20 cursor-pointer transition-colors ${
                    idx % 2 === 0 ? 'bg-surface-container-low' : 'bg-surface-container'
                  } ${isSelected ? 'bg-surface-container-high border-l-2 border-l-primary' : 'hover:bg-surface-bright'}`}
                >
                  <td className="py-2 px-3 font-bold text-primary">{v.id}</td>
                  <td className="py-2 px-3 text-on-surface">{v.model}</td>
                  <td className="py-2 px-3 text-on-surface-variant">{v.driver}</td>
                  <td className="py-2 px-3 text-on-surface-variant">{v.route}</td>
                  <td className={`py-2 px-3 text-right font-bold ${speed > 25 ? 'text-error' : 'text-primary'}`}>
                    {speed.toFixed(1)}
                  </td>
                  <td className="py-2 px-3 text-right text-on-surface">{v.payload}t</td>
                  <td className="py-2 px-3">
                    <span className={`px-1 rounded text-[10px] ${v.rtk === 'FIXED' ? 'bg-primary-container/20 text-primary-container' : 'bg-secondary/20 text-secondary'}`}>
                      {v.rtk}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-on-surface-variant">{v.connectivity}</td>
                  <td className="py-2 px-3">
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                      v.status === 'HAZARD' || v.status === 'OVERSPEED'
                        ? 'bg-error text-on-error'
                        : v.status === 'HALTED'
                        ? 'bg-secondary text-on-secondary'
                        : v.status === 'SIG_LOST'
                        ? 'bg-outline text-surface'
                        : 'bg-primary/20 text-primary'
                    }`}>
                      {v.status}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
