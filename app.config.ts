import type { ConfigContext, ExpoConfig } from 'expo/config';

const withFallback = (value: string | undefined, fallback: string): string => {
  return value && value.trim().length > 0 ? value : fallback;
};

export default ({ config }: ConfigContext): ExpoConfig => ({
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
    backgroundColor: '#ffffff',
  },
  ios: {
    supportsTablet: true,
    bundleIdentifier: 'com.lootlyfe.app',
    entitlements: {
      'aps-environment': 'development',
    },
    infoPlist: {
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    package: 'com.chorequest.app',
    permissions: ['POST_NOTIFICATIONS'],
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff',
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
  ],
  extra: {
    ...config.extra,
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
});
