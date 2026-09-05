"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
exports.insertAlert = insertAlert;
exports.updateAlertDetails = updateAlertDetails;
exports.resolveAlert = resolveAlert;
const supabase_js_1 = require("@supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const supabaseUrl = process.env.SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || '';
exports.supabase = null;
// In-memory mock alert storage for local testing when Supabase credentials are not supplied
const mockAlertsTable = new Map();
if (supabaseUrl && supabaseKey) {
    try {
        exports.supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
        console.log('[Supabase] Client initialized successfully for live alerts table.');
    }
    catch (err) {
        console.warn('[Supabase] Failed to initialize client:', err);
    }
}
else {
    console.info('[Supabase] Live credentials not set in .env. Running with verified in-memory mock alerts table.');
}
async function insertAlert(alert) {
    if (!exports.supabase) {
        const alertId = 'alt-mock-' + Math.random().toString(36).substring(2, 9);
        const record = {
            alert_id: alertId,
            ...alert,
        };
        mockAlertsTable.set(alertId, record);
        console.log(`[Supabase Mock] Inserted alert row [${record.alert_id}] vehicle: ${record.vehicle_id} type: ${record.type} severity: ${record.severity}`);
        return record;
    }
    try {
        const { data, error } = await exports.supabase
            .from('alerts')
            .insert([alert])
            .select()
            .single();
        if (error) {
            console.error('[Supabase] Insert error:', error);
            return null;
        }
        console.log(`[Supabase Live] Inserted alert row [${data.alert_id}] vehicle: ${data.vehicle_id} type: ${data.type}`);
        return data;
    }
    catch (err) {
        console.error('[Supabase] Exception writing alert:', err);
        return null;
    }
}
async function updateAlertDetails(alertId, details) {
    if (!exports.supabase) {
        const record = mockAlertsTable.get(alertId);
        if (record) {
            record.details = { ...record.details, ...details };
            return record;
        }
        return null;
    }
    try {
        const { data, error } = await exports.supabase
            .from('alerts')
            .update({ details })
            .eq('alert_id', alertId)
            .select()
            .single();
        if (error) {
            console.error('[Supabase] Update error:', error);
            return null;
        }
        return data;
    }
    catch (err) {
        console.error('[Supabase] Exception updating alert:', err);
        return null;
    }
}
async function resolveAlert(alertId) {
    const resolvedAt = new Date().toISOString();
    if (!exports.supabase) {
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
        const { data, error } = await exports.supabase
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
        return data;
    }
    catch (err) {
        console.error('[Supabase] Exception resolving alert:', err);
        return null;
    }
}
