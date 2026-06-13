import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { SlideInUp, SlideOutUp } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import type { PresetAchievement } from '../../data/preset-achievements';
import { useLexicon } from '../../hooks/useLexicon';
import { useTheme } from '../../hooks/useTheme';
import { playPackSound } from '../../lib/sounds';

type AchievementToastProps = {
  /** null hides the toast (slide-out runs on unmount). */
  achievement: PresetAchievement | null;
  /** Called on auto-dismiss or tap. Keep referentially stable (useCallback). */
  onDone: () => void;
};

const AUTO_DISMISS_MS = 3500;

/**
 * The achievement-earned moment: a top banner that drops in, chimes, and
 * slides away — deliberately smaller than the level-up ceremony. Render it
 * inside the themed tree (it's not a Modal) so palette tokens resolve.
 */
export const AchievementToast = ({ achievement, onDone }: AchievementToastProps) => {
  const { t } = useLexicon();
  const { pack } = useTheme();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!achievement) return;
    playPackSound(pack, 'gold_pickup');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    const timer = setTimeout(onDone, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [achievement, onDone, pack]);

  if (!achievement) return null;

  return (
    <Animated.View
      key={achievement.id}
      entering={SlideInUp.springify().damping(16)}
      exiting={SlideOutUp}
      style={{ position: 'absolute', top: insets.top + 8, left: 16, right: 16 }}
    >
      <Pressable
        accessibilityRole="alert"
        accessibilityLabel={t('achievement_earned_title')}
        onPress={onDone}
        className="bg-surface-raised border-accent-achievement flex-row items-center gap-3 rounded-3xl border-2 p-4"
      >
        <View className="bg-bg-base h-12 w-12 items-center justify-center rounded-full">
          <Text className="text-2xl">{achievement.emoji}</Text>
        </View>
        <View className="flex-1">
          <Text className="text-accent-achievement text-xs font-extrabold uppercase tracking-widest">
            {t('achievement_earned_title')}
          </Text>
          <Text className="text-text-primary text-base font-black" numberOfLines={1}>
            {t(achievement.nameKey)}
          </Text>
        </View>
        <Text className="text-accent-achievement text-sm font-black">
          {t('level_up_points_line', { points: achievement.points })}
        </Text>
      </Pressable>
    </Animated.View>
  );
};
