import React, { useState } from 'react';
import mqtt from 'mqtt';
import { useFleetStore } from '../store/fleetStore.js';

export const OperationalSettingsModal: React.FC = () => {
  const isSettingsOpen = useFleetStore((s) => s.isSettingsOpen);
  const toggleSettings = useFleetStore((s) => s.toggleSettings);
  const speedLimitKmph = useFleetStore((s) => s.speedLimitKmph);
  const segmentLimits = useFleetStore((s) => s.segmentLimits);
  const updateSpeedLimits = useFleetStore((s) => s.updateSpeedLimits);

  const [globalLimit, setGlobalLimit] = useState(speedLimitKmph);
  const [ramp1Limit, setRamp1Limit] = useState(segmentLimits['ROUTE-RAMP-01'] || 20);
  const [ramp2Limit, setRamp2Limit] = useState(segmentLimits['ROUTE-RAMP-02'] || 25);
  const [spur3bLimit, setSpur3bLimit] = useState(segmentLimits['ROUTE-SPUR-3B'] || 20);
  const [collisionDist, setCollisionDist] = useState(60);
  const [osrmUrl, setOsrmUrl] = useState('http://router.project-osrm.org');
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  if (!isSettingsOpen) return null;

  const handleSaveAndBroadcast = () => {
    // 1. Update dashboard Zustand store
    const newSegments = {
      'ROUTE-RAMP-01': Number(ramp1Limit),
      'ROUTE-RAMP-02': Number(ramp2Limit),
      'ROUTE-SPUR-3B': Number(spur3bLimit),
    };
    updateSpeedLimits(Number(globalLimit), newSegments);

    // 2. Publish config update over MQTT to alert-engine
    const wsUrl = import.meta.env.VITE_MQTT_WS_URL || 'ws://localhost:8083';
    try {
      const client = mqtt.connect(wsUrl);
      client.on('connect', () => {
        const payload = JSON.stringify({
          globalSpeedLimit: Number(globalLimit),
          segmentLimits: newSegments,
          collisionClearanceMeters: Number(collisionDist),
          osrmUrl,
          updatedAt: new Date().toISOString(),
          dispatcher: 'Marcus Vance',
        });

        client.publish('mine/bailadila/config/speed-limits', payload, { qos: 1 }, () => {
          client.end();
          setSaveStatus('Parameters published and synchronized across fleet & alert engine!');
          setTimeout(() => {
            setSaveStatus(null);
            toggleSettings(false);
          }, 1200);
        });
      });
    } catch (_err) {
      setSaveStatus('Saved locally in dashboard store.');
      setTimeout(() => {
        setSaveStatus(null);
        toggleSettings(false);
      }, 1000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-surface-container-lowest border border-outline-variant/50 rounded-lg shadow-2xl flex flex-col overflow-hidden font-mono-data-sm text-mono-data-sm">
        {/* Modal Header */}
        <div className="p-space-md bg-surface-container-low border-b border-outline-variant/30 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-[20px]">tune</span>
            <span className="font-headline-md text-headline-md text-primary font-bold">
              OPERATIONAL PARAMETERS &amp; SPEED GOVERNANCE
            </span>
          </div>
          <button
            onClick={() => toggleSettings(false)}
            className="w-7 h-7 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant flex items-center justify-center"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-space-md space-y-space-md overflow-y-auto max-h-[75vh]">
          {saveStatus && (
            <div className="p-space-xs rounded bg-primary-container/20 text-primary-fixed border border-primary font-bold text-center animate-pulse">
              {saveStatus}
            </div>
          )}

          {/* Section 1: Global Speed Cap */}
          <div className="p-space-sm rounded bg-surface-container-low border border-outline-variant/30 space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-label-caps text-label-caps text-primary uppercase font-bold">
                MINE DENSE FOG PROTOCOL (LEVEL 3 SPEED CAP)
              </span>
              <span className="text-primary font-bold text-base">{globalLimit} km/h</span>
            </div>
            <input
              type="range"
              min="10"
              max="40"
              step="1"
              value={globalLimit}
              onChange={(e) => setGlobalLimit(Number(e.target.value))}
              className="w-full accent-primary-container cursor-pointer"
            />
            <div className="flex justify-between text-[11px] text-outline">
              <span>10 km/h (Extreme Zero-Vis)</span>
              <span>20 km/h (Standard Monsoon)</span>
              <span>40 km/h (Clear Air)</span>
            </div>
          </div>

          {/* Section 2: Segment Limits */}
          <div className="p-space-sm rounded bg-surface-container-low border border-outline-variant/30 space-y-2">
            <span className="font-label-caps text-label-caps text-primary uppercase font-bold block mb-1">
              HAUL CORRIDOR SEGMENT LIMITS
            </span>

            <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
              <span className="text-on-surface">Ramp 1 (Crusher Arterial):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={ramp1Limit}
                  onChange={(e) => setRamp1Limit(Number(e.target.value))}
                  className="w-16 bg-surface-container-lowest text-primary text-center px-1.5 py-0.5 rounded border border-outline-variant/40"
                />
                <span className="text-outline text-xs">km/h</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-outline-variant/20">
              <span className="text-on-surface">Ramp 2 (West Flank Descent):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={ramp2Limit}
                  onChange={(e) => setRamp2Limit(Number(e.target.value))}
                  className="w-16 bg-surface-container-lowest text-primary text-center px-1.5 py-0.5 rounded border border-outline-variant/40"
                />
                <span className="text-outline text-xs">km/h</span>
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <span className="text-on-surface">Spur 3B (Overburden Dump):</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={spur3bLimit}
                  onChange={(e) => setSpur3bLimit(Number(e.target.value))}
                  className="w-16 bg-surface-container-lowest text-primary text-center px-1.5 py-0.5 rounded border border-outline-variant/40"
                />
                <span className="text-outline text-xs">km/h</span>
              </div>
            </div>
          </div>

          {/* Section 3: OSRM Routing Engine & Collision Threshold */}
          <div className="p-space-sm rounded bg-surface-container-low border border-outline-variant/30 space-y-2">
            <span className="font-label-caps text-label-caps text-primary uppercase font-bold block mb-1">
              OSRM ROAD CLEARANCE &amp; COLLISION PROXIMITY
            </span>

            <div className="flex items-center justify-between">
              <span className="text-on-surface">Road Clearance Safety Threshold:</span>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  value={collisionDist}
                  onChange={(e) => setCollisionDist(Number(e.target.value))}
                  className="w-16 bg-surface-container-lowest text-secondary text-center px-1.5 py-0.5 rounded border border-outline-variant/40"
                />
                <span className="text-outline text-xs">meters</span>
              </div>
            </div>

            <div className="pt-1">
              <label className="text-outline text-[11px] block mb-0.5">
                OSRM Routing Machine Endpoint:
              </label>
              <input
                type="text"
                value={osrmUrl}
                onChange={(e) => setOsrmUrl(e.target.value)}
                className="w-full bg-surface-container-lowest text-on-surface text-xs px-2 py-1 rounded border border-outline-variant/40"
              />
              <span className="text-[10px] text-outline mt-0.5 block">
                Integrated with automatic Mine Haul Network Graph fallback.
              </span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-space-md bg-surface-container-low border-t border-outline-variant/30 flex items-center justify-end gap-2">
          <button
            onClick={() => toggleSettings(false)}
            className="px-space-md py-1.5 rounded bg-surface-container text-on-surface hover:text-primary transition-colors"
            type="button"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveAndBroadcast}
            className="px-space-lg py-1.5 rounded bg-primary-container text-on-primary-container font-bold hover:brightness-110 active:scale-95 transition-all shadow-[0_0_12px_rgba(0,229,255,0.4)]"
            type="button"
          >
            Apply &amp; Dispatch to Fleet
          </button>
        </div>
      </div>
    </div>
  );
};
