import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { useSignUp } from '@/features/auth';
import { Button, Input, Screen, Stack, Text } from '@/shared/components';
import { useTheme } from '@/shared/hooks';

const signUpSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  confirmPassword: z.string().min(8),
}).refine((value) => value.password === value.confirmPassword, {
  message: 'Passwords must match.',
  path: ['confirmPassword'],
});

type SignUpForm = z.infer<typeof signUpSchema>;

export default function SignUpScreen() {
  const { spacing } = useTheme();
  const mutation = useSignUp();
  const form = useForm<SignUpForm>({
    defaultValues: { email: '', password: '', confirmPassword: '' },
    resolver: zodResolver(signUpSchema),
  });

  const handleSubmit = form.handleSubmit(async ({ email, password }) => {
    await mutation.mutateAsync({ email, password });
  });

  return (
    <Screen keyboardAvoiding scroll>
      <Stack gap="lg">
        <Text variant="h1">Create your account</Text>
        <Text variant="bodySm" color="muted">
          Start your family chores system in less than a minute.
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
              autoComplete="password-new"
              label="Password"
              onBlur={field.onBlur}
              onChangeText={field.onChange}
              secureTextEntry
              value={field.value}
              error={fieldState.error?.message}
            />
          )}
        />

        <Controller
          control={form.control}
          name="confirmPassword"
          render={({ field, fieldState }) => (
            <Input
              accessibilityLabel="Confirm password"
              autoCapitalize="none"
              autoComplete="password-new"
              label="Confirm Password"
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
          accessibilityLabel="Create account"
          label="Create Account"
          loading={mutation.isPending}
          onPress={handleSubmit}
        />

        <Text variant="bodySm" style={{ marginTop: spacing.md }}>
          Already have an account? <Link href="/(auth)/sign-in">Sign in</Link>
        </Text>
      </Stack>
    </Screen>
  );
}
