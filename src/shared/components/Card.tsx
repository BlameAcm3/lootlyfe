import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/shared/hooks/useTheme';

type Props = PropsWithChildren<ViewProps>;

export const Card = ({ children, style, ...props }: Props) => {
  const { colors, radii, spacing, shadows } = useTheme();

  return (
    <View
      style={[
        {
          backgroundColor: colors.bgElevated,
          borderColor: colors.border,
          borderRadius: radii.lg,
          borderWidth: 1,
          padding: spacing.lg,
        },
        shadows.sm,
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};
