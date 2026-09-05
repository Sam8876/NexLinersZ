import { useEffect } from 'react';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { useFleetStore } from '../store/fleetStore.js';
import { AlertRecord } from '../types/index.js';

let supabase: SupabaseClient | null = null;
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } catch (e) {
    console.warn('[Dashboard Alerts Channel] Supabase init failed:', e);
  }
}

export function useAlertsStream() {
  const addAlert = useFleetStore((s) => s.addAlert);

  useEffect(() => {
    if (!supabase) {
      console.info('[Dashboard Alerts Channel] Supabase not configured. Using local alert stream.');
      return;
    }

    console.log('[Dashboard Alerts Channel] Subscribing to Supabase Realtime alerts...');
    const channel = supabase
      .channel('public:alerts')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'alerts' },
        (payload) => {
          const newAlert = payload.new as AlertRecord;
          if (newAlert) {
            addAlert(newAlert);
          }
        }
      )
      .subscribe();

    return () => {
      supabase?.removeChannel(channel);
    };
  }, [addAlert]);
}
