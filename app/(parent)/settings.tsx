import { useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useSignOut } from '@/features/auth';
import { Button, Pressable, Screen, ScreenHeader, Stack, Text } from '@/shared/components';
import { resetLocalStateAndSignOut } from '@/shared/lib/resetAppState';
import { useTheme } from '@/shared/hooks';
import { useThemeStore } from '@/stores/themeStore';

export default function ParentSettingsScreen() {
  const router = useRouter();
  const { spacing, radii, colors } = useTheme();
  const colorScheme = useThemeStore((state) => state.colorScheme);
  const setColorScheme = useThemeStore((state) => state.setColorScheme);
  const signOutMutation = useSignOut();
  const [resetting, setResetting] = useState(false);

  const cycleTheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : colorScheme === 'light' ? 'system' : 'dark');
  };

  const confirmFullReset = () => {
    Alert.alert(
      'Reset app & sign out',
      'This signs you out and clears theme, parent/kid mode, and cached data on this device. Your Supabase account still exists unless you delete it in the dashboard.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            setResetting(true);
            try {
              await resetLocalStateAndSignOut();
              router.replace('/(auth)/sign-in');
            } catch (e) {
              Alert.alert('Reset failed', e instanceof Error ? e.message : 'Try again.');
            } finally {
              setResetting(false);
            }
          },
        },
      ],
    );
  };

  return (
    <Screen scroll>
      <Stack gap="xl">
        <ScreenHeader
          title="App & account"
          subtitle="Appearance and local data. Edit family and kids from the Family tab."
        />

        <View
          style={{
            backgroundColor: colors.bgElevated,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Text variant="h3">Appearance</Text>
          <Pressable
            accessibilityLabel="Cycle theme"
            onPress={cycleTheme}
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.md,
              padding: spacing.md,
            }}
          >
            <Text>Theme: {colorScheme}</Text>
            <Text variant="caption" color="muted">
              Tap to cycle system, light, dark
            </Text>
          </Pressable>
        </View>

        <View
          style={{
            backgroundColor: colors.bgElevated,
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Text variant="h3">Session</Text>
          <Button
            accessibilityLabel="Sign out"
            label="Sign out"
            fullWidth
            variant="secondary"
            loading={signOutMutation.isPending}
            onPress={async () => {
              try {
                await signOutMutation.mutateAsync();
                router.replace('/(auth)/sign-in');
              } catch (e) {
                Alert.alert('Sign out failed', e instanceof Error ? e.message : 'Try again.');
              }
            }}
          />
        </View>

        <View
          style={{
            backgroundColor: colors.danger + '18',
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: colors.danger + '55',
            padding: spacing.lg,
            gap: spacing.md,
          }}
        >
          <Text variant="h3" color="danger">
            Start fresh on this device
          </Text>
          <Text variant="bodySm" color="muted">
            Clears saved preferences (theme, kid/parent mode) and signs you out. Does not delete your Supabase user or
            family data online.
          </Text>
          <Button
            accessibilityLabel="Reset app and sign out"
            label="Reset app & sign out"
            fullWidth
            variant="danger"
            loading={resetting}
            onPress={confirmFullReset}
          />
        </View>
      </Stack>
    </Screen>
  );
}
