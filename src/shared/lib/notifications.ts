import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { useEffect } from 'react';
import { router } from 'expo-router';

import { supabase } from '@/shared/lib/supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const registerForPushNotificationsAsync = async (userId: string): Promise<string | null> => {
  if (!Device.isDevice) return null;

  const { status: currentStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = currentStatus;

  if (currentStatus !== 'granted') {
    const permissionResponse = await Notifications.requestPermissionsAsync();
    finalStatus = permissionResponse.status;
  }

  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId;
  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const token = tokenResponse.data;

  await supabase.from('push_tokens').upsert(
    {
      profile_id: userId,
      token,
      platform: Device.osName?.toLowerCase().includes('ios') ? 'ios' : 'android',
      device_id: Device.modelId ?? null,
    },
    { onConflict: 'profile_id,token' },
  );

  return token;
};

export const useNotificationListeners = () => {
  useEffect(() => {
    const foregroundSub = Notifications.addNotificationReceivedListener(() => {
      // Intentionally left blank; app-specific UI hooks in later phases.
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const route = response.notification.request.content.data?.route;
      if (typeof route === 'string' && route.length > 0) {
        router.push(route as never);
      }
    });

    return () => {
      foregroundSub.remove();
      responseSub.remove();
    };
  }, []);
};
