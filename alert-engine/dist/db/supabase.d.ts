import { SupabaseClient } from '@supabase/supabase-js';
import { AlertRecord } from '../types/index.js';
export declare let supabase: SupabaseClient | null;
export declare function insertAlert(alert: Omit<AlertRecord, 'alert_id'>): Promise<AlertRecord | null>;
export declare function updateAlertDetails(alertId: string, details: Record<string, unknown>): Promise<AlertRecord | null>;
export declare function resolveAlert(alertId: string): Promise<AlertRecord | null>;
