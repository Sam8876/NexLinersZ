"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeTelemetry = writeTelemetry;
exports.flushTelemetry = flushTelemetry;
const influxdb_client_1 = require("@influxdata/influxdb-client");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const url = process.env.INFLUXDB_URL || '';
const token = process.env.INFLUXDB_TOKEN || '';
const org = process.env.INFLUXDB_ORG || 'nmdc-bailadila';
const bucket = process.env.INFLUXDB_BUCKET || 'telemetry';
let writeApi = null;
if (url && token) {
    try {
        const influxDB = new influxdb_client_1.InfluxDB({ url, token });
        writeApi = influxDB.getWriteApi(org, bucket, 'ms');
    }
    catch (err) {
        console.warn('[InfluxDB] Failed to initialize client:', err);
    }
}
else {
    console.info('[InfluxDB] Credentials not configured. Telemetry writes will run in mock mode.');
}
function writeTelemetry(telemetry) {
    if (!writeApi) {
        // In dev / mock mode, no-op or debug log
        return;
    }
    try {
        const point = new influxdb_client_1.Point('vehicle_telemetry')
            .tag('vehicleId', telemetry.vehicleId)
            .tag('positionSource', telemetry.position.source)
            .tag('connectivity', telemetry.connectivity)
            .floatField('lat', telemetry.position.lat)
            .floatField('lon', telemetry.position.lon)
            .floatField('speed_kmph', telemetry.speed_kmph)
            .floatField('heading_deg', telemetry.heading_deg)
            .timestamp(new Date(telemetry.timestamp));
        writeApi.writePoint(point);
    }
    catch (err) {
        console.error('[InfluxDB] Error writing point:', err);
    }
}
async function flushTelemetry() {
    if (writeApi) {
        await writeApi.flush();
    }
}
