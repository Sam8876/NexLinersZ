import React from 'react';
import { Header } from './components/Header.js';
import { SectorNavigator } from './components/SectorNavigator.js';
import { TopToolbar } from './components/TopToolbar.js';
import { DigitalTwinMap } from './components/DigitalTwinMap.js';
import { MapLibreView } from './components/MapLibreView.js';
import { CompactListView } from './components/CompactListView.js';
import { AlertsPanel } from './components/AlertsPanel.js';
import { AiAnalyticsDrawer } from './components/AiAnalyticsDrawer.js';
import { VehicleDetailDrawer } from './components/VehicleDetailDrawer.js';
import { OperationalSettingsModal } from './components/OperationalSettingsModal.js';
import { useFleetStore } from './store/fleetStore.js';
import { useLiveTelemetry } from './hooks/useLiveTelemetry.js';
import { useAlertsStream } from './hooks/useAlertsStream.js';

export const App: React.FC = () => {
  // Activate independent live real-time streams
  useLiveTelemetry();
  useAlertsStream();

  const viewMode = useFleetStore((s) => s.viewMode);
  const mapType = useFleetStore((s) => s.mapType);
  const alerts = useFleetStore((s) => s.alerts);
  const resolveAlert = useFleetStore((s) => s.resolveAlert);

  // Check for active critical SOS alert for full-screen takeover override
  const activeSos = alerts.find(
    (a) => a.type === 'sos' && a.status === 'raised' && a.vehicle_id !== 'FLEET-BROADCAST'
  );

  return (
    <div className="min-h-screen bg-background text-on-surface flex flex-col antialiased">
      {/* FULL SCREEN SOS OVERRIDE MODAL (PROJECT_PLAN.md Section 5) */}
      {activeSos && (
        <div className="fixed inset-0 z-[100] bg-error/95 text-on-error flex flex-col items-center justify-center p-8 backdrop-blur-lg animate-pulse">
          <div className="max-w-2xl w-full bg-surface-container-lowest text-on-surface p-8 rounded-lg border-4 border-error shadow-[0_0_80px_rgba(239,68,68,0.8)] flex flex-col items-center text-center">
            <span className="material-symbols-outlined text-error text-[64px] mb-2">emergency</span>
            <span className="font-display-hud text-display-hud text-error">CRITICAL SOS ALERT</span>
            <p className="font-mono-data-lg text-mono-data-lg text-primary mt-2">
              VEHICLE: {activeSos.vehicle_id}
            </p>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2 max-w-lg">
              Manual in-cab operator emergency push button triggered. Autonomous fleet slow-down protocol engaged across Sector 04.
            </p>
            <div className="flex gap-4 mt-6 w-full max-w-md">
              <button
                onClick={() => resolveAlert(activeSos.alert_id)}
                className="flex-1 py-3 rounded bg-error text-on-error font-mono-data-md text-mono-data-md font-bold uppercase hover:brightness-110 active:scale-95 transition-all"
                type="button"
              >
                DISPATCH RESCUE &amp; ACKNOWLEDGE
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Control Room Top Header */}
      <Header />

      {/* Left Sector Navigator Sidebar */}
      <SectorNavigator />

      {/* Main Content Area (offset by left sidebar w-64 and header top-25) */}
      <div className="pl-64 flex-1 flex flex-col pt-25 min-h-screen">
        <main className="flex-1 flex flex-col w-full">
          {/* Top Control Strip */}
          <TopToolbar />

          {/* Main Operational Stage: Map/List + Alerts Panel */}
          <div className="flex flex-col lg:flex-row w-full flex-1 gap-gutter-panel p-gutter-screen">
            {viewMode === 'list' ? (
              <CompactListView />
            ) : mapType === 'maplibre' ? (
              <MapLibreView />
            ) : (
              <DigitalTwinMap />
            )}

            {/* Right Live Safety Alerts Feed */}
            <AlertsPanel />
          </div>

          {/* Collapsible Bottom Drawer: AI Analytics & Fog Risk Model */}
          <AiAnalyticsDrawer />
        </main>
      </div>

      {/* Slide-Over Vehicle Detail Inspector (PROJECT_PLAN.md Step 5) */}
      <VehicleDetailDrawer />

      {/* Operational Settings & Speed Limit Governance Modal */}
      <OperationalSettingsModal />
    </div>
  );
};

export default App;
