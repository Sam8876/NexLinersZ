import React from 'react';
import { useFleetStore } from '../store/fleetStore.js';

export const AiAnalyticsDrawer: React.FC = () => {
  const isDrawerOpen = useFleetStore((s) => s.isDrawerOpen);
  const toggleDrawer = useFleetStore((s) => s.toggleDrawer);
  const layers = useFleetStore((s) => s.layers);
  const toggleLayer = useFleetStore((s) => s.toggleLayer);

  return (
    <div className="w-full px-gutter-screen pb-gutter-screen pt-gutter-panel">
      <div className="w-full bg-surface-container-low rounded overflow-hidden shadow-lg border border-outline-variant/30">
        {/* Accordion Header */}
        <button
          onClick={toggleDrawer}
          className="w-full px-gutter-screen py-space-sm bg-surface-container-lowest flex items-center justify-between cursor-pointer hover:bg-surface-container transition-colors border-b border-outline-variant/30"
          type="button"
        >
          <div className="flex items-center gap-space-sm">
            <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
            <span className="font-label-caps text-label-caps text-primary tracking-widest font-bold uppercase">
              AI SAFETY INTELLIGENCE &amp; PIT RISK MODEL {isDrawerOpen ? '[EXPANDED]' : '[COLLAPSED]'}
            </span>
            <span className="px-1.5 py-0.5 rounded bg-surface-container-high text-on-surface font-mono-data-sm text-mono-data-sm">
              PREDICTIVE CYCLE: T+60M
            </span>
          </div>
          <div className="flex items-center gap-space-sm text-on-surface-variant font-mono-data-sm text-mono-data-sm">
            <span>{isDrawerOpen ? 'COLLAPSE' : 'EXPAND'}</span>
            <span className="material-symbols-outlined text-[18px]">
              {isDrawerOpen ? 'expand_more' : 'expand_less'}
            </span>
          </div>
        </button>

        {/* 4-Column High-Density Grid Body */}
        {isDrawerOpen && (
          <div className="p-gutter-screen grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-gutter-panel">
            {/* COLUMN 1: Fog Extinction & Visibility Trend */}
            <div className="p-space-sm rounded bg-surface-container-lowest flex flex-col justify-between border border-outline-variant/20">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-caps text-label-caps text-outline uppercase font-bold">
                  FOG EXTINCTION &amp; VIS TREND
                </span>
                <span className="font-mono-data-sm text-mono-data-sm text-error font-bold">
                  12m AT 04:30 UTC
                </span>
              </div>

              {/* Sparkline */}
              <div className="py-1">
                <svg className="w-full h-14" preserveAspectRatio="none" viewBox="0 0 240 60">
                  <line stroke="#3b494c" strokeDasharray="3 3" strokeWidth="0.8" x1="0" x2="240" y1="45" y2="45" />
                  <text fill="#849396" fontFamily="JetBrains Mono" fontSize="8" x="2" y="42">
                    20m Safety Threshold
                  </text>
                  <path d="M 0,15 Q 40,18 80,26 T 160,40" fill="none" stroke="#00daf3" strokeWidth="2" />
                  <path d="M 160,40 Q 200,48 240,54" fill="none" stroke="#ef4444" strokeDasharray="4 2" strokeWidth="2" />
                  <circle cx="160" cy="40" fill="#00daf3" r="3" />
                  <text fill="#00daf3" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" x="140" y="32">
                    NOW (18m)
                  </text>
                  <circle cx="240" cy="54" fill="#ef4444" r="3" />
                </svg>
              </div>

              {/* Extinction Metric Bar */}
              <div className="space-y-1 pt-1 font-mono-data-sm text-mono-data-sm">
                <div className="flex justify-between text-on-surface-variant">
                  <span>Optical Extinction Coeff:</span>
                  <span className="text-primary font-bold">0.162 m⁻¹ (Severe)</span>
                </div>
                <div className="w-full bg-surface-container-high h-1.5 rounded overflow-hidden">
                  <div className="bg-error h-full w-[82%]" />
                </div>
              </div>
            </div>

            {/* COLUMN 2: Collision-Risk Prediction & Junction Congestion */}
            <div className="p-space-sm rounded bg-surface-container-lowest flex flex-col justify-between border border-outline-variant/20">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-caps text-label-caps text-outline uppercase font-bold">
                  COLLISION RISK PREDICTION
                </span>
                <span className="px-1 py-0.5 rounded bg-error-container text-on-error-container font-mono-data-sm text-mono-data-sm font-bold">
                  INDEX 78/100
                </span>
              </div>

              <div className="flex items-center gap-space-md py-1">
                {/* SVG Gauge Ring */}
                <div className="w-14 h-14 shrink-0 relative flex items-center justify-center">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#2e3545"
                      strokeWidth="3.5"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#ef4444"
                      strokeDasharray="78, 100"
                      strokeWidth="3.5"
                    />
                  </svg>
                  <span className="absolute font-mono-data-sm text-mono-data-sm font-bold text-error">78%</span>
                </div>

                <div className="flex flex-col font-mono-data-sm text-mono-data-sm">
                  <span className="text-on-surface font-bold">Ramp 1 Junction</span>
                  <span className="text-on-surface-variant text-[11px]">Gradient 9.8% + Thermal Inversion</span>
                  <span className="text-secondary font-semibold text-[11px]">Headway: 4.1s (Req: 10s)</span>
                </div>
              </div>

              <button
                onClick={() => toggleLayer('collisionHeatmap')}
                className={`w-full py-1 rounded font-mono-data-sm text-mono-data-sm text-center flex items-center justify-center gap-1 transition-colors ${
                  layers.collisionHeatmap
                    ? 'bg-error/20 text-error border border-error/40'
                    : 'bg-surface-container hover:bg-surface-container-high text-primary'
                }`}
                type="button"
              >
                <span className="material-symbols-outlined text-[13px]">layers</span>
                <span>HEATMAP OVERLAY: {layers.collisionHeatmap ? 'ACTIVE' : 'INACTIVE'}</span>
              </button>
            </div>

            {/* COLUMN 3: Fleet Safety & Utilization Telemetry */}
            <div className="p-space-sm rounded bg-surface-container-lowest flex flex-col justify-between font-mono-data-sm text-mono-data-sm border border-outline-variant/20">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-caps text-label-caps text-outline uppercase font-bold">
                  FLEET EFFICIENCY &amp; BRAKING
                </span>
                <span className="text-primary font-bold">91.4% RATE</span>
              </div>

              <div className="grid grid-cols-2 gap-2 py-1">
                <div className="p-1 rounded bg-surface-container">
                  <span className="text-outline text-label-caps font-label-caps">ACTIVE DUMPERS</span>
                  <div className="text-on-surface font-headline-md text-headline-md font-bold">
                    26<span className="text-on-surface-variant text-sm font-normal">/28</span>
                  </div>
                </div>
                <div className="p-1 rounded bg-surface-container">
                  <span className="text-outline text-label-caps font-label-caps">AVG FLEET SPEED</span>
                  <div className="text-primary font-headline-md text-headline-md font-bold">
                    18.2 <span className="text-on-surface-variant text-sm font-normal">km/h</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-on-surface-variant text-[11px]">
                <span>Avg Autonomous Brake Response:</span>
                <span className="text-primary-fixed font-bold">240 ms</span>
              </div>
            </div>

            {/* COLUMN 4: AI Anomaly Watchlist */}
            <div className="p-space-sm rounded bg-surface-container-lowest flex flex-col justify-between border border-outline-variant/20">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="font-label-caps text-label-caps text-outline uppercase font-bold">
                  AI ANOMALY WATCHLIST
                </span>
                <span className="font-mono-data-sm text-mono-data-sm text-secondary font-bold">3 FLAGGED</span>
              </div>

              <div className="space-y-1.5 overflow-y-auto max-h-24 pr-1 font-body-sm text-body-sm">
                <div className="flex items-start gap-1.5 text-on-surface text-[11px]">
                  <span className="material-symbols-outlined text-tertiary-fixed-dim text-[13px] shrink-0 mt-0.5">
                    error
                  </span>
                  <span>
                    <strong>DUMP-014:</strong> 3 route departures today (steering actuator variance +0.8°).
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-on-surface text-[11px]">
                  <span className="material-symbols-outlined text-secondary text-[13px] shrink-0 mt-0.5">
                    thermostat
                  </span>
                  <span>
                    <strong>Ramp 2 Crest:</strong> Thermal inversion zero-vis pocket between markers 14 &amp; 19.
                  </span>
                </div>
                <div className="flex items-start gap-1.5 text-on-surface text-[11px]">
                  <span className="material-symbols-outlined text-primary text-[13px] shrink-0 mt-0.5">
                    camera_indoor
                  </span>
                  <span>
                    <strong>DUMP-009:</strong> Front-left LiDAR lens obstruction index 34% (fog smear).
                  </span>
                </div>
              </div>

              <span className="text-outline text-label-caps font-label-caps tracking-wider pt-1 block">
                AUTONOMOUS DISPATCH MODEL V4.8
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
