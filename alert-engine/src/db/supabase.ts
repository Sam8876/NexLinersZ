import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { AlertRecord } from '../types/index.js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';

export let supabase: SupabaseClient | null = null;

// In-memory mock alert storage for local testing when Supabase credentials are not supplied
const mockAlertsTable = new Map<string, AlertRecord>();

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey);
    console.log('[Supabase] Client initialized successfully for live alerts table.');
  } catch (err) {
    console.warn('[Supabase] Failed to initialize client:', err);
  }
} else {
  console.info('[Supabase] Live credentials not set in .env. Running with verified in-memory mock alerts table.');
}

export async function insertAlert(alert: Omit<AlertRecord, 'alert_id'>): Promise<AlertRecord | null> {
  if (!supabase) {
    const alertId = 'alt-mock-' + Math.random().toString(36).substring(2, 9);
    const record: AlertRecord = {
      alert_id: alertId,
      ...alert,
    };
    mockAlertsTable.set(alertId, record);
    console.log(`[Supabase Mock] Inserted alert row [${record.alert_id}] vehicle: ${record.vehicle_id} type: ${record.type} severity: ${record.severity}`);
    return record;
  }

  try {
    const { data, error } = await supabase
      .from('alerts')
      .insert([alert])
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Insert error:', error);
      return null;
    }

    console.log(`[Supabase Live] Inserted alert row [${data.alert_id}] vehicle: ${data.vehicle_id} type: ${data.type}`);
    return data as AlertRecord;
  } catch (err) {
    console.error('[Supabase] Exception writing alert:', err);
    return null;
  }
}

export async function updateAlertDetails(
  alertId: string,
  details: Record<string, unknown>
): Promise<AlertRecord | null> {
  if (!supabase) {
    const record = mockAlertsTable.get(alertId);
    if (record) {
      record.details = { ...record.details, ...details };
      return record;
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('alerts')
      .update({ details })
      .eq('alert_id', alertId)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Update error:', error);
      return null;
    }

    return data as AlertRecord;
  } catch (err) {
    console.error('[Supabase] Exception updating alert:', err);
    return null;
  }
}

export async function resolveAlert(alertId: string): Promise<AlertRecord | null> {
  const resolvedAt = new Date().toISOString();

  if (!supabase) {
    const record = mockAlertsTable.get(alertId);
    if (record) {
      record.status = 'resolved';
      record.resolved_at = resolvedAt;
      console.log(`[Supabase Mock] Resolved alert [${alertId}] at ${resolvedAt}`);
      return record;
    }
    return null;
  }

  try {
    const { data, error } = await supabase
      .from('alerts')
      .update({ status: 'resolved', resolved_at: resolvedAt })
      .eq('alert_id', alertId)
      .select()
      .single();

    if (error) {
      console.error('[Supabase] Resolve error:', error);
      return null;
    }

    console.log(`[Supabase Live] Resolved alert [${alertId}] at ${resolvedAt}`);
    return data as AlertRecord;
  } catch (err) {
    console.error('[Supabase] Exception resolving alert:', err);
    return null;
  }
}
