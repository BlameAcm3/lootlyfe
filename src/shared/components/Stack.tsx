import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/shared/hooks/useTheme';

type Props = PropsWithChildren<
  ViewProps & {
    gap?: keyof ReturnType<typeof useTheme>['spacing'];
  }
>;

export const Stack = ({ children, style, gap = 'md', ...props }: Props) => {
  const { spacing } = useTheme();
  return (
    <View style={[{ gap: spacing[gap] }, style]} {...props}>
      {children}
    </View>
  );
};
