import { TelemetryPayload } from '../types/index.js';
export declare function writeTelemetry(telemetry: TelemetryPayload): void;
export declare function flushTelemetry(): Promise<void>;
