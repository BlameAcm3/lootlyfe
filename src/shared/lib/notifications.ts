import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import { AppState } from 'react-native';
import { router, useNavigationContainerRef, usePathname } from 'expo-router';

import { supabase } from '@/shared/lib/supabase';
import { useToastStore } from '@/stores/toastStore';

// ---------------------------------------------------------------------------
// Active route tracking. The foreground handler suppresses the OS banner when
// the user is already looking at the screen the notification points to (we show
// an in-app toast instead). expo-router's usePathname() drops route groups
// (e.g. /approvals, not /(parent)/approvals), so we compare on group-stripped
// paths.
// ---------------------------------------------------------------------------
let activeRoute = '';
const stripGroups = (path: string): string =>
  path.replace(/\/\([^)]*\)/g, '').replace(/\/index$/, '') || '/';

const routeIsOpen = (target: string | undefined): boolean => {
  if (!target) return false;
  const t = stripGroups(target);
  const here = stripGroups(activeRoute);
  return here === t || here.startsWith(`${t}/`);
};

// Foreground notification policy: if the relevant screen is open, suppress the
// system banner (the in-app toast covers it); otherwise show the banner.
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const route =
      typeof notification.request.content.data?.route === 'string'
        ? (notification.request.content.data.route as string)
        : undefined;
    const foreground = AppState.currentState === 'active';
    const suppressBanner = foreground && routeIsOpen(route);
    return {
      shouldPlaySound: !suppressBanner,
      shouldSetBadge: false,
      shouldShowBanner: !suppressBanner,
      shouldShowList: !suppressBanner,
    };
  },
});

const resolveProjectId = (): string | null =>
  Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? null;

const upsertToken = async (userId: string, token: string): Promise<void> => {
  await supabase.from('device_push_tokens').upsert(
    {
      user_id: userId,
      token,
      platform: Device.osName?.toLowerCase().includes('ios') ? 'ios' : 'android',
    },
    { onConflict: 'user_id,token' },
  );
};

const fetchAndStoreToken = async (userId: string): Promise<string | null> => {
  const projectId = resolveProjectId();
  if (!projectId) {
    if (__DEV__) {
      console.warn(
        '[Lootlyfe] Push skipped: no EAS project ID. Add EXPO_PUBLIC_EAS_PROJECT_ID to .env (from expo.dev project settings or `npx eas init`).',
      );
    }
    return null;
  }
  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  await upsertToken(userId, tokenResponse.data);
  return tokenResponse.data;
};

/**
 * Register this device's Expo push token IF permission was already granted.
 * Never prompts — safe to call on launch / sign-in to refresh a token for a
 * user who previously opted in.
 */
export const registerPushToken = async (userId: string): Promise<string | null> => {
  if (!Device.isDevice) return null;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return null;
  return fetchAndStoreToken(userId);
};

/**
 * Prompt for push permission, then register the token. Call this at the first
 * MEANINGFUL moment (NPC: after creating their first quest; kid: after their
 * first quest completion) — never auto-prompt on launch (Kids Category + UX).
 * No-op if the user has already answered the prompt.
 */
export const requestPushPermissionAndRegister = async (
  userId: string,
): Promise<string | null> => {
  if (!Device.isDevice) return null;
  const current = await Notifications.getPermissionsAsync();
  let status = current.status;
  if (status === 'undetermined' || current.canAskAgain) {
    if (status !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync();
      status = requested.status;
    }
  }
  if (status !== 'granted') return null;
  return fetchAndStoreToken(userId);
};

/**
 * Wires foreground/response listeners and keeps the active-route ref current.
 * Foreground notifications become in-app toasts; taps deep-link via data.route.
 */
export const useNotificationListeners = () => {
  const navigationRef = useNavigationContainerRef();
  const pathname = usePathname();

  useEffect(() => {
    activeRoute = pathname;
  }, [pathname]);

  useEffect(() => {
    const foregroundSub = Notifications.addNotificationReceivedListener((notification) => {
      const content = notification.request.content;
      const route =
        typeof content.data?.route === 'string' ? (content.data.route as string) : undefined;
      // Only toast when we suppressed the banner (relevant screen open); a
      // background-style banner already covers the other case.
      if (AppState.currentState === 'active' && routeIsOpen(route)) {
        useToastStore.getState().show({
          title: content.title ?? 'Lootlyfe',
          body: content.body ?? '',
          route,
        });
      }
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (typeof route === 'string' && route.length > 0 && navigationRef.isReady()) {
        router.push(route as never);
      }
    });

    return () => {
      foregroundSub.remove();
      responseSub.remove();
    };
  }, [navigationRef]);
};
