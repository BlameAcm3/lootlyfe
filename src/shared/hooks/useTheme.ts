import { useColorScheme } from 'react-native';

import { darkColors, lightColors, spacing, typography, radii, shadows } from '@/shared/theme';
import { useThemeStore } from '@/stores/themeStore';

export const useTheme = () => {
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const setColorScheme = useThemeStore((state) => state.setColorScheme);
  const systemColorScheme = useColorScheme();
  const resolvedColorScheme = colorScheme === 'system' ? (systemColorScheme ?? 'light') : colorScheme;
  const colors = resolvedColorScheme === 'dark' ? darkColors : lightColors;

  return {
    colors,
    radii,
    shadows,
    spacing,
    typography,
    colorScheme,
    setColorScheme,
  };
};
