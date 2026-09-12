import React, { useState, useEffect } from 'react';
import { useFleetStore } from '../store/fleetStore.js';

export const Header: React.FC = () => {
  const isAudioMuted = useFleetStore((s) => s.isAudioMuted);
  const toggleAudioMute = useFleetStore((s) => s.toggleAudioMute);
  const activeTab = useFleetStore((s) => s.activeTab);
  const setActiveTab = useFleetStore((s) => s.setActiveTab);
  const toggleSettings = useFleetStore((s) => s.toggleSettings);

  const [utcTime, setUtcTime] = useState('');
  const [localTime, setLocalTime] = useState('');

  useEffect(() => {
    const updateClocks = () => {
      const now = new Date();
      setUtcTime(now.toUTCString().slice(17, 25) + ' UTC');
      setLocalTime(now.toLocaleTimeString('en-US', { hour12: false }) + ' IST');
    };
    updateClocks();
    const timer = setInterval(updateClocks, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="fixed top-0 left-0 w-full z-50 bg-surface-container-lowest border-b border-outline-variant/30 shadow-[0_1px_8px_rgba(0,0,0,0.5)]">
      {/* Top Navbar */}
      <div className="h-16 px-gutter-screen flex items-center justify-between gap-space-md">
        {/* Left: Brand / Logo */}
        <div className="flex items-center gap-space-md shrink-0">
          <div className="w-8 h-8 rounded bg-primary-container/20 border border-primary-container flex items-center justify-center text-primary font-bold">
            <span className="material-symbols-outlined text-[20px] text-primary">radar</span>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-space-xs">
              <span className="font-label-caps text-label-caps tracking-widest text-primary font-bold">
                MINEGUARD // PIT CONTROL NOC
              </span>
              <span className="font-mono-data-sm text-mono-data-sm px-space-xxs py-0.5 rounded bg-surface-container-highest text-primary-fixed font-semibold">
                v4.8.2-LIVE
              </span>
            </div>
            <div className="flex items-center gap-space-xs text-on-surface-variant">
              <span className="material-symbols-outlined text-[13px]">corporate_fare</span>
              <select
                aria-label="Mine Sector Selector"
                className="bg-surface-container-low border border-outline-variant/50 text-on-surface font-mono-data-sm text-mono-data-sm px-space-xs py-0.5 rounded cursor-pointer focus:outline-none focus:border-primary-container"
                value={useFleetStore((s) => s.selectedSector)}
                onChange={(e) => useFleetStore.getState().setSelectedSector(e.target.value)}
              >
                <option value="NMDC Bailadila - Dep 14 (Kirandul)">NMDC Bailadila - Dep 14 (Kirandul)</option>
                <option value="NMDC Bailadila - Dep 11 (Bacheli)">NMDC Bailadila - Dep 11 (Bacheli)</option>
                <option value="Pilbara Zone 4 - Sector North Pit">Pilbara Zone 4 - Sector North Pit</option>
              </select>
            </div>
          </div>
        </div>

        {/* Center: Live Status Telemetry Pills */}
        <div className="hidden xl:flex items-center gap-space-xs shrink-0 overflow-x-auto">
          <div className="flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container-low border border-outline-variant/40">
            <span className="w-2 h-2 rounded-full bg-primary-container animate-pulse" />
            <span className="font-mono-data-sm text-mono-data-sm text-primary font-medium tracking-tight">
              OPERATIONAL [GNSS-RTK LOCK 99.98%]
            </span>
          </div>
          <div className="flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container-low border border-secondary-container/50">
            <span className="w-2 h-2 rounded-full bg-secondary-container animate-ping" />
            <span className="font-mono-data-sm text-mono-data-sm text-secondary font-medium tracking-tight">
              VISIBILITY: 18m [DENSE FOG PROTOCOL LVL 3 ACTIVE]
            </span>
          </div>
          <div className="flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container-low border border-outline-variant/40">
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">local_shipping</span>
            <span className="font-mono-data-sm text-mono-data-sm text-on-surface font-medium">
              26/28 ACTIVE (2 MAINT)
            </span>
          </div>
          <div className="flex items-center gap-space-xs px-space-sm py-1 rounded bg-surface-container-low border border-outline-variant/40">
            <span className="material-symbols-outlined text-[14px] text-on-surface-variant">air</span>
            <span className="font-mono-data-sm text-mono-data-sm text-on-surface-variant">
              TEMP: 14°C | HUM: 98% | WIND: 3 KT NW
            </span>
          </div>
        </div>

        {/* Right: Realtime Clocks, Controls & Operator */}
        <div className="flex items-center gap-space-md shrink-0">
          <div className="hidden md:flex flex-col text-right">
            <span className="font-mono-data-md text-mono-data-md text-primary font-bold tracking-tight">
              {utcTime || '03:42:19 UTC'}
            </span>
            <span className="font-mono-data-sm text-mono-data-sm text-on-surface-variant">
              {localTime || '09:12:19 IST'}
            </span>
          </div>

          <div className="flex items-center gap-space-xs text-on-surface-variant">
            <button
              onClick={toggleAudioMute}
              className={`w-7 h-7 flex items-center justify-center rounded transition-colors ${
                isAudioMuted
                  ? 'bg-error/20 text-error'
                  : 'bg-surface-container-low hover:bg-surface-container-high hover:text-on-surface'
              }`}
              title={isAudioMuted ? 'Unmute Audio Alerts' : 'Mute Audio Alerts'}
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">
                {isAudioMuted ? 'volume_off' : 'volume_up'}
              </span>
            </button>
            <button
              onClick={() => {
                if (!document.fullscreenElement) {
                  document.documentElement.requestFullscreen().catch(() => {});
                } else {
                  document.exitFullscreen().catch(() => {});
                }
              }}
              className="w-7 h-7 flex items-center justify-center rounded bg-surface-container-low hover:bg-surface-container-high hover:text-on-surface transition-colors"
              title="Toggle Fullscreen"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">fullscreen</span>
            </button>
            <button
              onClick={() => toggleSettings(true)}
              className="w-7 h-7 flex items-center justify-center rounded bg-surface-container-low hover:bg-surface-container-high hover:text-primary transition-colors"
              title="Operational Speed & Distance Parameters"
              type="button"
            >
              <span className="material-symbols-outlined text-[16px]">tune</span>
            </button>
          </div>

          {/* Dispatcher Profile */}
          <div className="flex items-center gap-space-xs pl-space-xs border-l border-outline-variant/40">
            <div className="relative">
              <div className="w-8 h-8 rounded-full bg-surface-container-highest border border-outline-variant flex items-center justify-center text-primary font-bold text-xs">
                MV
              </div>
              <span className="absolute bottom-0 right-0 w-2 h-2 rounded-full bg-primary-container ring-1 ring-surface-container-lowest" />
            </div>
            <div className="hidden 2xl:flex flex-col">
              <span className="font-mono-data-sm text-mono-data-sm text-on-surface font-semibold leading-tight">
                Marcus Vance
              </span>
              <span className="font-label-caps text-label-caps text-on-surface-variant leading-tight">
                Senior Shift Dispatcher - Night Lead
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom border line */}
    </header>
  );
};
