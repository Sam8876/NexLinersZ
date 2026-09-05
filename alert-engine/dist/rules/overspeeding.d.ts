import { AlertRule } from './types.js';
export interface OverspeedingDetails {
    speed_kmph: number;
    speed_limit_kmph: number;
    delta_kmph: number;
    action: 'raise' | 'escalate' | 'update' | 'clear';
    assigned_route_id?: string;
}
export declare const checkOverspeeding: AlertRule;
