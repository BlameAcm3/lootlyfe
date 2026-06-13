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
import { registerPushToken, useNotificationListeners } from '@/shared/lib/notifications';
import { capture, initSentry, posthog, queryClient, wrapWithSentry } from '@/shared/lib';

// Initialize crash/error reporting before the first render (no-op without a DSN).
initSentry();
import { ToastHost } from '../components/ui';
import { useModeStore } from '@/stores/modeStore';
import { ThemeScope } from '../themes/ThemeProvider';
import { DEFAULT_THEME_ID } from '../themes';
import { useOnboardingStore } from '../store/useOnboardingStore';
import { ROUTES } from '../lib/routes';
import { configureRevenueCat } from '../lib/revenuecat';
import { useCurrentGuild } from '../queries/guildQueries';

function RootLayoutEffects() {
  const { session, isLoading, user } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const segments = useSegments();
  const navigationRef = useNavigationContainerRef();
  const hasSeenWalkthrough = useOnboardingStore((state) => state.hasSeenWalkthrough);
  const onboardingHydrated = useOnboardingStore((state) => state.hydrated);
  const { guild } = useCurrentGuild();
  useNotificationListeners();

  // RevenueCat identifies on the guild id (subscription is per-guild). NPC
  // sessions only — kids (anonymous) never purchase. No-ops in Expo Go.
  useEffect(() => {
    if (!user?.id || user.is_anonymous || !guild?.id) return;
    void configureRevenueCat(guild.id);
  }, [user?.id, user?.is_anonymous, guild?.id]);

  // Refresh the push token for users who already opted in — never prompts.
  // The permission prompt itself fires at the first meaningful moment (NPC:
  // after creating their first quest; kid: after their first completion).
  useEffect(() => {
    if (!user?.id) return;
    void registerPushToken(user.id);
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
      // Co-parent invite acceptance: a signed-in NPC without a guild stays here
      // (don't bounce them into guild creation).
      const inAcceptInvite = segments[0] === 'accept-invite' || pathname.startsWith('/accept-invite');
      if (inAcceptInvite) return;
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

function RootLayout() {
  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <PostHogProvider client={posthog}>
          {/* NPC skin and all theme packs are dark-first. */}
          <StatusBar style="light" />
          <GestureHandlerRootView style={{ flex: 1 }}>
            <AppThemeProvider>
              <Stack screenOptions={{ headerShown: false }} />
              <ToastHost />
              <RootLayoutEffects />
            </AppThemeProvider>
          </GestureHandlerRootView>
        </PostHogProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}

export default wrapWithSentry(RootLayout);
