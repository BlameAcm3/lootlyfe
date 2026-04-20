import 'react-native-url-polyfill/auto';

import { createClient } from '@supabase/supabase-js';

import { env } from '@/shared/lib/env';
import type { Database } from '@/shared/types/database';

export const supabase = createClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false,
  },
});
