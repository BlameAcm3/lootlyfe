import { colors, spacing, typography } from '@/shared/theme';

export const useTheme = () => {
  return {
    colors,
    spacing,
    typography,
    isDark: false,
  };
};
