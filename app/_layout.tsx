import { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { PostHogProvider } from 'posthog-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useSession } from '@/features/auth';
import { AnalyticsDebugOverlay } from '@/shared/components';
import { registerForPushNotificationsAsync, useNotificationListeners } from '@/shared/lib/notifications';
import { capture, posthog, queryClient } from '@/shared/lib';
import { ThemeProvider } from '@/shared/theme';

export default function RootLayout() {
  const { session, isLoading, user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  useNotificationListeners();

  useEffect(() => {
    if (!user?.id) return;
    void registerForPushNotificationsAsync(user.id);
  }, [user?.id]);

  useEffect(() => {
    const rejectionHandler = (event: { reason?: unknown }) => {
      posthog.capture('unhandled_error', {
        source: 'promise_rejection',
        reason: String(event.reason),
      });
    };

    if (typeof globalThis.addEventListener === 'function') {
      globalThis.addEventListener('unhandledrejection', rejectionHandler);
    }

    return () => {
      if (typeof globalThis.removeEventListener === 'function') {
        globalThis.removeEventListener('unhandledrejection', rejectionHandler);
      }
    };
  }, []);

  useEffect(() => {
    capture('$pageview', { path: pathname });
  }, [pathname]);

  useEffect(() => {
    if (isLoading) return;

    const inAuthRoute = pathname.startsWith('/(auth)');
    if (!session && !inAuthRoute) {
      router.replace('/(auth)/sign-in');
      return;
    }
    if (session && inAuthRoute) {
      router.replace('/(parent)/(tabs)');
    }
  }, [isLoading, pathname, router, session]);

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PostHogProvider client={posthog}>
          <ThemeProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false }} />
              <AnalyticsDebugOverlay />
            </GestureHandlerRootView>
          </ThemeProvider>
        </PostHogProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
