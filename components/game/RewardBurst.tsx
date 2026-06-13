import { useEffect } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import LottieView from 'lottie-react-native';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from 'react-native-reanimated';

import { animations } from '../../constants/animations';
import { useTheme } from '../../hooks/useTheme';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

const RISE_MS = 900;
const COUNT_MS = 600;
const HOLD_MS = 450;

function CountUpValue({ target, prefix }: { target: number; prefix: string }) {
  const { palette } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(1, { duration: COUNT_MS, easing: Easing.out(Easing.cubic) });
  }, [progress]);

  // The count-up runs entirely on the UI thread: animating the `text` prop
  // of a non-editable TextInput avoids re-rendering React per frame.
  const animatedProps = useAnimatedProps(() => ({
    text: `${prefix}${Math.round(progress.value * target)}`,
    defaultValue: `${prefix}0`,
  }));

  return (
    <AnimatedTextInput
      editable={false}
      animatedProps={animatedProps}
      style={[styles.countText, { color: palette['text-inverse'] }]}
    />
  );
}

type RewardBurstProps = {
  gold: number;
  xp: number;
  onDone: () => void;
};

/**
 * Floating reward feedback over a completed quest card: a Lottie sparkle and
 * a rising "+gold / +xp" chip whose numbers count up. All movement runs as
 * Reanimated worklets on the UI thread; the only JS-thread hop is the final
 * onDone callback. Mount it when a reward lands; it unmounts itself via
 * onDone.
 */
export const RewardBurst = ({ gold, xp, onDone }: RewardBurstProps) => {
  const { palette } = useTheme();
  const rise = useSharedValue(0);

  useEffect(() => {
    rise.value = withDelay(
      HOLD_MS,
      withTiming(1, { duration: RISE_MS, easing: Easing.out(Easing.quad) }, (finished) => {
        if (finished) runOnJS(onDone)();
      }),
    );
  }, [rise, onDone]);

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -52 * rise.value }, { scale: 1 + 0.08 * rise.value }],
    opacity: rise.value < 0.7 ? 1 : 1 - (rise.value - 0.7) / 0.3,
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <LottieView source={animations.sparkle} autoPlay loop={false} style={styles.sparkle} />
      <View style={styles.chipAnchor}>
        <Animated.View
          style={[chipStyle, styles.chip, { backgroundColor: palette['accent-loot'] }]}
        >
          {gold > 0 ? <CountUpValue target={gold} prefix="+🪙 " /> : null}
          {xp > 0 ? <CountUpValue target={xp} prefix="+⚡ " /> : null}
        </Animated.View>
      </View>
    </View>
  );
};

// Animated/absolute positioning — style exception list applies.
const styles = StyleSheet.create({
  sparkle: {
    position: 'absolute',
    top: -28,
    right: 4,
    width: 88,
    height: 88,
  },
  chipAnchor: {
    position: 'absolute',
    top: 6,
    right: 12,
  },
  chip: {
    flexDirection: 'row',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  countText: {
    fontSize: 14,
    fontWeight: '800',
    padding: 0,
  },
});
