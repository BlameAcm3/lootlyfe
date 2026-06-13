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
  /**
   * Optional, defaults to false. Adventurer (kid) mode analytics stays fully
   * disabled unless this is explicitly "true" (Apple Kids Category compliance).
   */
  adventurerAnalyticsEnabled: process.env.EXPO_PUBLIC_ADVENTURER_ANALYTICS_ENABLED === 'true',
  /**
   * RevenueCat public SDK keys (safe in the client — they only allow purchases,
   * never entitlement writes; those go through the webhook). Empty until set;
   * lib/revenuecat.ts no-ops when unconfigured or when the native module is
   * absent (Expo Go).
   */
  revenueCatIosKey: process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY ?? '',
  revenueCatAndroidKey: process.env.EXPO_PUBLIC_REVENUECAT_ANDROID_KEY ?? '',
  /**
   * Master switch for premium gating. Default true. Set to "false" to unlock
   * every premium feature without a purchase (QA / TestFlight without sandbox).
   */
  paywallEnabled: process.env.EXPO_PUBLIC_PAYWALL_ENABLED !== 'false',
  /** Placeholder legal URLs surfaced in NPC settings (COPPA). */
  privacyUrl: process.env.EXPO_PUBLIC_PRIVACY_URL ?? 'https://lootlyfe.app/privacy',
  termsUrl: process.env.EXPO_PUBLIC_TERMS_URL ?? 'https://lootlyfe.app/terms',
  /**
   * Sentry crash/error reporting. Empty until set; lib/sentry.ts no-ops when
   * unconfigured (Expo Go, local dev without a DSN). User context is stripped
   * on adventurer (anonymous) sessions — see lib/sentry.ts.
   */
  sentryDsn: process.env.EXPO_PUBLIC_SENTRY_DSN ?? '',
  sentryEnvironment:
    process.env.EXPO_PUBLIC_SENTRY_ENVIRONMENT ?? (__DEV__ ? 'development' : 'production'),
} as const;
