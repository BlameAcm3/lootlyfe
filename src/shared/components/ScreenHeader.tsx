import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/shared/components/Text';
import { useTheme } from '@/shared/hooks/useTheme';

type Props = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  align?: 'left' | 'center';
  children?: ReactNode;
};

export const ScreenHeader = ({ title, subtitle, eyebrow, align = 'left', children }: Props) => {
  const { spacing } = useTheme();
  const textAlign = align === 'center' ? 'center' : 'left';

  return (
    <View
      style={{
        marginBottom: spacing.lg,
        gap: spacing.sm,
        alignItems: align === 'center' ? 'center' : 'stretch',
      }}
    >
      {eyebrow ? (
        <Text
          variant="caption"
          color="primary"
          style={{ textTransform: 'uppercase', letterSpacing: 1.2, textAlign }}
        >
          {eyebrow}
        </Text>
      ) : null}
      <Text variant="h1" style={{ textAlign }}>
        {title}
      </Text>
      {subtitle ? (
        <Text variant="body" color="muted" style={{ textAlign, maxWidth: align === 'center' ? 340 : undefined }}>
          {subtitle}
        </Text>
      ) : null}
      {children}
    </View>
  );
};
