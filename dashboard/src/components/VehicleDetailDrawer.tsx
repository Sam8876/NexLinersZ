import React from 'react';
import { useFleetStore } from '../store/fleetStore.js';

interface VehicleMeta {
  model: string;
  driver: string;
  capacity: string;
  route: string;
  maintenance: string;
  payload: string;
}

const METADATA_MAP: Record<string, VehicleMeta> = {
  'DUMP-014': {
    model: 'Komatsu 930E-5',
    driver: 'M. Khan (Emp #8842)',
    capacity: '290t / 320t Max',
    route: 'Ramp 1 Crusher Arterial',
    maintenance: '2026-08-28 (Nominal)',
    payload: '290t Iron Ore Lump',
  },
  'DUMP-021': {
    model: 'CAT 797F Heavy Hauler',
    driver: 'P. Nair (Emp #6104)',
    capacity: '340t / 363t Max',
    route: 'Ramp 1 Crusher Arterial',
    maintenance: '2026-08-30 (Nominal)',
    payload: '340t High-Grade Hematite',
  },
  'DUMP-007': {
    model: 'CAT 797F Heavy Hauler',
    driver: 'K. Rao (Emp #4219)',
    capacity: '280t / 363t Max',
    route: 'Ramp 2 West Flank',
    maintenance: '2026-08-22 (Due in 3d)',
    payload: '280t Overburden Sandstone',
  },
  'DUMP-019': {
    model: 'CAT 797F Heavy Hauler',
    driver: 'D. Kumar (Emp #9112)',
    capacity: '365t / 363t Max',
    route: 'Spur 3B Overburden Corridor',
    maintenance: '2026-09-01 (Nominal)',
    payload: '365t Blue Dust Fines',
  },
  'DUMP-031': {
    model: 'Komatsu 830E',
    driver: 'B. Sahu (Emp #7301)',
    capacity: '240t / 250t Max',
    route: 'South Pit Sump Haul',
    maintenance: '2026-08-15 (Overdue)',
    payload: '240t Sump Mud Slurry',
  },
};

