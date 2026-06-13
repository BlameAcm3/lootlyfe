import { useEffect } from 'react';
import { Modal as RNModal, StyleSheet, Text, View } from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, { FadeInDown, ZoomIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';

import { animations } from '../../constants/animations';
import { SCRIM_COLOR, themeVars } from '../../constants/theme';
import { useLexicon } from '../../hooks/useLexicon';
import { useTheme } from '../../hooks/useTheme';
import { playPackSound } from '../../lib/sounds';
import { Button } from '../ui';

type LevelUpModalProps = {
  visible: boolean;
  level: number;
  /** Achievement points granted for this climb (the spoils reveal). */
  points: number;
  onClose: () => void;
};

/**
 * Full-screen level-up celebration: Lottie burst, themed level-up sound
 * (silent placeholder until real audio lands), and a spoils reveal with the
 * achievement points earned. Entrance animations are Reanimated entering
 * transitions — they run on the UI thread.
 */
export const LevelUpModal = ({ visible, level, points, onClose }: LevelUpModalProps) => {
  const { t } = useLexicon();
  const { pack, palette } = useTheme();

  useEffect(() => {
    if (!visible) return;
    playPackSound(pack, 'level_up');
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
  }, [visible, pack]);

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      {/* RN Modal renders outside the ThemeScope tree: re-apply the palette. */}
      <View
        className="flex-1 items-center justify-center p-8"
        style={[{ backgroundColor: SCRIM_COLOR }, themeVars(palette)]}
      >
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <LottieView source={animations.burst} autoPlay loop style={StyleSheet.absoluteFill} />
        </View>

        <Animated.View entering={ZoomIn.springify().damping(12)} className="items-center gap-2">
          <View className="border-accent-achievement bg-surface-raised h-28 w-28 items-center justify-center rounded-full border-4">
            <Text className="text-accent-achievement text-5xl font-black">{level}</Text>
          </View>
          <Text className="text-text-inverse text-3xl font-black">{t('level_up_title')}</Text>
          <Text className="text-text-inverse text-center text-sm opacity-90">
            {t('level_up_body')}
          </Text>
        </Animated.View>

        <Animated.View
          entering={FadeInDown.delay(350).springify().damping(14)}
          className="bg-surface-raised border-border mt-8 w-full max-w-sm gap-2 rounded-3xl border p-5"
        >
          <Text className="text-text-muted text-xs font-extrabold uppercase tracking-widest">
            {t('level_up_spoils_label')}
          </Text>
          <View className="flex-row items-center gap-2">
            <Text className="text-3xl">🏅</Text>
            <Text className="text-accent-achievement text-xl font-black">
              {t('level_up_points_line', { points })}
            </Text>
          </View>
          <View className="pt-2">
            <Button
              accessibilityLabel={t('level_up_continue_action')}
              label={t('level_up_continue_action')}
              variant="gold"
              size="lg"
              onPress={onClose}
            />
          </View>
        </Animated.View>
      </View>
    </RNModal>
  );
};
