import { AlertEvent } from './types.js';

export function handleSosSignal(
  vehicleId: string,
  details?: Record<string, unknown>
): AlertEvent {
  return {
    vehicleId,
    type: 'sos',
    severity: 'critical',
    details: details ?? { trigger: 'in_cab_button_press' },
    raisedAt: new Date().toISOString(),
  };
}
