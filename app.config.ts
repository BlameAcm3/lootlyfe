import type { ConfigContext, ExpoConfig } from 'expo/config';

const withFallback = (value: string | undefined, fallback: string): string => {
  return value && value.trim().length > 0 ? value : fallback;
};

/** EAS project on expo.dev — `eas init` cannot patch dynamic app.config; override with EXPO_PUBLIC_EAS_PROJECT_ID if needed. */
const EAS_PROJECT_ID = 'ded3ce5c-f73f-4be6-bd06-2e63aebf9a92';

export default ({ config }: ConfigContext): ExpoConfig => {
  const extra = (config.extra ?? {}) as Record<string, unknown>;
  const easExtra = (extra.eas ?? {}) as { projectId?: string };

  return {
    ...config,
    name: 'Lootlyfe',
    slug: 'lootlyfe',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    newArchEnabled: true,
    scheme: 'lootlyfe',
    splash: {
      image: './assets/splash-icon.png',
      resizeMode: 'contain',
      // Dark-first brand: deep indigo-black, consistent with the RPG-neutral skin.
      backgroundColor: '#0B1020',
    },
    ios: {
      supportsTablet: true,
      // Placeholder org — replace PLACEHOLDER with your Apple Team's reverse-DNS
      // org before submitting (must match the App Store Connect bundle id).
      bundleIdentifier: 'com.PLACEHOLDER.lootlyfe',
      buildNumber: '1',
      entitlements: {
        // APNs environment: 'production' for TestFlight/App Store, 'development'
        // for dev-client builds. Driven per EAS profile via APS_ENVIRONMENT.
        'aps-environment': withFallback(process.env.APS_ENVIRONMENT, 'production'),
      },
      infoPlist: {
        UIBackgroundModes: ['remote-notification'],
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      package: 'com.PLACEHOLDER.lootlyfe',
      versionCode: 1,
      permissions: ['POST_NOTIFICATIONS'],
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        backgroundColor: '#0B1020',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
    },
    web: {
      favicon: './assets/favicon.png',
    },
    plugins: [
      'expo-router',
      [
        'expo-notifications',
        {
          icon: './assets/icon.png',
          color: '#1E3A8A',
        },
      ],
      'expo-secure-store',
      [
        // Uploads source maps to Sentry during EAS Build when SENTRY_AUTH_TOKEN
        // is present (org/project resolved from env). Safe no-op locally.
        '@sentry/react-native/expo',
        {
          url: 'https://sentry.io/',
          organization: process.env.SENTRY_ORG,
          project: process.env.SENTRY_PROJECT,
        },
      ],
    ],
    extra: {
      ...extra,
      eas: {
        ...easExtra,
        projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? easExtra.projectId ?? EAS_PROJECT_ID,
      },
      supabaseUrl: withFallback(
        process.env.EXPO_PUBLIC_SUPABASE_URL,
        'https://example.supabase.co',
      ),
      supabaseAnonKey: withFallback(
        process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
        'replace-with-anon-key',
      ),
      posthogApiKey: withFallback(process.env.EXPO_PUBLIC_POSTHOG_API_KEY, 'replace-with-posthog-key'),
      posthogHost: withFallback(process.env.EXPO_PUBLIC_POSTHOG_HOST, 'https://us.i.posthog.com'),
      authRedirectPath: 'auth/callback',
    },
    experiments: {
      typedRoutes: true,
    },
  };
};
