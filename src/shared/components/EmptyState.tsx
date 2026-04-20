import type { ReactNode } from 'react';
import { View } from 'react-native';

import { Text } from '@/shared/components/Text';
import { useTheme } from '@/shared/hooks/useTheme';

type Props = {
  title: string;
  description?: string;
  icon?: ReactNode;
};

export const EmptyState = ({ title, description, icon }: Props) => {
  const { spacing } = useTheme();
  return (
    <View accessibilityRole="summary" style={{ alignItems: 'center', gap: spacing.sm, paddingVertical: spacing['2xl'] }}>
      {icon}
      <Text variant="h3">{title}</Text>
      {description ? (
        <Text variant="bodySm" color="muted" style={{ textAlign: 'center' }}>
          {description}
        </Text>
      ) : null}
    </View>
  );
};
