import React from 'react';
import { useFleetStore } from '../store/fleetStore.js';
import { AlertRecord } from '../types/index.js';

export const AlertsPanel: React.FC = () => {
  const alerts = useFleetStore((s) => s.alerts);
  const acknowledgeAlert = useFleetStore((s) => s.acknowledgeAlert);
  const resolveAlert = useFleetStore((s) => s.resolveAlert);
  const isAudioMuted = useFleetStore((s) => s.isAudioMuted);
  const toggleAudioMute = useFleetStore((s) => s.toggleAudioMute);
  const searchQuery = useFleetStore((s) => s.searchQuery.toUpperCase());
  const setSelectedVehicleId = useFleetStore((s) => s.setSelectedVehicleId);

  const filteredAlerts = alerts.filter(
    (a) =>
      !searchQuery ||
      a.vehicle_id.toUpperCase().includes(searchQuery) ||
      a.type.toUpperCase().includes(searchQuery)
  );

  const critCount = alerts.filter((a) => a.severity === 'critical' && a.status === 'raised').length;
  const warnCount = alerts.filter(
    (a) => (a.severity === 'high' || a.severity === 'medium') && a.status === 'raised'
  ).length;

  const renderAlertCard = (alert: AlertRecord) => {
    const isAcknowledged = alert.status === 'acknowledged';
    const isResolved = alert.status === 'resolved';

    let borderLeftColor = 'border-l-outline';
    let badgeBg = 'bg-surface-container';
    let badgeText = 'text-on-surface-variant';
    let typeTitle = alert.type.replace('_', ' ').toUpperCase();
    let titleColor = 'text-on-surface';

    if (alert.severity === 'critical' || alert.type === 'sos' || alert.type === 'collision_close') {
      borderLeftColor = 'border-l-error';
      badgeBg = 'bg-error';
      badgeText = 'text-on-error';
      titleColor = 'text-error';
    } else if (alert.type === 'overspeeding') {
      borderLeftColor = 'border-l-secondary-container';
      badgeBg = 'bg-secondary-container';
      badgeText = 'text-on-secondary-container';
      titleColor = 'text-secondary';
    } else if (alert.type === 'route_deviation') {
      borderLeftColor = 'border-l-tertiary-fixed-dim';
      badgeBg = 'bg-on-tertiary-fixed-variant';
      badgeText = 'text-tertiary';
      titleColor = 'text-tertiary-fixed-dim';
    } else if (alert.type === 'unusual_halt') {
      borderLeftColor = 'border-l-secondary';
      badgeBg = 'bg-surface-container';
      badgeText = 'text-secondary';
      titleColor = 'text-secondary';
    }

    return (
      <div
        key={alert.alert_id}
        className={`p-space-sm rounded bg-surface-container-lowest border-l-4 ${borderLeftColor} shadow-sm flex flex-col gap-space-xs transition-all ${
          isResolved ? 'opacity-40' : isAcknowledged ? 'opacity-70' : 'opacity-100'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span
              className={`px-1 rounded ${badgeBg} ${badgeText} font-label-caps text-label-caps font-bold uppercase`}
            >
              {alert.severity}
            </span>
            <span className={`font-mono-data-md text-mono-data-md ${titleColor} font-bold`}>
              {typeTitle}
            </span>
          </div>
          <span className="font-mono-data-sm text-mono-data-sm text-outline">
            {isAcknowledged ? 'ACKNOWLEDGED' : isResolved ? 'RESOLVED' : 'ACTIVE'}
          </span>
        </div>

        <div
          className="font-mono-data-sm text-mono-data-sm text-on-surface cursor-pointer hover:underline"
          onClick={() => setSelectedVehicleId(alert.vehicle_id)}
        >
          <span className="text-primary font-bold">{alert.vehicle_id}</span>
          {alert.details?.otherVehicleId && (
            <>
              {' '}↔{' '}
              <span className="text-primary font-bold">{alert.details.otherVehicleId}</span>
            </>
          )}
          {alert.details?.location && ` (${alert.details.location})`}
        </div>

        <p className="font-body-sm text-body-sm text-on-surface-variant">
          {alert.type === 'collision_close' && (
            <>
              Inter-vehicle clearance <span className="text-error font-bold">{alert.details?.distance_m ?? 34}m</span> (Threshold: 60m). Relative closing speed 18 km/h in 16m visibility.
            </>
          )}
          {alert.type === 'overspeeding' && (
            <>
              <span className="text-secondary font-bold">{alert.details?.speed_kmph ?? 42} km/h recorded</span> (Speed cap during Level 3 Fog: {alert.details?.speed_limit_kmph ?? 20} km/h).
            </>
          )}
          {alert.type === 'route_deviation' && (
            <>
              Machine centerline <span className="text-tertiary font-bold">{alert.details?.deviation_m ?? 2.8}m</span> outside designated haul corridor. Berm proximity radar active.
            </>
          )}
          {alert.type === 'unusual_halt' && (
            <>
              Zero velocity for <span className="text-secondary font-semibold">{alert.details?.haltDurationFormatted ?? '4m 12s'}</span> without scheduled dwell. LiDAR condensation alert.
            </>
          )}
          {alert.type === 'signal_lost' && (
            <>
              Telemetry packet loss &gt; 1800ms. V2X mesh radio handover failure at Repeater Tower 03.
            </>
          )}
          {alert.type === 'sos' && (
            <span className="text-error font-bold">
              {alert.details?.message || 'EMERGENCY SOS SIGNAL RECEIVED FROM OPERATOR CAB.'}
            </span>
          )}
        </p>

        {/* Action buttons */}
        <div className="flex items-center gap-space-xs pt-1 mt-1">
          {alert.type === 'collision_close' && (
            <button
              onClick={() => resolveAlert(alert.alert_id)}
              className="flex-1 py-1 rounded bg-error text-on-error font-mono-data-sm text-mono-data-sm font-bold hover:brightness-110 active:scale-95 transition-all text-center"
              type="button"
            >
              AUTO-STOP COMMAND
            </button>
          )}
          {alert.type === 'overspeeding' && (
            <button
              onClick={() => resolveAlert(alert.alert_id)}
              className="flex-1 py-1 rounded bg-secondary-container text-on-secondary-container font-mono-data-sm text-mono-data-sm font-bold hover:brightness-110 active:scale-95 transition-all text-center"
              type="button"
            >
              THROTTLE GOVERNOR
            </button>
          )}
          {alert.type === 'route_deviation' && (
            <button
              onClick={() => resolveAlert(alert.alert_id)}
              className="flex-1 py-1 rounded bg-surface-container-highest text-tertiary-fixed font-mono-data-sm text-mono-data-sm font-bold hover:bg-surface-bright transition-colors text-center"
              type="button"
            >
              RE-ROUTE BEACON
            </button>
          )}
          {alert.type === 'unusual_halt' && (
            <button
              onClick={() => resolveAlert(alert.alert_id)}
              className="flex-1 py-1 rounded bg-surface-container-highest text-secondary-fixed font-mono-data-sm text-mono-data-sm font-bold hover:bg-surface-bright transition-colors text-center"
              type="button"
            >
              PING OPERATOR CAB
            </button>
          )}
          {alert.type === 'signal_lost' && (
            <button
              onClick={() => resolveAlert(alert.alert_id)}
              className="flex-1 py-1 rounded bg-surface-container text-on-surface font-mono-data-sm text-mono-data-sm font-semibold hover:bg-surface-bright transition-colors text-center"
              type="button"
            >
              DIAGNOSTIC TRACE
            </button>
          )}
          {alert.type === 'sos' && (
            <button
              onClick={() => resolveAlert(alert.alert_id)}
              className="flex-1 py-1 rounded bg-error text-on-error font-mono-data-sm text-mono-data-sm font-bold hover:brightness-110 active:scale-95 transition-all text-center"
              type="button"
            >
              DISPATCH RESCUE
            </button>
          )}

          <button
            onClick={() => acknowledgeAlert(alert.alert_id)}
            className={`px-space-sm py-1 rounded font-mono-data-sm text-mono-data-sm transition-colors ${
              isAcknowledged
                ? 'bg-primary/20 text-primary'
                : 'bg-surface-container text-on-surface hover:text-primary'
            }`}
            type="button"
          >
            {isAcknowledged ? 'ACKED' : 'ACK'}
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full lg:w-[380px] shrink-0 flex flex-col bg-surface-container-low rounded overflow-hidden border border-outline-variant/30">
      {/* Panel Header */}
      <div className="p-space-sm bg-surface-container-lowest flex items-center justify-between border-b border-outline-variant/30">
        <div className="flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-error text-[18px]">crisis_alert</span>
          <div className="flex flex-col">
            <span className="font-headline-md text-headline-md text-on-surface font-bold leading-tight">
              LIVE ALERTS
            </span>
            <span className="font-label-caps text-label-caps text-on-surface-variant">
              {filteredAlerts.length} ACTIVE INCIDENTS DETECTED
            </span>
          </div>
        </div>

        {/* Status Pill Badges */}
        <div className="flex items-center gap-1">
          <span className="px-1.5 py-0.5 rounded bg-error text-on-error font-mono-data-sm text-mono-data-sm font-bold">
            {critCount} CRIT
          </span>
          <span className="px-1.5 py-0.5 rounded bg-secondary-container text-on-secondary-container font-mono-data-sm text-mono-data-sm font-bold">
            {warnCount} WARN
          </span>
          <button
            onClick={toggleAudioMute}
            className="p-1 rounded bg-surface-container hover:bg-surface-container-high text-on-surface-variant hover:text-on-surface transition-colors"
            title="Toggle Feed Tone"
            type="button"
          >
            <span className="material-symbols-outlined text-[14px]">
              {isAudioMuted ? 'volume_off' : 'volume_up'}
            </span>
          </button>
        </div>
      </div>

      {/* Scrollable Incident Card Stream */}
      <div className="flex-1 p-space-sm space-y-space-sm overflow-y-auto max-h-[580px] lg:max-h-[640px]">
        {filteredAlerts.map(renderAlertCard)}
      </div>

      {/* Footer */}
      <div className="p-space-xs px-space-sm bg-surface-container-lowest flex items-center justify-between text-mono-data-sm font-mono-data-sm text-outline border-t border-outline-variant/30">
        <span className="flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
          <span>HAZARD AUDIO SYNTH: {isAudioMuted ? 'MUTED' : 'ACTIVE'}</span>
        </span>
        <button
          onClick={() => useFleetStore.getState().setSearchQuery('')}
          className="text-primary hover:underline text-[11px]"
          type="button"
        >
          RESET ALL FILTERS
        </button>
      </div>
    </div>
  );
};
