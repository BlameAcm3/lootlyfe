import '../global.css';

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

import { StatusBar } from 'expo-status-bar';

import { useSession } from '@/features/auth';
import { registerForPushNotificationsAsync, useNotificationListeners } from '@/shared/lib/notifications';
import { capture, posthog, queryClient } from '@/shared/lib';
import { useModeStore } from '@/stores/modeStore';
import { ThemeScope } from '../themes/ThemeProvider';
import { DEFAULT_THEME_ID } from '../themes';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { ROUTES } from '../lib/routes';

function RootLayoutEffects() {
  const { session, isLoading, user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const navigationRef = useNavigationContainerRef();
  const hasSeenWalkthrough = useOnboardingStore((state) => state.hasSeenWalkthrough);
  const onboardingHydrated = useOnboardingStore((state) => state.hydrated);
  useNotificationListeners();

  useEffect(() => {
    if (!user?.id) return;
    void registerForPushNotificationsAsync(user.id);
  }, [user?.id]);

  useEffect(() => {
    const rejectionHandler = (event: { reason?: unknown }) => {
      capture('unhandled_error', {
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
      // Dev tooling routes (theme-lab) are reachable without a session.
      const inDevRoute = segments[0] === 'dev' || pathname.startsWith('/dev');
      if (inDevRoute) return;
      // Pairing flow manages its own (anonymous) session.
      const inPairRoute = segments[0] === 'pair' || pathname.startsWith('/pair');
      if (inPairRoute) return;
      // Email deep-link callback: let the code exchange finish undisturbed.
      const inAuthCallback = segments[0] === 'auth' || pathname.startsWith('/auth/callback');
      if (inAuthCallback) return;
      if (!session && !inAuthRoute) {
        router.replace('/(auth)/welcome');
        return;
      }
      if (session) {
        // Anonymous sessions are kid devices: binding-aware routing happens in
        // (adventurer)/_layout — just keep them out of auth/NPC routes.
        if (user?.is_anonymous) {
          if (inAuthRoute || segments[0] === '(parent)' || segments[0] === 'walkthrough') {
            router.replace(ROUTES.adventurerHome);
          }
          return;
        }
        // Wait for the persisted walkthrough flag before deciding.
        if (!onboardingHydrated) return;
        const onWalkthrough = segments[0] === 'walkthrough' || pathname === '/walkthrough';
        if (!hasSeenWalkthrough && !onWalkthrough) {
          router.replace('/walkthrough');
          return;
        }
        if (hasSeenWalkthrough && inAuthRoute) {
          router.replace('/(parent)/(tabs)');
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    hasSeenWalkthrough,
    isLoading,
    navigationRef,
    onboardingHydrated,
    pathname,
    router,
    segments[0],
    session,
    user?.is_anonymous,
  ]);

  return null;
}

/**
 * Mode-aware theme root: NPC neutral skin in parent mode, the adventurer's
 * theme pack in kid mode. TODO(theme): resolve theme_id/variant_id from the
 * active adventurer's profile once adventurer data is wired up; until then
 * kid mode uses the free high-fantasy default.
 */
function AppThemeProvider({ children }: { children: React.ReactNode }) {
  const mode = useModeStore((state) => state.mode);
  return (
    <ThemeScope npcSkin={mode !== 'kid'} themeId={DEFAULT_THEME_ID} variantId={null}>
      {children}
    </ThemeScope>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PostHogProvider client={posthog}>
          {/* NPC skin and all theme packs are dark-first. */}
          <StatusBar style="light" />
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AppThemeProvider>
              <Stack screenOptions={{ headerShown: false }} />
              <RootLayoutEffects />
            </AppThemeProvider>
          </GestureHandlerRootView>
        </PostHogProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
