import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, View } from 'react-native';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { formatAuthError, useSignUp } from '@/features/auth';
import { Button, Input, Screen, Stack, Text } from '@/shared/components';
import { useTheme } from '@/shared/hooks';

const signUpSchema = z
  .object({
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: 'Passwords must match.',
    path: ['confirmPassword'],
  });

type SignUpForm = z.infer<typeof signUpSchema>;

export default function SignUpScreen() {
  const { spacing, radii, colors, shadows } = useTheme();
  const mutation = useSignUp();
  const form = useForm<SignUpForm>({
    defaultValues: { email: '', password: '', confirmPassword: '' },
    resolver: zodResolver(signUpSchema),
  });

  const handleSubmit = form.handleSubmit(async ({ email, password }) => {
    try {
      const data = await mutation.mutateAsync({ email, password });
      if (data.user && !data.session) {
        Alert.alert(
          'Confirm your email',
          'We sent you a confirmation link. Open it, then return here and sign in. If your project disables email confirmation, you can sign in immediately.',
        );
      }
    } catch {
      // mutation.error handles UI; avoid uncaught (in promise) from mutateAsync.
    }
  });

  return (
    <Screen keyboardAvoiding scroll>
      <Stack gap="2xl">
        <View style={{ alignItems: 'center', paddingTop: spacing.xl, gap: spacing.sm }}>
          <Text variant="display" style={{ color: colors.primary }}>
            Join Lootlyfe
          </Text>
          <Text variant="body" color="muted" style={{ textAlign: 'center', maxWidth: 300 }}>
            One account for parents. Add your family, kids, and routines in a few guided steps.
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
            <Text variant="h2">Create your account</Text>

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
                  label="Confirm password"
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
              accessibilityLabel="Create account"
              label="Create account"
              fullWidth
              loading={mutation.isPending}
              onPress={handleSubmit}
            />
          </Stack>
        </View>

        <Text variant="bodySm" style={{ textAlign: 'center' }}>
          Already have an account? <Link href="/(auth)/sign-in">Sign in</Link>
        </Text>
      </Stack>
    </Screen>
  );
}
