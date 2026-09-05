import React, { useState } from 'react';
import { useFleetStore } from '../store/fleetStore.js';

export const DigitalTwinMap: React.FC = () => {
  const selectedVehicleId = useFleetStore((s) => s.selectedVehicleId);
  const setSelectedVehicleId = useFleetStore((s) => s.setSelectedVehicleId);
  const layers = useFleetStore((s) => s.layers);
  const livePositions = useFleetStore((s) => s.livePositions);
  const addAlert = useFleetStore((s) => s.addAlert);

  const [scale, setScale] = useState(1);

  const handleZoomIn = () => setScale((s) => Math.min(1.8, s + 0.15));
  const handleZoomOut = () => setScale((s) => Math.max(0.7, s - 0.15));
  const handleReset = () => setScale(1);

  const handleEmergencyStop = () => {
    addAlert({
      alert_id: 'alt-' + Date.now(),
      vehicle_id: 'DUMP-014',
      type: 'sos',
      severity: 'critical',
      status: 'raised',
      raised_at: new Date().toISOString(),
      details: {
        action: 'REMOTE E-STOP TRIGGERED FROM CONTROL ROOM',
        closingVelocityKmph: 18,
        distanceM: 34,
      },
    });
  };

  return (
    <div className="relative flex-1 bg-surface-container-lowest rounded overflow-hidden min-h-[580px] lg:min-h-[640px] flex flex-col border border-outline-variant/30">
      {/* Top Left HUD Metadata Banner */}
      <div className="absolute top-space-sm left-space-sm z-20 flex flex-col gap-1 pointer-events-none">
        <div className="flex items-center gap-2 bg-surface-container-lowest/90 px-space-sm py-1 rounded backdrop-blur border border-outline-variant/30">
          <span className="w-2 h-2 rounded-full bg-primary-container animate-ping" />
          <span className="font-mono-data-sm text-mono-data-sm text-primary font-bold">
            DIGITAL TWIN // SEC-04 NORTH OPEN-CAST PIT
          </span>
          <span className="text-outline text-label-caps font-label-caps">
            DATUM: WGS84 EPSG:3857
          </span>
        </div>
        <div className="flex items-center gap-2 bg-surface-container-lowest/80 px-space-sm py-0.5 rounded text-secondary font-mono-data-sm text-mono-data-sm border border-outline-variant/20">
          <span className="material-symbols-outlined text-[13px]">cloud</span>
          <span>DENSE ADVECTION FOG: EXTINCTION COEFF 0.162 m⁻¹ (VIS: 16-18m)</span>
        </div>
      </div>

      {/* Top Right Floating HUD Map Quick Controls */}
      <div className="absolute top-space-sm right-space-sm z-20 flex flex-col gap-space-xs">
        <div className="flex items-center bg-surface-container-low/95 p-0.5 rounded backdrop-blur shadow-md border border-outline-variant/30">
          <button
            onClick={handleZoomIn}
            className="w-7 h-7 flex items-center justify-center text-on-surface hover:text-primary hover:bg-surface-container rounded transition-colors"
            title="Zoom In"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">add</span>
          </button>
          <button
            onClick={handleZoomOut}
            className="w-7 h-7 flex items-center justify-center text-on-surface hover:text-primary hover:bg-surface-container rounded transition-colors"
            title="Zoom Out"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">remove</span>
          </button>
          <button
            onClick={handleReset}
            className="w-7 h-7 flex items-center justify-center text-on-surface hover:text-primary hover:bg-surface-container rounded transition-colors"
            title="Reset View"
            type="button"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
          </button>
        </div>

        <div className="bg-surface-container-low/95 px-2 py-1 rounded flex items-center justify-between text-mono-data-sm font-mono-data-sm text-on-surface-variant backdrop-blur shadow-md border border-outline-variant/30">
          <span>SCALE</span>
          <span className="text-primary font-bold">1:5000</span>
        </div>
      </div>

      {/* High-Precision SVG Pit Map Canvas */}
      <div className="w-full h-full flex-1 relative overflow-hidden flex items-center justify-center select-none">
        <svg
          className="w-full h-full object-cover transition-transform duration-300"
          preserveAspectRatio="xMidYMid slice"
          viewBox="0 0 1200 800"
          style={{ transform: `scale(${scale})` }}
        >
          <defs>
            {/* Fog Gradient Field Overlay representing Sector 4B dense pocket */}
            <radialGradient cx="62%" cy="48%" id="fog-density-pocket" r="35%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
              <stop offset="45%" stopColor="#0284c7" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#0369a1" stopOpacity="0" />
            </radialGradient>
            <radialGradient cx="30%" cy="30%" id="fog-pocket-switchback" r="28%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
              <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.05" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
            </radialGradient>

            {/* Collision Heatmap Zone Radial */}
            <radialGradient cx="68%" cy="43%" id="collision-danger-glow" r="18%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.45" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.15" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
            </radialGradient>

            {/* Haul Road Dash Pattern */}
            <pattern height="40" id="road-grid" patternUnits="userSpaceOnUse" width="40">
              <path d="M 40 0 L 0 0 0 40" fill="none" opacity="0.35" stroke="#1f2e47" strokeWidth="0.75" />
            </pattern>
          </defs>

          {/* Background Coordinate Plane */}
          <rect fill="#070e1d" height="800" width="1200" />
          <rect fill="url(#road-grid)" height="800" width="1200" />

          {/* Topographic Contour Elevation Rings (Mining Pit Benches: 01 down to 18 Sump) */}
          <g fill="none" opacity="0.7" stroke="#1e293b" strokeWidth="1.2">
            {/* Bench 02 (Pit Rim) */}
            <path d="M 60,110 Q 320,40 680,65 T 1140,140 Q 1180,480 1080,710 T 520,770 Q 140,730 60,540 Z" />
            {/* Bench 06 */}
            <path d="M 120,170 Q 360,110 690,130 T 1060,200 Q 1100,470 1010,650 T 520,700 Q 210,670 130,500 Z" />
            {/* Bench 09 */}
            <path
              d="M 190,230 Q 390,180 700,200 T 980,260 Q 1010,470 940,590 T 530,640 Q 280,610 200,460 Z"
              stroke="#0e7490"
              strokeOpacity="0.4"
            />
            {/* Bench 12 */}
            <path d="M 270,290 Q 430,250 710,270 T 890,320 Q 920,460 860,530 T 540,570 Q 350,550 280,430 Z" />
            {/* Bench 14 */}
            <path
              d="M 360,350 Q 480,310 710,330 T 810,380 Q 830,460 780,480 T 550,510 Q 420,490 370,410 Z"
              stroke="#00e5ff"
              strokeOpacity="0.3"
            />
            {/* Bench 16 Sump Lowest Floor */}
            <path
              d="M 450,400 Q 540,370 690,385 T 730,420 Q 740,460 700,470 T 560,480 Q 480,465 450,420 Z"
              fill="#0c1322"
              stroke="#00daf3"
              strokeOpacity="0.5"
            />
          </g>

          {/* Active Primary Haul Road Corridors */}
          {layers.haulRoutes && (
            <g>
              {/* Ramp 1 (Crusher Arterial Corridor) */}
              <path
                d="M 110,660 C 220,640 420,580 580,510 C 720,450 780,380 810,290 C 840,200 950,140 1090,130"
                fill="none"
                stroke="#161f30"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="24"
              />
              <path
                d="M 110,660 C 220,640 420,580 580,510 C 720,450 780,380 810,290 C 840,200 950,140 1090,130"
                fill="none"
                opacity="0.85"
                stroke="#00e5ff"
                strokeDasharray="8 6"
                strokeWidth="1.5"
              />

              {/* Ramp 2 (Bench 14 West Descent) */}
              <path
                d="M 210,180 C 260,280 290,410 390,490 C 470,550 630,530 730,450"
                fill="none"
                stroke="#161f30"
                strokeLinecap="round"
                strokeWidth="22"
              />
              <path
                d="M 210,180 C 260,280 290,410 390,490 C 470,550 630,530 730,450"
                fill="none"
                opacity="0.6"
                stroke="#22d3ee"
                strokeDasharray="6 4"
                strokeWidth="1.5"
              />

              {/* Spur 3B (Overburden Dump Arterial) */}
              <path
                d="M 520,740 C 580,660 670,590 770,540 C 880,480 1010,490 1070,540"
                fill="none"
                stroke="#161f30"
                strokeLinecap="round"
                strokeWidth="20"
              />
              <path
                d="M 520,740 C 580,660 670,590 770,540 C 880,480 1010,490 1070,540"
                fill="none"
                opacity="0.5"
                stroke="#38bdf8"
                strokeDasharray="5 5"
                strokeWidth="1.2"
              />

              {/* Switchback 4 Sharp Corner */}
              <path
                d="M 280,290 L 220,340 L 320,390"
                fill="none"
                opacity="0.9"
                stroke="#f59e0b"
                strokeDasharray="4 3"
                strokeWidth="2"
              />

              {/* Road Corridor Labeling */}
              <text fill="#c3f5ff" fontFamily="JetBrains Mono" fontSize="11" fontWeight="700" x="1000" y="115">
                RAMP 1 → PRIMARY CRUSHER 2
              </text>
              <text fill="#849396" fontFamily="JetBrains Mono" fontSize="10" x="210" y="165">
                RAMP 2 (WEST FLANK)
              </text>
              <text fill="#849396" fontFamily="JetBrains Mono" fontSize="10" x="890" y="560">
                SPUR 3B [OVERBURDEN DUMP AREA]
              </text>
              <text fill="#f59e0b" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" x="180" y="325">
                SW-4 BLIND CORNER
              </text>
            </g>
          )}

          {/* Shovel & Crusher Physical Zones */}
          <rect fill="#1e293b" height="38" rx="2" width="46" x="1050" y="110" />
          <rect fill="#00e5ff" fillOpacity="0.15" height="30" width="38" x="1054" y="114" />
          <text fill="#00e5ff" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" x="1058" y="132">
            CRUSH-2
          </text>

          <circle cx="430" cy="420" fill="#141b2b" r="26" stroke="#00e5ff" strokeDasharray="3 3" strokeWidth="1.5" />
          <text fill="#00daf3" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" x="408" y="424">
            SHOV-07
          </text>

          <circle cx="890" cy="310" fill="#141b2b" r="24" stroke="#00e5ff" strokeDasharray="3 3" strokeWidth="1.5" />
          <text fill="#00daf3" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" x="870" y="314">
            SHOV-04
          </text>

          {/* Fog Density Pockets */}
          {layers.fogStations && (
            <>
              <rect fill="url(#fog-density-pocket)" height="800" pointerEvents="none" width="1200" x="0" y="0" />
              <rect fill="url(#fog-pocket-switchback)" height="800" pointerEvents="none" width="1200" x="0" y="0" />

              {/* Radar Fog Sensor Stations */}
              <g fill="#00e5ff">
                <circle cx="340" cy="210" r="4" />
                <circle cx="340" cy="210" fill="none" opacity="0.6" r="12" stroke="#00e5ff" strokeWidth="0.75" />
                <text fill="#849396" fontFamily="JetBrains Mono" fontSize="8" x="355" y="213">
                  FOG-STN-01 (14m)
                </text>

                <circle cx="770" cy="310" fill="#fbb400" r="4" />
                <circle cx="770" cy="310" fill="none" opacity="0.6" r="14" stroke="#fbb400" strokeWidth="0.75" />
                <text fill="#fbb400" fontFamily="JetBrains Mono" fontSize="8" fontWeight="700" x="785" y="305">
                  FOG-STN-02 (CRIT: 11m)
                </text>

                <circle cx="940" cy="510" r="4" />
                <circle cx="940" cy="510" fill="none" opacity="0.6" r="10" stroke="#00e5ff" strokeWidth="0.75" />
                <text fill="#849396" fontFamily="JetBrains Mono" fontSize="8" x="955" y="513">
                  FOG-STN-03 (19m)
                </text>
              </g>
            </>
          )}

          {/* Dynamic Collision Risk Heatmap Field Overlay */}
          {layers.collisionHeatmap && (
            <circle cx="790" cy="350" fill="url(#collision-danger-glow)" pointerEvents="none" r="140" />
          )}

          {/* FLEET VEHICLES LAYER */}
          {layers.vehicles && (
            <g>
              {/* VEHICLE: DUMP-002 (NORMAL, Cyan/Emerald) */}
              <g
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedVehicleId('DUMP-002')}
                transform="translate(180, 645) rotate(-24)"
              >
                <polygon fill="#10b981" points="0,-9 6,9 0,5 -6,9" />
                <text fill="#dce2f7" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" x="9" y="3">
                  D-002
                </text>
                <text fill="#10b981" fontFamily="JetBrains Mono" fontSize="8" x="9" y="12">
                  18 km/h
                </text>
              </g>

              {/* VEHICLE: DUMP-005 */}
              <g
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedVehicleId('DUMP-005')}
                transform="translate(340, 580) rotate(-32)"
              >
                <polygon fill="#06b6d4" points="0,-9 6,9 0,5 -6,9" />
                <text fill="#dce2f7" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" x="9" y="3">
                  D-005
                </text>
                <text fill="#00daf3" fontFamily="JetBrains Mono" fontSize="8" x="9" y="12">
                  16 km/h
                </text>
              </g>

              {/* VEHICLE: DUMP-009 */}
              <g
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedVehicleId('DUMP-009')}
                transform="translate(480, 540) rotate(-40)"
              >
                <polygon fill="#10b981" points="0,-9 6,9 0,5 -6,9" />
                <text fill="#dce2f7" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" x="9" y="3">
                  D-009
                </text>
                <text fill="#10b981" fontFamily="JetBrains Mono" fontSize="8" x="9" y="12">
                  14 km/h
                </text>
              </g>

              {/* VEHICLE: DUMP-018 */}
              <g
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedVehicleId('DUMP-018')}
                transform="translate(680, 480) rotate(-55)"
              >
                <polygon fill="#10b981" points="0,-9 6,9 0,5 -6,9" />
                <text fill="#dce2f7" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" x="9" y="3">
                  D-018
                </text>
                <text fill="#10b981" fontFamily="JetBrains Mono" fontSize="8" x="9" y="12">
                  17 km/h
                </text>
              </g>

              {/* VEHICLE: DUMP-026 */}
              <g
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedVehicleId('DUMP-026')}
                transform="translate(980, 150) rotate(140)"
              >
                <polygon fill="#06b6d4" points="0,-9 6,9 0,5 -6,9" />
                <text fill="#dce2f7" fontFamily="JetBrains Mono" fontSize="9" fontWeight="600" x="9" y="3">
                  D-026
                </text>
                <text fill="#00daf3" fontFamily="JetBrains Mono" fontSize="8" x="9" y="12">
                  19 km/h
                </text>
              </g>

              {/* VEHICLE: DUMP-022 (WARNING - Approaching Fog Blindspot) */}
              <g
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedVehicleId('DUMP-022')}
                transform="translate(320, 240) rotate(42)"
              >
                <polygon fill="#f59e0b" points="0,-9 6,9 0,5 -6,9" />
                <circle cx="0" cy="0" fill="none" r="14" stroke="#f59e0b" strokeDasharray="3 2" strokeWidth="1" />
                <text fill="#f59e0b" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" x="12" y="3">
                  D-022
                </text>
                <text fill="#fbb400" fontFamily="JetBrains Mono" fontSize="8" x="12" y="12">
                  15 km/h [SLOWING]
                </text>
              </g>

              {/* VEHICLE: DUMP-007 (WARNING: Unusual Halt) */}
              <g
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedVehicleId('DUMP-007')}
                transform="translate(250, 310)"
              >
                <circle cx="0" cy="0" fill="rgba(245, 158, 11, 0.2)" r="16" stroke="#f59e0b" strokeWidth="1.5" />
                <rect fill="#f59e0b" height="12" width="12" x="-6" y="-6" />
                <text fill="#ffd795" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" x="14" y="2">
                  D-007 [HALTED]
                </text>
                <text fill="#f59e0b" fontFamily="JetBrains Mono" fontSize="8" x="14" y="11">
                  0 km/h (4m 12s)
                </text>
              </g>

              {/* VEHICLE: DUMP-031 (SYSTEM ALERT: Signal Lost) */}
              <g
                className="cursor-pointer opacity-70 hover:opacity-100 transition-opacity"
                onClick={() => setSelectedVehicleId('DUMP-031')}
                transform="translate(620, 470)"
              >
                <circle cx="0" cy="0" fill="none" r="12" stroke="#6366f1" strokeDasharray="2 2" strokeWidth="1.5" />
                <polygon fill="#6366f1" points="0,-7 5,7 0,4 -5,7" />
                <text fill="#bac9cc" fontFamily="JetBrains Mono" fontSize="8" x="10" y="2">
                  D-031 [LOSS]
                </text>
                <text fill="#6366f1" fontFamily="JetBrains Mono" fontSize="7" x="10" y="10">
                  PING &gt; 1800ms
                </text>
              </g>

              {/* VEHICLE: DUMP-019 (CRITICAL: OVERSPEEDING) */}
              <g
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedVehicleId('DUMP-019')}
                transform="translate(890, 200) rotate(-35)"
              >
                <circle className="animate-ping" cx="0" cy="0" fill="none" r="18" stroke="#f97316" strokeWidth="1.5" />
                <polygon fill="#f97316" points="0,-11 7,11 0,6 -7,11" />
                <rect fill="#141b2b" height="20" rx="2" width="70" x="12" y="-12" />
                <text fill="#ffb4ab" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" x="16" y="2">
                  D-019: 42 km/h
                </text>
                <text fill="#f97316" fontFamily="JetBrains Mono" fontSize="8" x="16" y="11">
                  LIMIT: 20 km/h
                </text>
              </g>

              {/* CRITICAL HAZARD INTERLOCK: D-014 & D-021 */}
              {/* D-021 Leading Machine */}
              <g
                className="cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => setSelectedVehicleId('DUMP-021')}
                transform="translate(790, 375) rotate(-65)"
              >
                <polygon fill="#00daf3" points="0,-9 6,9 0,5 -6,9" />
                <text fill="#dce2f7" fontFamily="JetBrains Mono" fontSize="9" fontWeight="700" x="8" y="2">
                  D-021
                </text>
                <text fill="#00daf3" fontFamily="JetBrains Mono" fontSize="8" x="8" y="10">
                  16 km/h (Loaded)
                </text>
              </g>

              {/* Proximity Vector Line between D-014 and D-021 (34m closing distance) */}
              <line stroke="#ef4444" strokeDasharray="4 2" strokeWidth="2.5" x1="770" x2="790" y1="410" y2="375" />
              {/* Proximity distance tag in SVG */}
              <rect fill="#690005" height="15" rx="2" width="46" x="735" y="386" />
              <text fill="#ffdad6" fontFamily="JetBrains Mono" fontSize="8" fontWeight="700" x="738" y="397">
                DIST: 34m
              </text>

              {/* D-014 Trail Deviation */}
              <path d="M 720,440 Q 755,425 770,410" fill="none" stroke="#ec4899" strokeDasharray="3 3" strokeWidth="2" />

              {/* D-014: CRITICAL CLOSE PROXIMITY + ROUTE DEVIATION */}
              <g
                className="cursor-pointer"
                onClick={() => setSelectedVehicleId('DUMP-014')}
                transform="translate(770, 410) rotate(-60)"
              >
                <circle className="animate-ping" cx="0" cy="0" fill="rgba(239, 68, 68, 0.25)" r="26" stroke="#ef4444" strokeWidth="2" />
                <circle cx="0" cy="0" fill="none" r="16" stroke="#ef4444" strokeWidth="1.5" />
                <polygon fill="#ef4444" points="0,-12 8,12 0,7 -8,12" />
              </g>
            </g>
          )}
        </svg>

        {/* Dynamic High-Precision Pegged Telemetry HUD Card for DUMP-014 */}
        {selectedVehicleId === 'DUMP-014' && (
          <div className="absolute left-[44%] lg:left-[52%] top-[30%] z-30 pointer-events-auto w-72 bg-surface-container-lowest/95 border-l-2 border-l-error p-space-sm rounded shadow-[0_4px_24px_rgba(0,0,0,0.8)] backdrop-blur border border-outline-variant/30">
            {/* Card Header */}
            <div className="flex items-center justify-between pb-space-xxs mb-space-xs bg-surface-container-low px-1.5 py-0.5 rounded">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-error animate-pulse" />
                <span className="font-mono-data-md text-mono-data-md text-error font-bold">DUMP-014</span>
                <span className="text-on-surface-variant font-mono-data-sm text-mono-data-sm">Komatsu 930E-5</span>
              </div>
              <span className="px-1 rounded bg-error-container text-on-error-container font-label-caps text-label-caps font-bold uppercase">
                CRIT HAZARD
              </span>
            </div>

            {/* Key-Value Telemetry Grid */}
            <div className="grid grid-cols-2 gap-x-2 gap-y-1 font-mono-data-sm text-mono-data-sm py-1">
              <div className="flex flex-col">
                <span className="text-outline text-label-caps font-label-caps">SPEED / CAP</span>
                <span className="text-error font-bold">
                  {livePositions['DUMP-014'] ? `${livePositions['DUMP-014'].speed_kmph.toFixed(1)} km/h` : '34 km/h'}{' '}
                  <span className="text-on-surface-variant text-[10px] font-normal">(&gt;20 cap)</span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-outline text-label-caps font-label-caps">PROXIMITY D-021</span>
                <span className="text-error font-bold">
                  34m <span className="text-on-surface-variant text-[10px] font-normal">(CLOSING)</span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-outline text-label-caps font-label-caps">PAYLOAD / TIRES</span>
                <span className="text-on-surface">
                  290t <span className="text-on-surface-variant text-[10px]">7.2 bar</span>
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-outline text-label-caps font-label-caps">HEADING / DRIFT</span>
                <span className="text-secondary">
                  214° SW <span className="text-error text-[10px]">±1.4m GNSS</span>
                </span>
              </div>
            </div>

            {/* Alert Callout */}
            <div className="mt-1 px-1.5 py-1 rounded bg-error/15 text-error font-mono-data-sm text-mono-data-sm flex items-center justify-between">
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px]">warning</span>
                <span>CLOSING VELOCITY: 18 km/h</span>
              </span>
              <span className="text-primary-fixed text-[10px]">VIS: 16m</span>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-1.5 mt-space-xs pt-space-xs bg-surface-container-low/60 p-1 rounded">
              <button
                onClick={handleEmergencyStop}
                className="flex-1 py-1 rounded bg-error text-on-error font-mono-data-sm text-mono-data-sm font-bold uppercase tracking-wider hover:brightness-110 active:scale-95 transition-all text-center"
                type="button"
              >
                E-STOP (AUTO)
              </button>
              <button
                onClick={() => setSelectedVehicleId(null)}
                className="px-2 py-1 rounded bg-surface-container text-on-surface hover:text-primary font-mono-data-sm text-mono-data-sm text-center"
                type="button"
              >
                CLOSE
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Map Status Ticker */}
      <div className="w-full bg-surface-container-low px-space-md py-1 flex items-center justify-between text-mono-data-sm font-mono-data-sm text-on-surface-variant border-t border-outline-variant/30">
        <div className="flex items-center gap-space-md">
          <span className="flex items-center gap-1">
            <span className="material-symbols-outlined text-[14px] text-primary">navigation</span>
            <span>GEOFENCE SECTOR 4B: SPEED ENFORCED 20 KM/H</span>
          </span>
          <span className="hidden sm:inline-block text-outline-variant">|</span>
          <span className="hidden sm:flex items-center gap-1 text-secondary">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary" />
            <span>2 ACTIVE INTERVENTIONS PENDING</span>
          </span>
        </div>
        <div className="flex items-center gap-space-sm font-label-caps text-label-caps">
          <span className="text-outline">COMPASS:</span>
          <span className="text-primary font-bold">GRID NORTH [N 0.0°]</span>
        </div>
      </div>
    </div>
  );
};
