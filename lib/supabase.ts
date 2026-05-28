import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { createClient as createClientType } from '@supabase/supabase-js';

declare const require: <T>(moduleName: string) => T;

const { createClient } = require<{ createClient: typeof createClientType }>('@supabase/supabase-js');

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey);

if (!hasSupabaseConfig) {
  console.warn(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Supabase requests will fail until EAS env is configured.'
  );
}

export const supabase = createClient(
  hasSupabaseConfig ? supabaseUrl : 'https://missing-project.supabase.co',
  hasSupabaseConfig ? supabaseAnonKey : 'missing-anon-key',
  {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  }
);
