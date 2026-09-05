import { useEffect, useRef } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { useFleetStore } from '../store/fleetStore.js';
import { TelemetryPayload } from '../types/index.js';

export function useLiveTelemetry() {
  const updateTelemetry = useFleetStore((s) => s.updateTelemetry);
  const clientRef = useRef<MqttClient | null>(null);

  useEffect(() => {
    const wsUrl = import.meta.env.VITE_MQTT_WS_URL || 'ws://localhost:8083';

    try {
      const client = mqtt.connect(wsUrl, {
        reconnectPeriod: 2000,
        connectTimeout: 5000,
      });
      clientRef.current = client;

      client.on('connect', () => {
        console.log(`[Dashboard Live Channel] Connected to MQTT over WSS at ${wsUrl}`);
        client.subscribe('mine/+/vehicle/+/telemetry', (err) => {
          if (err) {
            console.warn('[Dashboard Live Channel] Subscription error:', err);
          } else {
            console.log('[Dashboard Live Channel] Subscribed to live telemetry topic');
          }
        });
      });

      client.on('message', (_topic, payload) => {
        try {
          const data = JSON.parse(payload.toString()) as TelemetryPayload;
          if (data && data.vehicleId && data.position) {
            // Live position strictly un-cached: directly dispatched into ephemeral state
            updateTelemetry(data);
          }
        } catch (e) {
          // Ignore parse errors
        }
      });

      client.on('error', (err) => {
        // Suppress noisy console logs if local broker isn't running yet
        console.debug('[Dashboard Live Channel] MQTT connection status:', err.message);
      });

      return () => {
        client.end(true);
      };
    } catch (err) {
      console.warn('[Dashboard Live Channel] Failed to initialize MQTT client:', err);
    }
  }, [updateTelemetry]);
}
