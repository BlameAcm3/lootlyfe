import { View } from 'react-native';

import { Text } from '@/shared/components/Text';
import { useTheme } from '@/shared/hooks/useTheme';

const STEPS = [
  { step: 1, label: 'Family' },
  { step: 2, label: 'Kids' },
  { step: 3, label: 'Chores' },
] as const;

type Props = {
  current: 1 | 2 | 3;
};

export const OnboardingSteps = ({ current }: Props) => {
  const { colors, spacing, radii } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
        {STEPS.map((item, index) => {
          const done = current > item.step;
          const active = current === item.step;
          return (
            <View key={item.step} style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: radii.pill,
                  backgroundColor: done ? colors.primary : active ? colors.primaryMuted : colors.surface,
                  borderWidth: active ? 2 : 1,
                  borderColor: active ? colors.primary : colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text
                  variant="caption"
                  style={{
                    color: done ? colors.primaryText : active ? colors.primary : colors.textMuted,
                    fontWeight: '700',
                  }}
                >
                  {done ? '✓' : item.step}
                </Text>
              </View>
              {index < STEPS.length - 1 ? (
                <View
                  style={{
                    width: 36,
                    height: 3,
                    marginHorizontal: spacing.xs,
                    borderRadius: 2,
                    backgroundColor: current > item.step ? colors.primary : colors.border,
                  }}
                />
              ) : null}
            </View>
          );
        })}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xl }}>
        {STEPS.map((item) => (
          <Text
            key={item.label}
            variant="caption"
            color={current === item.step ? 'primary' : 'muted'}
            style={{ width: 72, textAlign: 'center' }}
          >
            {item.label}
          </Text>
        ))}
      </View>
    </View>
  );
};
