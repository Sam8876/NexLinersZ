"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(require("net"));
const http_1 = __importDefault(require("http"));
const aedes_1 = __importDefault(require("aedes"));
const ws_1 = require("ws");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const tcpPort = parseInt(process.env.EMBEDDED_BROKER_TCP_PORT || '1883', 10);
const wsPort = parseInt(process.env.EMBEDDED_BROKER_WS_PORT || '8083', 10);
const aedes = typeof aedes_1.default === 'function' ? aedes_1.default() : new aedes_1.default();
// TCP Broker (for alert-engine and backend MQTT clients)
const tcpServer = net_1.default.createServer(aedes.handle);
tcpServer.listen(tcpPort, () => {
    console.log(`[Aedes Broker] TCP server listening on port ${tcpPort}`);
});
// WebSocket Server (for browser dashboard live position stream)
const httpServer = http_1.default.createServer();
const wss = new ws_1.WebSocketServer({ server: httpServer });
wss.on('connection', (ws) => {
    const stream = (0, ws_1.createWebSocketStream)(ws);
    aedes.handle(stream);
});
httpServer.listen(wsPort, () => {
    console.log(`[Aedes Broker] WebSocket server listening on port ${wsPort} (ws://localhost:${wsPort})`);
});
aedes.on('client', (client) => {
    console.log(`[Aedes Broker] Client connected: ${client ? client.id : 'unknown'}`);
});
aedes.on('clientDisconnect', (client) => {
    console.log(`[Aedes Broker] Client disconnected: ${client ? client.id : 'unknown'}`);
});
