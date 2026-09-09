import net from 'net';
import http from 'http';
import aedesImport from 'aedes';
import { createWebSocketStream, WebSocketServer } from 'ws';
import dotenv from 'dotenv';
import { SIMULATED_VEHICLES } from './vehicles.js';
import { advanceVehicle } from './generator.js';

dotenv.config();

const tcpPort = parseInt(process.env.EMBEDDED_BROKER_TCP_PORT || '1883', 10);
const wsPort = parseInt(process.env.EMBEDDED_BROKER_WS_PORT || '8083', 10);
const siteId = process.env.MINE_SITE_ID || 'bailadila';
const intervalMs = parseInt(process.env.PUBLISH_INTERVAL_MS || '1000', 10);

const aedes = typeof (aedesImport as any) === 'function' ? (aedesImport as any)() : new (aedesImport as any)();

// 1. TCP Broker (for backend alert-engine and standalone MQTT clients)
const tcpServer = net.createServer(aedes.handle);
tcpServer.listen(tcpPort, () => {
  console.log(`[Aedes Broker] TCP server listening on port ${tcpPort}`);
});

// 2. WebSocket Server (for browser dashboard live position stream)
const httpServer = http.createServer();
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  const stream = createWebSocketStream(ws);
  aedes.handle(stream);
});

httpServer.listen(wsPort, () => {
  console.log(`[Aedes Broker] WebSocket server listening on port ${wsPort} (ws://localhost:${wsPort})`);
});

aedes.on('client', (client: any) => {
  console.log(`[Aedes Broker] Client connected: ${client ? client.id : 'unknown'}`);
});

console.log('===========================================================');
console.log('NMDC Bailadila Fog-Safe Haulage - Unified Broker & Simulator');
console.log(`TCP Port: ${tcpPort} | WebSocket Port: ${wsPort}`);
console.log(`Simulating ${SIMULATED_VEHICLES.length} haul vehicles at ${intervalMs}ms interval...`);
console.log('===========================================================');

// 3. Publish synthetic telemetry directly into Aedes broker
setInterval(() => {
  for (const vehicle of SIMULATED_VEHICLES) {
    const telemetry = advanceVehicle(vehicle, intervalMs / 1000);
    const topic = `mine/${siteId}/vehicle/${vehicle.vehicleId}/telemetry`;

    aedes.publish(
      {
        cmd: 'publish',
        qos: 0,
        dup: false,
        retain: false,
        topic,
        payload: Buffer.from(JSON.stringify(telemetry)),
      },
      (err: any) => {
        if (err) {
          console.error(`[Simulator] Publish error on ${topic}:`, err.message);
        }
      }
    );
  }
}, intervalMs);
