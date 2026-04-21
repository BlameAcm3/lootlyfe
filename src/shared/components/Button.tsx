import type { ReactNode } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { Pressable } from '@/shared/components/Pressable';
import { Text } from '@/shared/components/Text';
import { useTheme } from '@/shared/hooks/useTheme';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

type Props = {
  label: string;
  onPress?: () => void;
  accessibilityLabel: string;
  accessibilityHint?: string;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  testID?: string;
  /** Stretch to parent width (e.g. full-width form actions). */
  fullWidth?: boolean;
};

export const Button = ({
  label,
  onPress,
  accessibilityLabel,
  accessibilityHint,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  leftIcon,
  rightIcon,
  testID,
  fullWidth = false,
}: Props) => {
  const { colors, spacing, radii } = useTheme();
  const isDisabled = disabled || loading;

  const variantStyles = {
    primary: { backgroundColor: colors.primary, borderColor: colors.primary, textColor: colors.primaryText },
    secondary: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      textColor: colors.text,
    },
    ghost: { backgroundColor: 'transparent', borderColor: 'transparent', textColor: colors.primary },
    danger: { backgroundColor: colors.danger, borderColor: colors.danger, textColor: colors.primaryText },
  } as const;

  const sizeStyles = {
    sm: { paddingVertical: spacing.sm, paddingHorizontal: spacing.md },
    md: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
    lg: { paddingVertical: spacing.lg, paddingHorizontal: spacing.xl },
  } as const;

  return (
    <Pressable
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityRole="button"
      disabled={isDisabled}
      onPress={async () => {
        if (isDisabled || !onPress) return;
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      style={({ pressed }) => [
        styles.base,
        fullWidth ? { alignSelf: 'stretch' } : null,
        {
          borderRadius: radii.md,
          borderWidth: variant === 'ghost' ? 0 : StyleSheet.hairlineWidth,
          opacity: isDisabled ? 0.55 : pressed ? 0.9 : 1,
        },
        variantStyles[variant],
        sizeStyles[size],
      ]}
    >
      <View style={[styles.content, { gap: spacing.sm }]}>
        {leftIcon}
        {loading ? (
          <ActivityIndicator color={variantStyles[variant].textColor} />
        ) : (
          <Text variant="label" style={{ color: variantStyles[variant].textColor }}>
            {label}
          </Text>
        )}
        {rightIcon}
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
});
