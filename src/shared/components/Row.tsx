import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';

import { useTheme } from '@/shared/hooks/useTheme';

type Props = PropsWithChildren<
  ViewProps & {
    gap?: keyof ReturnType<typeof useTheme>['spacing'];
    align?: 'flex-start' | 'center' | 'flex-end' | 'stretch' | 'baseline';
    justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  }
>;

export const Row = ({ children, style, gap = 'md', align = 'center', justify = 'flex-start', ...props }: Props) => {
  const { spacing } = useTheme();
  return (
    <View
      style={[
        {
          alignItems: align,
          flexDirection: 'row',
          gap: spacing[gap],
          justifyContent: justify,
        },
        style,
      ]}
      {...props}
    >
      {children}
    </View>
  );
};
