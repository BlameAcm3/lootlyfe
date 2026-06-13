import { Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRealtimeStore } from '@/stores/realtimeStore';
import { useLexicon } from '../../hooks/useLexicon';

/**
 * Subtle "you're offline" pill, shown only while the guild Realtime channel is
 * disconnected (and retrying). Renders nothing when connected/connecting so it
 * never flickers on a healthy connection. Place once per mode layout.
 */
export const OfflineIndicator = () => {
  const { t } = useLexicon();
  const insets = useSafeAreaInsets();
  const status = useRealtimeStore((state) => state.status);

  if (status !== 'offline') return null;

  return (
    <View
      pointerEvents="none"
      style={{ position: 'absolute', top: insets.top + 6, left: 0, right: 0, alignItems: 'center', zIndex: 50 }}
    >
      <View className="bg-surface-raised border-border flex-row items-center gap-2 rounded-full border px-3 py-1.5">
        <View className="bg-danger h-2 w-2 rounded-full" />
        <Text className="text-text-muted text-xs font-semibold">{t('offline_indicator')}</Text>
      </View>
    </View>
  );
};
