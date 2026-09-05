import { AlertEvent } from './types.js';
import { VehicleState } from '../types/index.js';
export declare const HEARTBEAT_TIMEOUT_MS: number;
export declare function checkSignalLost(fleet: Map<string, VehicleState>): AlertEvent[];
