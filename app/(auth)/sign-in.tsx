import { useMemo } from 'react';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { formatAuthError, useSignIn } from '@/features/auth';
import { Button, Card, Input } from '../../components/ui';
import { useLexicon } from '../../hooks/useLexicon';

type SignInForm = {
  email: string;
  password: string;
};

export default function SignInScreen() {
  const { t } = useLexicon();
  const mutation = useSignIn();

  const schema = useMemo(
    () =>
      z.object({
        email: z.string().email(t('auth_invalid_email')),
        password: z.string().min(8, t('auth_password_min')),
      }),
    [t],
  );

  const form = useForm<SignInForm>({
    defaultValues: { email: '', password: '' },
    resolver: zodResolver(schema),
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    try {
      await mutation.mutateAsync(values);
    } catch {
      // mutation.error renders below; avoid unhandled rejection.
    }
  });

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <View className="items-center gap-1 pt-6">
            <Text className="text-text-primary text-3xl font-extrabold">
              {t('auth_signin_title')}
            </Text>
            <Text className="text-text-muted max-w-xs text-center text-sm">
              {t('auth_signin_subtitle')}
            </Text>
          </View>

          <Card className="gap-4">
            <Controller
              control={form.control}
              name="email"
              render={({ field, fieldState }) => (
                <Input
                  accessibilityLabel={t('auth_email_label')}
                  label={t('auth_email_label')}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
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
                  accessibilityLabel={t('auth_password_label')}
                  label={t('auth_password_label')}
                  autoCapitalize="none"
                  autoComplete="password"
                  secureTextEntry
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  value={field.value}
                  error={fieldState.error?.message}
                />
              )}
            />

            {mutation.error ? (
              <Text className="text-danger text-xs">{formatAuthError(mutation.error)}</Text>
            ) : null}

            <Button
              accessibilityLabel={t('auth_sign_in_action')}
              label={t('auth_sign_in_action')}
              disabled={mutation.isPending}
              onPress={handleSubmit}
            />

            {/*
             * EXTENSION POINT (AGENTS.md > Authentication): Sign in with Apple
             * and Sign in with Google buttons land here. Requires
             * expo-apple-authentication / @react-native-google-signin plus
             * supabase.auth.signInWithIdToken — deferred.
             */}
          </Card>

          <Text className="text-text-muted text-center text-sm">
            {t('auth_need_account')}{' '}
            <Link href="/(auth)/sign-up" className="text-accent-info font-bold">
              {t('auth_create_account_action')}
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
