import 'react-native-url-polyfill/auto';

import * as SecureStore from 'expo-secure-store';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/shared/lib/env';
// Superset schema types (legacy family tables + guild domain), generated from
// the local stack via `npm run typegen`.
import type { Database } from '../../../types/database';

const STORAGE_PREFIX = 'lootlyfe.supabase.';

const secureStorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(`${STORAGE_PREFIX}${key}`);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(`${STORAGE_PREFIX}${key}`, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(`${STORAGE_PREFIX}${key}`);
  },
};

export const supabase: SupabaseClient<Database> = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    storage: secureStorageAdapter,
    autoRefreshToken: true,
    detectSessionInUrl: false,
    // PKCE: email links redirect back with a ?code= the app exchanges in
    // app/auth/callback.tsx (no web origin exists for the implicit flow).
    flowType: 'pkce',
  },
});
