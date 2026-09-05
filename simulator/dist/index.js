"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mqtt_1 = __importDefault(require("mqtt"));
const dotenv_1 = __importDefault(require("dotenv"));
const vehicles_js_1 = require("./vehicles.js");
const generator_js_1 = require("./generator.js");
dotenv_1.default.config();
const brokerUrl = process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883';
const siteId = process.env.MINE_SITE_ID || 'bailadila';
const intervalMs = parseInt(process.env.PUBLISH_INTERVAL_MS || '1000', 10);
console.log('===========================================================');
console.log('NMDC Bailadila Fog-Safe Haulage - Mock Telemetry Simulator');
console.log(`Broker URL: ${brokerUrl}`);
console.log(`Site ID: ${siteId}`);
console.log(`Simulating ${vehicles_js_1.SIMULATED_VEHICLES.length} haul vehicles at ${intervalMs}ms interval...`);
console.log('===========================================================');
const client = mqtt_1.default.connect(brokerUrl);
client.on('connect', () => {
    console.log(`[Simulator] Connected to MQTT broker: ${brokerUrl}`);
    setInterval(() => {
        for (const vehicle of vehicles_js_1.SIMULATED_VEHICLES) {
            const telemetry = (0, generator_js_1.advanceVehicle)(vehicle, intervalMs / 1000);
            const topic = `mine/${siteId}/vehicle/${vehicle.vehicleId}/telemetry`;
            client.publish(topic, JSON.stringify(telemetry), { qos: 0 });
            console.log(`[${telemetry.timestamp}] ${telemetry.vehicleId.padEnd(8)} | ` +
                `pos: (${telemetry.position.lat.toFixed(4)}, ${telemetry.position.lon.toFixed(4)}) | ` +
                `spd: ${telemetry.speed_kmph.toString().padStart(4)} km/h | ` +
                `hdg: ${telemetry.heading_deg.toString().padStart(3)}° | ` +
                `rtk: ${telemetry.rtkStatus} | conn: ${telemetry.connectivity}`);
        }
    }, intervalMs);
});
client.on('error', (err) => {
    console.error('[Simulator] Connection error:', err.message);
});
