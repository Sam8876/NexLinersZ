import { create } from 'zustand';
import { TelemetryPayload, AlertRecord } from '../types/index.js';

interface FleetState {
  livePositions: Record<string, TelemetryPayload>;
  selectedVehicleId: string | null;
  viewMode: 'map' | 'list';
  mapType: 'maplibre' | 'tactical';
  searchQuery: string;
  isDrawerOpen: boolean;
  isDetailDrawerOpen: boolean;
  isSettingsOpen: boolean;
  isAudioMuted: boolean;
  activeTab: string;
  speedLimitKmph: number;
  segmentLimits: Record<string, number>;
  layers: {
    haulRoutes: boolean;
    vehicles: boolean;
    collisionHeatmap: boolean;
    fogStations: boolean;
    geofences: boolean;
  };
  alerts: AlertRecord[];

  // Actions
  updateTelemetry: (payload: TelemetryPayload) => void;
  setSelectedVehicleId: (id: string | null) => void;
  setViewMode: (mode: 'map' | 'list') => void;
  setMapType: (type: 'maplibre' | 'tactical') => void;
  setSearchQuery: (query: string) => void;
  toggleDrawer: () => void;
  toggleDetailDrawer: (open?: boolean) => void;
  toggleSettings: (open?: boolean) => void;
  toggleAudioMute: () => void;
  setActiveTab: (tab: string) => void;
  updateSpeedLimits: (globalLimit: number, segments?: Record<string, number>) => void;
  toggleLayer: (layer: keyof FleetState['layers']) => void;
  acknowledgeAlert: (alertId: string) => void;
  resolveAlert: (alertId: string) => void;
  addAlert: (alert: AlertRecord) => void;
}

const INITIAL_ALERTS: AlertRecord[] = [
  {
    alert_id: 'alt-001',
    vehicle_id: 'DUMP-014',
    type: 'collision_close',
    severity: 'critical',
    status: 'raised',
    raised_at: new Date(Date.now() - 14000).toISOString(),
    details: {
      otherVehicleId: 'DUMP-021',
      distance_m: 34,
      threshold_m: 60,
      closingSpeedKmph: 18,
      location: 'Ramp 1 North',
      visibilityM: 16,
    },
  },
  {
    alert_id: 'alt-002',
    vehicle_id: 'DUMP-019',
    type: 'overspeeding',
    severity: 'critical',
    status: 'raised',
    raised_at: new Date(Date.now() - 68000).toISOString(),
    details: {
      speed_kmph: 42,
      speed_limit_kmph: 20,
      delta_kmph: 22,
      location: 'Crusher Inbound Ramp',
      wetCoeff: 0.42,
    },
  },
  {
    alert_id: 'alt-003',
    vehicle_id: 'DUMP-014',
    type: 'route_deviation',
    severity: 'medium',
    status: 'raised',
    raised_at: new Date(Date.now() - 165000).toISOString(),
    details: {
      deviation_m: 2.8,
      tolerance_m: 1.5,
      location: 'Sector 4B Overburden',
      radarStatus: 'berm_proximity_active',
    },
  },
  {
    alert_id: 'alt-004',
    vehicle_id: 'DUMP-007',
    type: 'unusual_halt',
    severity: 'medium',
    status: 'raised',
    raised_at: new Date(Date.now() - 252000).toISOString(),
    details: {
      haltDurationFormatted: '4m 12s',
      location: 'Switchback Bench 12',
      reason: 'LiDAR blinded by condensation alert',
    },
  },
  {
    alert_id: 'alt-005',
    vehicle_id: 'DUMP-031',
    type: 'signal_lost',
    severity: 'high',
    status: 'raised',
    raised_at: new Date(Date.now() - 442000).toISOString(),
    details: {
      packetLossMs: 1800,
      location: 'South Pit Sump',
      reason: 'V2X mesh radio handover failure at Repeater Tower 03',
    },
  },
];

export const useFleetStore = create<FleetState>((set) => ({
  livePositions: {},
  selectedVehicleId: 'DUMP-014',
  viewMode: 'map',
  mapType: 'maplibre', // MapLibre as first default per Section 8 step 2
  searchQuery: '',
  isDrawerOpen: true,
  isDetailDrawerOpen: false,
  isSettingsOpen: false,
  isAudioMuted: false,
  activeTab: 'fleet-overview',
  speedLimitKmph: 20.0,
  segmentLimits: {
    'ROUTE-RAMP-01': 20.0,
    'ROUTE-RAMP-02': 25.0,
    'ROUTE-SPUR-3B': 20.0,
  },
  layers: {
    haulRoutes: true,
    vehicles: true,
    collisionHeatmap: true,
    fogStations: true,
    geofences: true,
  },
  alerts: INITIAL_ALERTS,

  updateTelemetry: (payload) =>
    set((state) => ({
      livePositions: {
        ...state.livePositions,
        [payload.vehicleId]: payload,
      },
    })),

  setSelectedVehicleId: (id) =>
    set({
      selectedVehicleId: id,
      isDetailDrawerOpen: id !== null,
    }),

  setViewMode: (mode) => set({ viewMode: mode }),
  setMapType: (type) => set({ mapType: type }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
  toggleDetailDrawer: (open) =>
    set((state) => ({
      isDetailDrawerOpen: open !== undefined ? open : !state.isDetailDrawerOpen,
    })),
  toggleSettings: (open) =>
    set((state) => ({
      isSettingsOpen: open !== undefined ? open : !state.isSettingsOpen,
    })),
  toggleAudioMute: () => set((state) => ({ isAudioMuted: !state.isAudioMuted })),
  setActiveTab: (tab) => set({ activeTab: tab }),

  updateSpeedLimits: (globalLimit, segments) =>
    set((state) => ({
      speedLimitKmph: globalLimit,
      segmentLimits: segments || state.segmentLimits,
    })),

  toggleLayer: (layer) =>
    set((state) => ({
      layers: {
        ...state.layers,
        [layer]: !state.layers[layer],
      },
    })),

  acknowledgeAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.alert_id === alertId
          ? { ...a, status: 'acknowledged', acknowledged_at: new Date().toISOString() }
          : a
      ),
    })),

  resolveAlert: (alertId) =>
    set((state) => ({
      alerts: state.alerts.map((a) =>
        a.alert_id === alertId
          ? { ...a, status: 'resolved', resolved_at: new Date().toISOString() }
          : a
      ),
    })),

  addAlert: (alert) =>
    set((state) => ({
      alerts: [alert, ...state.alerts.filter((a) => a.alert_id !== alert.alert_id)],
    })),
}));
