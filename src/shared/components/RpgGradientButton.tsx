import type { ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/shared/hooks/useTheme';

type Props = {
  label: string;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  accessibilityLabel: string;
  /** Secondary dark style (e.g. continue before gradient unlock). */
  variant?: 'gradient' | 'muted';
  leftIcon?: ReactNode;
};

export const RpgGradientButton = ({
  label,
  onPress,
  disabled = false,
  loading = false,
  accessibilityLabel,
  variant = 'gradient',
  leftIcon,
}: Props) => {
  const { colors, radii } = useTheme();
  const isDisabled = disabled || loading;

  if (variant === 'muted') {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        disabled={isDisabled}
        onPress={async () => {
          if (isDisabled || !onPress) return;
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onPress();
        }}
        style={({ pressed }) => [
          styles.wrap,
          {
            borderRadius: radii.pill,
            backgroundColor: colors.bgCard,
            borderWidth: 1,
            borderColor: colors.borderStrong,
            opacity: isDisabled ? 0.5 : pressed ? 0.92 : 1,
          },
        ]}
      >
        <View style={styles.row}>
          {loading ? <ActivityIndicator color={colors.text} /> : null}
          {!loading ? (
            <Text style={[styles.labelMuted, { color: colors.text }]}>{label}</Text>
          ) : null}
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={isDisabled}
      onPress={async () => {
        if (isDisabled || !onPress) return;
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        onPress();
      }}
      style={({ pressed }) => [{ opacity: isDisabled ? 0.55 : pressed ? 0.92 : 1 }]}
    >
      <LinearGradient
        colors={['#a855f7', '#22d3ee']}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={[
          styles.gradient,
          {
            borderRadius: radii.pill,
            shadowColor: '#a855f7',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.45,
            shadowRadius: 12,
            elevation: 8,
          },
        ]}
      >
        <View style={styles.row}>
          {leftIcon}
          {loading ? <ActivityIndicator color="#0f172a" /> : null}
          {!loading ? <Text style={styles.labelLight}>{label}</Text> : null}
        </View>
      </LinearGradient>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  wrap: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 54,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  labelLight: {
    fontWeight: '900',
    fontSize: 15,
    letterSpacing: 0.8,
    color: '#ffffff',
    textTransform: 'uppercase',
  },
  labelMuted: {
    fontWeight: '800',
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
