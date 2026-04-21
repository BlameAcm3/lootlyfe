import { useEffect } from 'react';
import {
  Stack,
  useNavigationContainerRef,
  usePathname,
  useRouter,
  useSegments,
} from 'expo-router';
import { QueryClientProvider } from '@tanstack/react-query';
import { PostHogProvider } from 'posthog-react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

import { useSession } from '@/features/auth';
import { registerForPushNotificationsAsync, useNotificationListeners } from '@/shared/lib/notifications';
import { capture, posthog, queryClient } from '@/shared/lib';
import { ThemeProvider } from '@/shared/theme';

function RootLayoutEffects() {
  const { session, isLoading, user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const navigationRef = useNavigationContainerRef();
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
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      if (!navigationRef.isReady()) {
        requestAnimationFrame(run);
        return;
      }

      // Route groups are omitted from usePathname() (e.g. /sign-up not /(auth)/sign-up), so useSegments().
      const inAuthRoute =
        segments[0] === '(auth)' ||
        pathname.startsWith('/(auth)') ||
        pathname === '/sign-in' ||
        pathname === '/sign-up' ||
        pathname === '/welcome';
      if (!session && !inAuthRoute) {
        router.replace('/(auth)/welcome');
        return;
      }
      if (session && inAuthRoute) {
        router.replace('/(parent)/(tabs)');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [isLoading, navigationRef, pathname, router, segments[0], session]);

  return null;
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PostHogProvider client={posthog}>
          <ThemeProvider>
            <GestureHandlerRootView style={{ flex: 1 }}>
              <Stack screenOptions={{ headerShown: false }} />
              <RootLayoutEffects />
            </GestureHandlerRootView>
          </ThemeProvider>
        </PostHogProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
