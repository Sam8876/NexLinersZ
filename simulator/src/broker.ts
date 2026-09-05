import net from 'net';
import http from 'http';
import aedesImport from 'aedes';
import { createWebSocketStream, WebSocketServer } from 'ws';
import dotenv from 'dotenv';

dotenv.config();

const tcpPort = parseInt(process.env.EMBEDDED_BROKER_TCP_PORT || '1883', 10);
const wsPort = parseInt(process.env.EMBEDDED_BROKER_WS_PORT || '8083', 10);

const aedes = typeof (aedesImport as any) === 'function' ? (aedesImport as any)() : new (aedesImport as any)();

// TCP Broker (for alert-engine and backend MQTT clients)
const tcpServer = net.createServer(aedes.handle);
tcpServer.listen(tcpPort, () => {
  console.log(`[Aedes Broker] TCP server listening on port ${tcpPort}`);
});

// WebSocket Server (for browser dashboard live position stream)
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

aedes.on('clientDisconnect', (client: any) => {
  console.log(`[Aedes Broker] Client disconnected: ${client ? client.id : 'unknown'}`);
});
