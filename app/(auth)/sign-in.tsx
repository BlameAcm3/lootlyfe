import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { formatAuthError, useSignIn } from '@/features/auth';
import { Button, Input, Pressable, Screen, Stack, Text } from '@/shared/components';
import { useTheme } from '@/shared/hooks';

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const { spacing, radii, colors, shadows, colorScheme, setColorScheme } = useTheme();
  const mutation = useSignIn();
  const form = useForm<SignInForm>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(signInSchema),
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
    } catch {
      // Error is stored on mutation.error for display; swallow rejection to avoid uncaught promise.
    }
  });

  const handleMagicLink = async () => {
    const email = form.getValues('email');
    if (!email) {
      form.setError('email', { message: 'Please enter an email first.' });
      return;
    }
    try {
      await mutation.mutateAsync({ email, magicLink: true });
    } catch {
      // mutation.error handles UI
    }
  };

  const cycleTheme = () => {
    setColorScheme(colorScheme === 'dark' ? 'light' : colorScheme === 'light' ? 'system' : 'dark');
  };

  return (
    <Screen keyboardAvoiding scroll>
      <Stack gap="2xl">
        <View style={{ alignItems: 'center', paddingTop: spacing['2xl'], gap: spacing.sm }}>
          <Text variant="display" style={{ color: colors.primary }}>
            Lootlyfe
          </Text>
          <Text variant="body" color="muted" style={{ textAlign: 'center', maxWidth: 300 }}>
            Turn chores into points, streaks, and rewards your family can feel good about.
          </Text>
        </View>

        <View
          style={{
            backgroundColor: colors.bgElevated,
            borderRadius: radii.xl,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.xl,
            ...shadows.md,
          }}
        >
          <Stack gap="lg">
            <Text variant="h2">Welcome back</Text>
            <Text variant="bodySm" color="muted">
              Sign in to manage today&apos;s chores and approvals.
            </Text>

            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Input
                  accessibilityLabel="Email"
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                  label="Email"
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  value={field.value}
                  error={fieldState.error?.message}
                />
              )}
            />

            <Controller
              control={form.control}
              name="password"
              render={({ field, fieldState }) => (
                <Input
                  accessibilityLabel="Password"
                  autoCapitalize="none"
                  autoComplete="password"
                  label="Password"
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  secureTextEntry
                  value={field.value}
                  error={fieldState.error?.message}
                />
              )}
            />

            {mutation.error ? (
              <Text variant="caption" color="danger">
                {formatAuthError(mutation.error)}
              </Text>
            ) : null}

            <Button
              accessibilityLabel="Sign in with email"
              label="Sign in"
              fullWidth
              loading={mutation.isPending}
              onPress={handleSubmit}
            />
            <Button
              accessibilityLabel="Send magic link"
              label="Email me a magic link"
              fullWidth
              onPress={handleMagicLink}
              variant="secondary"
              disabled={mutation.isPending}
            />
          </Stack>
        </View>

        <Text variant="bodySm" style={{ textAlign: 'center' }}>
          <Link href="/(auth)/welcome">Welcome screen</Link>
        </Text>
        <Text variant="bodySm" style={{ textAlign: 'center' }}>
          New to Lootlyfe? <Link href="/(auth)/sign-up">Create an account</Link>
        </Text>

        <Pressable
          accessibilityLabel="Cycle light, dark, and system theme"
          onPress={cycleTheme}
          style={{ alignSelf: 'center', paddingVertical: spacing.sm }}
        >
          <Text variant="caption" color="muted">
            Appearance: {colorScheme}
          </Text>
        </Pressable>
      </Stack>
    </Screen>
  );
}