export const VehicleDetailDrawer: React.FC = () => {
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const setSelectedVehicleId = useFleetStore((s) => s.setSelectedVehicleId);
  const isDetailDrawerOpen = useFleetStore((s) => s.isDetailDrawerOpen);
  const toggleDetailDrawer = useFleetStore((s) => s.toggleDetailDrawer);
  const livePositions = useFleetStore((s) => s.livePositions);
  const alerts = useFleetStore((s) => s.alerts);
  const speedLimitKmph = useFleetStore((s) => s.speedLimitKmph);
  const addAlert = useFleetStore((s) => s.addAlert);

  if (!isDetailDrawerOpen || !selectedVehicleId) return null;

  const live = livePositions[selectedVehicleId];
  const meta = METADATA_MAP[selectedVehicleId] || {
    model: 'CAT 797F Hauler',
    driver: 'Shift Operator',
    capacity: '360t',
    route: 'Bench 12 Assigned',
    maintenance: 'Current',
    payload: '290t',
  };

  const vehicleAlerts = alerts.filter((a) => a.vehicle_id === selectedVehicleId);
  const isOverspeeding = live ? live.speed_kmph > speedLimitKmph : false;

  const handleRemoteEStop = () => {
    addAlert({
      alert_id: 'alt-' + Date.now(),
      vehicle_id: selectedVehicleId,
      type: 'sos',
      severity: 'critical',
      status: 'raised',
      raised_at: new Date().toISOString(),
      details: {
        action: 'DISPATCHER REMOTE EMERGENCY STOP TRIGGERED',
        speedAtTrigger: live?.speed_kmph ?? 0,
      },
    });
  };

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[420px] bg-surface-container-lowest/98 border-l border-outline-variant/40 shadow-[-8px_0_32px_rgba(0,0,0,0.8)] z-50 flex flex-col backdrop-blur-md transition-all">
      {/* Drawer Header */}
      <div className="p-space-md bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
        <div className="flex items-center gap-space-sm">
          <span className="w-3 h-3 rounded-full bg-primary-container animate-pulse" />
          <div className="flex flex-col">
            <span className="font-mono-data-lg text-mono-data-lg text-primary font-bold">
              {selectedVehicleId}
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              {meta.model}
            </span>
          </div>
        </div>

        <button
          onClick={() => toggleDetailDrawer(false)}
          className="w-8 h-8 flex items-center justify-center rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
          type="button"
          title="Close Inspector"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-space-md space-y-space-md font-mono-data-sm text-mono-data-sm">
        {/* Live Telemetry Matrix */}
        <div className="p-space-sm rounded bg-surface-container-low border border-outline-variant/30 space-y-space-xs">
          <span className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-wider block mb-1">
            Real-Time Telemetry Stream
          </span>

          <div className="grid grid-cols-2 gap-2">
            <div className="p-2 rounded bg-surface-container-lowest">
              <span className="text-outline text-label-caps font-label-caps block">CURRENT SPEED</span>
              <span className={`text-mono-data-lg font-bold ${isOverspeeding ? 'text-error animate-pulse' : 'text-primary'}`}>
                {live ? `${live.speed_kmph.toFixed(1)} km/h` : '22.4 km/h'}
              </span>
              <span className="text-[10px] text-on-surface-variant block">
                Cap: {speedLimitKmph} km/h
              </span>
            </div>

            <div className="p-2 rounded bg-surface-container-lowest">
              <span className="text-outline text-label-caps font-label-caps block">HEADING BEARING</span>
              <div className="flex items-center gap-1.5">
                <span
                  className="material-symbols-outlined text-[16px] text-secondary inline-block transition-transform"
                  style={{ transform: `rotate(${live?.heading_deg ?? 43}deg)` }}
                >
                  navigation
                </span>
                <span className="text-mono-data-lg text-on-surface font-bold">
                  {live ? `${live.heading_deg}°` : '43° NE'}
                </span>
              </div>
              <span className="text-[10px] text-on-surface-variant block">Grid North Offset: 0.0°</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div className="p-2 rounded bg-surface-container-lowest">
              <span className="text-outline text-label-caps font-label-caps block">RTK FIX STATUS</span>
              <span className="px-1.5 py-0.5 rounded bg-primary-container/20 text-primary-container font-bold text-xs inline-block mt-0.5">
                {live ? live.rtkStatus.toUpperCase() : 'FIXED (±1.2cm)'}
              </span>
            </div>

            <div className="p-2 rounded bg-surface-container-lowest">
              <span className="text-outline text-label-caps font-label-caps block">COMMS CHANNEL</span>
              <span className="px-1.5 py-0.5 rounded bg-surface-container text-on-surface font-bold text-xs inline-block mt-0.5">
                {live ? `${live.connectivity.toUpperCase()} + MESH` : 'LTE + MESH'}
              </span>
            </div>
          </div>

          <div className="p-2 rounded bg-surface-container-lowest flex justify-between items-center text-[11px]">
            <span className="text-outline">COORDINATES:</span>
            <span className="text-on-surface font-mono">
              {live ? `${live.position.lat.toFixed(6)}°N, ${live.position.lon.toFixed(6)}°E` : '18.6521°N, 81.2634°E'}
            </span>
          </div>
        </div>

        {/* Equipment Specifications */}
        <div className="p-space-sm rounded bg-surface-container-low border border-outline-variant/30 space-y-1.5">
          <span className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-wider block mb-1">
            Machine Metadata &amp; Logistics
          </span>

          <div className="flex justify-between py-1 border-b border-outline-variant/20">
            <span className="text-on-surface-variant">Shift Operator:</span>
            <span className="text-on-surface font-bold">{meta.driver}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-outline-variant/20">
            <span className="text-on-surface-variant">Assigned Haul Route:</span>
            <span className="text-primary font-bold">{meta.route}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-outline-variant/20">
            <span className="text-on-surface-variant">Payload Manifest:</span>
            <span className="text-on-surface font-bold">{meta.payload}</span>
          </div>
          <div className="flex justify-between py-1 border-b border-outline-variant/20">
            <span className="text-on-surface-variant">GVM Capacity:</span>
            <span className="text-on-surface">{meta.capacity}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-on-surface-variant">Last Safety Audit:</span>
            <span className="text-secondary">{meta.maintenance}</span>
          </div>
        </div>

        {/* Vehicle Alert History */}
        <div className="p-space-sm rounded bg-surface-container-low border border-outline-variant/30 space-y-2">
          <div className="flex justify-between items-center">
            <span className="font-label-caps text-label-caps text-primary uppercase font-bold tracking-wider">
              Recent Incident Log ({vehicleAlerts.length})
            </span>
          </div>

          {vehicleAlerts.length === 0 ? (
            <p className="text-on-surface-variant text-[11px] italic py-1">
              No active safety alerts logged for this vehicle.
            </p>
          ) : (
            <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
              {vehicleAlerts.map((a) => (
                <div
                  key={a.alert_id}
                  className="p-1.5 rounded bg-surface-container-lowest border-l-2 border-error flex items-center justify-between"
                >
                  <div className="flex flex-col">
                    <span className="text-error font-bold uppercase text-[11px]">
                      {a.type.replace('_', ' ')}
                    </span>
                    <span className="text-on-surface-variant text-[10px]">
                      {a.status.toUpperCase()}
                    </span>
                  </div>
                  <span className="text-[10px] text-outline">
                    {new Date(a.raised_at).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Remote Dispatcher Operational Actions */}
        <div className="p-space-sm rounded bg-surface-container-low border border-outline-variant/30 space-y-2 pt-space-xs">
          <span className="font-label-caps text-label-caps text-outline uppercase font-bold block">
            NOC Remote Intervention
          </span>

          <button
            onClick={handleRemoteEStop}
            className="w-full py-2 rounded bg-error text-on-error font-mono-data-sm text-mono-data-sm font-bold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">dangerous</span>
            <span>TRIGGER REMOTE E-STOP</span>
          </button>

          <button
            onClick={() => alert(`Radio ping dispatched to ${selectedVehicleId} operator cab.`)}
            className="w-full py-1.5 rounded bg-surface-container hover:bg-surface-container-high text-primary font-mono-data-sm text-mono-data-sm text-center flex items-center justify-center gap-1 transition-colors"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">contactless</span>
            <span>PING OPERATOR CAB HUD</span>
          </button>
        </div>
      </div>
    </div>
  );
};
