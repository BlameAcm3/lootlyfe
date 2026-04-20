import { View } from 'react-native';

import { Pressable } from '@/shared/components/Pressable';
import { Text } from '@/shared/components/Text';
import { useTheme } from '@/shared/hooks';
import { useAnalyticsDebugStore } from '@/shared/lib/posthog';

export const AnalyticsDebugOverlay = () => {
  const { colors, spacing, radii } = useTheme();
  const enabled = useAnalyticsDebugStore((state) => state.enabled);
  const events = useAnalyticsDebugStore((state) => state.events);
  const toggleEnabled = useAnalyticsDebugStore((state) => state.toggleEnabled);

  if (!__DEV__) return null;

  return (
    <View style={{ bottom: spacing['4xl'], position: 'absolute', right: spacing.lg, zIndex: 50 }}>
      <Pressable
        accessibilityLabel="Toggle analytics debug overlay"
        onPress={toggleEnabled}
        style={{
          alignSelf: 'flex-end',
          backgroundColor: colors.accent,
          borderRadius: radii.pill,
          marginBottom: spacing.sm,
          paddingHorizontal: spacing.md,
          paddingVertical: spacing.sm,
        }}
      >
        <Text variant="caption" style={{ color: colors.primaryText }}>
          Analytics
        </Text>
      </Pressable>

      {enabled ? (
        <View
          style={{
            backgroundColor: colors.bgElevated,
            borderColor: colors.border,
            borderRadius: radii.lg,
            borderWidth: 1,
            maxWidth: 300,
            padding: spacing.md,
          }}
        >
          <Text variant="label">Last 10 events</Text>
          <View style={{ gap: spacing.xs, marginTop: spacing.sm }}>
            {events.length === 0 ? <Text variant="caption" color="muted">No events yet.</Text> : null}
            {events.map((event) => (
              <Text key={`${event.timestamp}-${event.name}`} variant="caption" color="muted">
                {event.name}
              </Text>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
};
