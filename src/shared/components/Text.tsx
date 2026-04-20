import { Text as RNText, type TextProps, type StyleProp, type TextStyle } from 'react-native';

import { useTheme } from '@/shared/hooks/useTheme';

type Variant = keyof ReturnType<typeof useTheme>['typography'];

type Props = TextProps & {
  variant?: Variant;
  color?: 'default' | 'muted' | 'inverse' | 'primary' | 'danger' | 'success';
};

const colorStyleMap: Record<NonNullable<Props['color']>, keyof ReturnType<typeof useTheme>['colors']> = {
  default: 'text',
  muted: 'textMuted',
  inverse: 'textInverse',
  primary: 'primary',
  danger: 'danger',
  success: 'success',
};

export const Text = ({ variant = 'body', style, color = 'default', ...props }: Props) => {
  const { typography, colors } = useTheme();
  const typographyStyle = typography[variant];
  const composedStyle: StyleProp<TextStyle> = [
    typographyStyle,
    { color: colors[colorStyleMap[color]] },
    style,
  ];

  return <RNText allowFontScaling style={composedStyle} {...props} />;
};
