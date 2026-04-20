import { View, type DimensionValue, type ViewProps } from 'react-native';

import { useTheme } from '@/shared/hooks/useTheme';

type Props = ViewProps & {
  width?: DimensionValue;
  height?: number;
  rounded?: keyof ReturnType<typeof useTheme>['radii'];
};

export const Skeleton = ({ width = '100%', height = 16, rounded = 'md', style, ...props }: Props) => {
  const { colors, radii } = useTheme();
  return (
    <View
      accessibilityLabel="Loading content"
      accessibilityRole="progressbar"
      style={[
        {
          backgroundColor: colors.disabled,
          borderRadius: radii[rounded],
          height,
          width,
        },
        style,
      ]}
      {...props}
    />
  );
};
