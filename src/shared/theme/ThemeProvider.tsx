import type { PropsWithChildren } from 'react';
import { StatusBar } from 'expo-status-bar';

import { useTheme } from '@/shared/hooks/useTheme';

export const ThemeProvider = ({ children }: PropsWithChildren) => {
  const { colorScheme } = useTheme();
  const resolvedScheme = colorScheme === 'system' ? 'auto' : colorScheme;

  return (
    <>
      <StatusBar style={resolvedScheme === 'dark' ? 'light' : 'dark'} />
      {children}
    </>
  );
};
