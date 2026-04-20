import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { useSignIn } from '@/features/auth';
import { Button, Input, Screen, Stack, Text } from '@/shared/components';
import { useTheme } from '@/shared/hooks';

const signInSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type SignInForm = z.infer<typeof signInSchema>;

export default function SignInScreen() {
  const { spacing, colorScheme, setColorScheme } = useTheme();
  const mutation = useSignIn();
  const form = useForm<SignInForm>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(signInSchema),
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(values);
  });

  const handleMagicLink = async () => {
    const email = form.getValues('email');
    if (!email) {
      form.setError('email', { message: 'Please enter an email first.' });
      return;
    }
    await mutation.mutateAsync({ email, magicLink: true });
  };

  return (
    <Screen keyboardAvoiding scroll>
      <Stack gap="lg">
        <Text variant="h1">Welcome back</Text>
        <Text variant="bodySm" color="muted">
          Sign in to manage chores, rewards, and family progress.
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
            {mutation.error.message}
          </Text>
        ) : null}

        <Button
          accessibilityLabel="Sign in with email"
          label="Sign In"
          loading={mutation.isPending}
          onPress={handleSubmit}
        />
        <Button
          accessibilityLabel="Send magic link"
          label="Send Magic Link"
          onPress={handleMagicLink}
          variant="secondary"
          disabled={mutation.isPending}
        />
        <Button
          accessibilityLabel="Toggle color scheme"
          label={`Theme: ${colorScheme} (toggle)`}
          onPress={() =>
            setColorScheme(colorScheme === 'dark' ? 'light' : colorScheme === 'light' ? 'system' : 'dark')
          }
          variant="ghost"
          disabled={mutation.isPending}
        />

        <Text variant="bodySm" style={{ marginTop: spacing.md }}>
          New to Lootlyfe? <Link href="/(auth)/sign-up">Create an account</Link>
        </Text>
      </Stack>
    </Screen>
  );
}
