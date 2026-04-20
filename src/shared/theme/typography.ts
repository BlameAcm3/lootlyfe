import { PixelRatio } from 'react-native';

type TypographyToken = {
  fontSize: number;
  lineHeight: number;
  fontWeight: '400' | '500' | '600' | '700';
};

const scaleType = (size: number): number => {
  const fontScale = PixelRatio.getFontScale();
  return Math.round(size * fontScale);
};

const token = (
  fontSize: number,
  lineHeight: number,
  fontWeight: TypographyToken['fontWeight'],
): TypographyToken => ({
  fontSize: scaleType(fontSize),
  lineHeight: scaleType(lineHeight),
  fontWeight,
});

export const typography = {
  display: token(34, 42, '700'),
  h1: token(28, 36, '700'),
  h2: token(24, 32, '700'),
  h3: token(20, 28, '600'),
  body: token(16, 24, '400'),
  bodySm: token(14, 20, '400'),
  caption: token(12, 16, '500'),
  label: token(14, 20, '600'),
  mono: token(13, 18, '500'),
} as const;

export type Typography = typeof typography;
