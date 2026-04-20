import 'react-native-url-polyfill/auto';

import * as SecureStore from 'expo-secure-store';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { env } from '@/shared/lib/env';
import type { Database } from '@/shared/types/database';

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
  },
});
