import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

import { useToastStore } from '@/stores/toastStore';

const AUTO_DISMISS_MS = 4000;

/**
 * In-app toast host. Surfaces a foreground push as a subtle banner when the
 * relevant screen is already open (see src/shared/lib/notifications.ts), instead
 * of stacking an OS notification on top of the content the user is looking at.
 * Tapping follows the notification's deep link. Mount once at the app root.
 */
export const ToastHost = () => {
  const insets = useSafeAreaInsets();
  const current = useToastStore((state) => state.current);
  const dismiss = useToastStore((state) => state.dismiss);

  useEffect(() => {
    if (!current) return;
    const timer = setTimeout(dismiss, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [current, dismiss]);

  if (!current) return null;

  return (
    <View
      style={{ position: 'absolute', top: insets.top + 8, left: 12, right: 12, zIndex: 100 }}
    >
      <Pressable
        accessibilityRole="button"
        onPress={() => {
          const route = current.route;
          dismiss();
          if (route) router.push(route as never);
        }}
        className="bg-surface-raised border-border rounded-2xl border px-4 py-3 shadow-lg"
      >
        <Text className="text-text-primary text-sm font-bold" numberOfLines={1}>
          {current.title}
        </Text>
        {current.body ? (
          <Text className="text-text-muted mt-0.5 text-xs" numberOfLines={2}>
            {current.body}
          </Text>
        ) : null}
      </Pressable>
    </View>
  );
};
