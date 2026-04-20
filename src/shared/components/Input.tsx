import { forwardRef } from 'react';
import {
  TextInput,
  View,
  type TextInputProps,
  type AccessibilityProps,
  StyleSheet,
} from 'react-native';

import { Text } from '@/shared/components/Text';
import { useTheme } from '@/shared/hooks/useTheme';

type Props = TextInputProps &
  AccessibilityProps & {
    label?: string;
    error?: string;
  };

export const Input = forwardRef<TextInput, Props>(({ label, error, style, ...props }, ref) => {
  const { colors, spacing, radii, typography } = useTheme();

  return (
    <View style={{ gap: spacing.xs }}>
      {label ? <Text variant="label">{label}</Text> : null}
      <TextInput
        ref={ref}
        allowFontScaling
        placeholderTextColor={colors.textMuted}
        style={[
          styles.input,
          typography.body,
          {
            backgroundColor: colors.bgElevated,
            borderColor: error ? colors.danger : colors.border,
            borderRadius: radii.md,
            color: colors.text,
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.md,
          },
          style,
        ]}
        {...props}
      />
      {error ? <Text variant="caption" color="danger">{error}</Text> : null}
    </View>
  );
});

Input.displayName = 'Input';

const styles = StyleSheet.create({
  input: {
    borderWidth: 1,
    minHeight: 46,
  },
});
