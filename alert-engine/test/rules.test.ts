import { describe, it, expect } from 'vitest';
import { checkOverspeeding } from '../src/rules/overspeeding.js';
import {
  checkCollisionClose,
  calculateHaversineDistanceMeters,
} from '../src/rules/collisionClose.js';
import { handleSosSignal } from '../src/rules/sos.js';
import { TelemetryPayload, VehicleState } from '../src/types/index.js';

describe('Alert Engine Rule Modules', () => {
  const sampleTelemetry: TelemetryPayload = {
    vehicleId: 'DUMP-014',
    timestamp: '2026-09-05T10:15:30Z',
    position: { lat: 18.6521, lon: 81.2634, source: 'rtk_fixed' },
    speed_kmph: 22.4,
    heading_deg: 134,
    rtkStatus: 'fixed',
    connectivity: 'lte',
  };

  describe('Haversine Distance Algorithm', () => {
    it('returns 0 when coordinates are identical', () => {
      const dist = calculateHaversineDistanceMeters(18.6521, 81.2634, 18.6521, 81.2634);
      expect(dist).toBe(0);
    });

    it('accurately calculates distance between nearby points', () => {
      // 0.0001 deg latitude difference ~ 11.1 meters on Earth
      const dist = calculateHaversineDistanceMeters(18.6521, 81.2634, 18.6522, 81.2634);
      expect(dist).toBeGreaterThan(10.5);
      expect(dist).toBeLessThan(11.5);
    });
  });

  describe('Overspeeding Rule Evaluation & Severity Scaling', () => {
    it('scales severity to critical when speed exceeds limit by >= 15 km/h (e.g. DUMP-019)', () => {
      const fleet = new Map<string, VehicleState>();
      fleet.set('DUMP-019', {
        vehicleId: 'DUMP-019',
        lastTelemetry: { ...sampleTelemetry, vehicleId: 'DUMP-019' },
        lastReceivedAt: Date.now(),
        speedLimitKmph: 20.0,
      });

      const alerts = checkOverspeeding(fleet, {
        ...sampleTelemetry,
        vehicleId: 'DUMP-019',
        speed_kmph: 38.5,
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('overspeeding');
      expect(alerts[0].vehicleId).toBe('DUMP-019');
      expect(alerts[0].severity).toBe('critical'); // 38.5 - 20 = 18.5 km/h over limit
      expect((alerts[0].details as any).action).toBe('raise');
    });

    it('scales severity to high when speed exceeds limit by 8-15 km/h', () => {
      const fleet = new Map<string, VehicleState>();
      fleet.set('DUMP-014', {
        vehicleId: 'DUMP-014',
        lastTelemetry: sampleTelemetry,
        lastReceivedAt: Date.now(),
        speedLimitKmph: 20.0,
      });

      const alerts = checkOverspeeding(fleet, {
        ...sampleTelemetry,
        speed_kmph: 30.0, // Delta = 10 km/h
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('high');
      expect((alerts[0].details as any).action).toBe('raise');
    });

    it('scales severity to medium when speed exceeds limit by <= 8 km/h', () => {
      const fleet = new Map<string, VehicleState>();
      fleet.set('DUMP-014', {
        vehicleId: 'DUMP-014',
        lastTelemetry: sampleTelemetry,
        lastReceivedAt: Date.now(),
        speedLimitKmph: 20.0,
      });

      const alerts = checkOverspeeding(fleet, {
        ...sampleTelemetry,
        speed_kmph: 24.0, // Delta = 4 km/h
      });

      expect(alerts).toHaveLength(1);
      expect(alerts[0].severity).toBe('medium');
    });

    it('does not trigger overspeeding when within limits', () => {
      const fleet = new Map<string, VehicleState>();
      fleet.set('DUMP-014', {
        vehicleId: 'DUMP-014',
        lastTelemetry: sampleTelemetry,
        lastReceivedAt: Date.now(),
        speedLimitKmph: 25.0,
      });

      const alerts = checkOverspeeding(fleet, {
        ...sampleTelemetry,
        speed_kmph: 18.0,
      });

      expect(alerts).toHaveLength(0);
    });

    it('handles deduplication by setting action to update when already raised with same severity', () => {
      const fleet = new Map<string, VehicleState>();
      const activeAlerts = new Map();
      activeAlerts.set('overspeeding', {
        alertId: 'alt-existing-001',
        severity: 'critical',
        raisedAt: '2026-09-05T10:15:00Z',
      });

      fleet.set('DUMP-019', {
        vehicleId: 'DUMP-019',
        lastTelemetry: { ...sampleTelemetry, vehicleId: 'DUMP-019' },
        lastReceivedAt: Date.now(),
        speedLimitKmph: 20.0,
        activeAlerts,
      });

      const alerts = checkOverspeeding(fleet, {
        ...sampleTelemetry,
        vehicleId: 'DUMP-019',
        speed_kmph: 39.0, // Still critical
      });

      expect(alerts).toHaveLength(1);
      expect((alerts[0].details as any).action).toBe('update');
    });

    it('signals clear when vehicle decelerates back below safe speed limit', () => {
      const fleet = new Map<string, VehicleState>();
      const activeAlerts = new Map();
      activeAlerts.set('overspeeding', {
        alertId: 'alt-existing-001',
        severity: 'critical',
        raisedAt: '2026-09-05T10:15:00Z',
      });

      fleet.set('DUMP-019', {
        vehicleId: 'DUMP-019',
        lastTelemetry: { ...sampleTelemetry, vehicleId: 'DUMP-019' },
        lastReceivedAt: Date.now(),
        speedLimitKmph: 20.0,
        activeAlerts,
      });

      const alerts = checkOverspeeding(fleet, {
        ...sampleTelemetry,
        vehicleId: 'DUMP-019',
        speed_kmph: 18.0, // Back under 20.0 limit
      });

      expect(alerts).toHaveLength(1);
      expect((alerts[0].details as any).action).toBe('clear');
    });
  });

  describe('Collision Close Proximity & SOS Alerts', () => {
    it('detects collision close when distance between vehicles drops below threshold', () => {
      const fleet = new Map<string, VehicleState>();
      const otherTelemetry: TelemetryPayload = {
        vehicleId: 'DUMP-021',
        timestamp: '2026-09-05T10:15:29Z',
        position: { lat: 18.6522, lon: 81.2634, source: 'rtk_fixed' },
        speed_kmph: 16.0,
        heading_deg: 130,
        rtkStatus: 'fixed',
        connectivity: 'lte',
      };

      fleet.set('DUMP-021', {
        vehicleId: 'DUMP-021',
        lastTelemetry: otherTelemetry,
        lastReceivedAt: Date.now(),
      });

      const alerts = checkCollisionClose(fleet, sampleTelemetry);
      expect(alerts).toHaveLength(1);
      expect(alerts[0].type).toBe('collision_close');
      expect(alerts[0].vehicleId).toBe('DUMP-014');
      expect(alerts[0].details.otherVehicleId).toBe('DUMP-021');
    });

    it('creates critical alert on SOS signal', () => {
      const sosAlert = handleSosSignal('DUMP-014', { button: 'emergency_stop' });
      expect(sosAlert.type).toBe('sos');
      expect(sosAlert.severity).toBe('critical');
      expect(sosAlert.vehicleId).toBe('DUMP-014');
    });

    it('calculates road distance using OSRM / Mine Haul Road Network Graph', async () => {
      const { calculateRoadDistanceBetweenVehicles } = await import('../src/rules/osrmRouting.js');
      const { checkCollisionCloseAsync } = await import('../src/rules/collisionClose.js');

      const v1: TelemetryPayload = {
        vehicleId: 'DUMP-014',
        timestamp: '2026-09-05T10:15:30Z',
        position: { lat: 18.6521, lon: 81.2634, source: 'rtk_fixed' },
        speed_kmph: 22.4,
        heading_deg: 43,
        rtkStatus: 'fixed',
        connectivity: 'lte',
      };

      const v2: TelemetryPayload = {
        vehicleId: 'DUMP-021',
        timestamp: '2026-09-05T10:15:30Z',
        position: { lat: 18.6535, lon: 81.2648, source: 'rtk_fixed' },
        speed_kmph: 18.0,
        heading_deg: 43,
        rtkStatus: 'fixed',
        connectivity: 'lte',
      };

      const result = await calculateRoadDistanceBetweenVehicles(v1, v2);
      expect(result.distanceMeters).toBeGreaterThan(0);
      expect(['osrm_service', 'mine_road_graph', 'haversine_fallback']).toContain(result.source);

      const fleet = new Map<string, VehicleState>();
      fleet.set('DUMP-021', {
        vehicleId: 'DUMP-021',
        lastTelemetry: v2,
        lastReceivedAt: Date.now(),
      });

      const asyncAlerts = await checkCollisionCloseAsync(fleet, {
        ...v1,
        // Move v1 close to v2 along Ramp 1
        position: { lat: 18.6533, lon: 81.2646, source: 'rtk_fixed' },
      });

      expect(asyncAlerts.length).toBeGreaterThanOrEqual(1);
      expect(asyncAlerts[0].type).toBe('collision_close');
    });
  });
});
