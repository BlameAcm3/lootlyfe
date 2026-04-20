type RequiredEnvVar =
  | 'EXPO_PUBLIC_SUPABASE_URL'
  | 'EXPO_PUBLIC_SUPABASE_ANON_KEY'
  | 'EXPO_PUBLIC_POSTHOG_API_KEY'
  | 'EXPO_PUBLIC_POSTHOG_HOST';

const getEnvVar = (key: RequiredEnvVar): string => {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
};

export const env = {
  supabaseUrl: getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
  supabaseAnonKey: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  posthogApiKey: getEnvVar('EXPO_PUBLIC_POSTHOG_API_KEY'),
  posthogHost: getEnvVar('EXPO_PUBLIC_POSTHOG_HOST'),
} as const;
