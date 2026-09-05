import { InfluxDB, Point, WriteApi } from '@influxdata/influxdb-client';
import { TelemetryPayload } from '../types/index.js';
import dotenv from 'dotenv';

dotenv.config();

const url = process.env.INFLUXDB_URL || '';
const token = process.env.INFLUXDB_TOKEN || '';
const org = process.env.INFLUXDB_ORG || 'nmdc-bailadila';
const bucket = process.env.INFLUXDB_BUCKET || 'telemetry';

let writeApi: WriteApi | null = null;

if (url && token) {
  try {
    const influxDB = new InfluxDB({ url, token });
    writeApi = influxDB.getWriteApi(org, bucket, 'ms');
  } catch (err) {
    console.warn('[InfluxDB] Failed to initialize client:', err);
  }
} else {
  console.info('[InfluxDB] Credentials not configured. Telemetry writes will run in mock mode.');
}

export function writeTelemetry(telemetry: TelemetryPayload): void {
  if (!writeApi) {
    // In dev / mock mode, no-op or debug log
    return;
  }

  try {
    const point = new Point('vehicle_telemetry')
      .tag('vehicleId', telemetry.vehicleId)
      .tag('positionSource', telemetry.position.source)
      .tag('connectivity', telemetry.connectivity)
      .floatField('lat', telemetry.position.lat)
      .floatField('lon', telemetry.position.lon)
      .floatField('speed_kmph', telemetry.speed_kmph)
      .floatField('heading_deg', telemetry.heading_deg)
      .timestamp(new Date(telemetry.timestamp));

    writeApi.writePoint(point);
  } catch (err) {
    console.error('[InfluxDB] Error writing point:', err);
  }
}

export async function flushTelemetry(): Promise<void> {
  if (writeApi) {
    await writeApi.flush();
  }
}
