import mqtt from 'mqtt';
import dotenv from 'dotenv';
import { SIMULATED_VEHICLES } from './vehicles.js';
import { advanceVehicle } from './generator.js';

dotenv.config();

const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const siteId = process.env.MINE_SITE_ID || 'bailadila';
const intervalMs = parseInt(process.env.PUBLISH_INTERVAL_MS || '1000', 10);

console.log('===========================================================');
console.log('NMDC Bailadila Fog-Safe Haulage - Mock Telemetry Simulator');
console.log(`Broker URL: ${brokerUrl}`);
console.log(`Site ID: ${siteId}`);
console.log(`Simulating ${SIMULATED_VEHICLES.length} haul vehicles at ${intervalMs}ms interval...`);
console.log('===========================================================');

const client = mqtt.connect(brokerUrl);

client.on('connect', () => {
  console.log(`[Simulator] Connected to MQTT broker: ${brokerUrl}`);

  setInterval(() => {
    for (const vehicle of SIMULATED_VEHICLES) {
      const telemetry = advanceVehicle(vehicle, intervalMs / 1000);
      const topic = `mine/${siteId}/vehicle/${vehicle.vehicleId}/telemetry`;

      client.publish(topic, JSON.stringify(telemetry), { qos: 0 });

      console.log(
        `[${telemetry.timestamp}] ${telemetry.vehicleId.padEnd(8)} | ` +
        `pos: (${telemetry.position.lat.toFixed(4)}, ${telemetry.position.lon.toFixed(4)}) | ` +
        `spd: ${telemetry.speed_kmph.toString().padStart(4)} km/h | ` +
        `hdg: ${telemetry.heading_deg.toString().padStart(3)}° | ` +
        `rtk: ${telemetry.rtkStatus} | conn: ${telemetry.connectivity}`
      );
    }
  }, intervalMs);
});

client.on('error', (err) => {
  console.error('[Simulator] Connection error:', err.message);
});
