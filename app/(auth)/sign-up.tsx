import { useMemo, useState } from 'react';
import { Link } from 'expo-router';
import { Controller, useForm } from 'react-hook-form';
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

import { formatAuthError, useSignUp } from '@/features/auth';
import { Button, Card, Input } from '../../components/ui';
import { useLexicon } from '../../hooks/useLexicon';
import { useOnboardingStore } from '../../store/useOnboardingStore';

type SignUpForm = {
  email: string;
  password: string;
  confirmPassword: string;
};

export default function SignUpScreen() {
  const { t } = useLexicon();
  const mutation = useSignUp();
  const acceptConsent = useOnboardingStore((state) => state.acceptConsent);
  const [consentChecked, setConsentChecked] = useState(false);
  const [consentError, setConsentError] = useState<string | null>(null);

  const schema = useMemo(
    () =>
      z
        .object({
          email: z.string().email(t('auth_invalid_email')),
          password: z.string().min(8, t('auth_password_min')),
          confirmPassword: z.string().min(8, t('auth_password_min')),
        })
        .refine((value) => value.password === value.confirmPassword, {
          message: t('auth_passwords_match'),
          path: ['confirmPassword'],
        }),
    [t],
  );

  const form = useForm<SignUpForm>({
    defaultValues: { email: '', password: '', confirmPassword: '' },
    resolver: zodResolver(schema),
  });

  const handleSubmit = form.handleSubmit(async ({ email, password }) => {
    if (!consentChecked) {
      setConsentError(t('auth_consent_required'));
      return;
    }
    setConsentError(null);
    try {
      // Recorded locally now; written to consent_events (method
      // 'signup_checkbox') by the create_guild RPC, which is the first moment
      // a guild_id/npc_id exist to attach it to.
      acceptConsent();
      const data = await mutation.mutateAsync({ email, password });
      if (data.user && !data.session) {
        Alert.alert(t('auth_confirm_email_title'), t('auth_confirm_email_body'));
      }
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
              {t('auth_signup_title')}
            </Text>
            <Text className="text-text-muted max-w-xs text-center text-sm">
              {t('auth_signup_subtitle')}
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
                  autoComplete="password-new"
                  secureTextEntry
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
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
                  accessibilityLabel={t('auth_confirm_password_label')}
                  label={t('auth_confirm_password_label')}
                  autoCapitalize="none"
                  autoComplete="password-new"
                  secureTextEntry
                  onBlur={field.onBlur}
                  onChangeText={field.onChange}
                  value={field.value}
                  error={fieldState.error?.message}
                />
              )}
            />

            {/* Verified parental consent (COPPA): required to create an account. */}
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: consentChecked }}
              onPress={() => {
                setConsentChecked((checked) => !checked);
                setConsentError(null);
              }}
              className="flex-row items-start gap-3"
            >
              <View
                className={
                  consentChecked
                    ? 'bg-accent-info border-accent-info mt-0.5 h-5 w-5 items-center justify-center rounded border'
                    : 'border-text-muted mt-0.5 h-5 w-5 rounded border'
                }
              >
                {consentChecked ? <Text className="text-text-inverse text-xs font-black">✓</Text> : null}
              </View>
              <Text className="text-text-muted flex-1 text-xs leading-4">
                {t('auth_consent_label')}
              </Text>
            </Pressable>
            {consentError ? <Text className="text-danger text-xs">{consentError}</Text> : null}

            {mutation.error ? (
              <Text className="text-danger text-xs">{formatAuthError(mutation.error)}</Text>
            ) : null}

            <Button
              accessibilityLabel={t('auth_create_account_action')}
              label={t('auth_create_account_action')}
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
            {t('auth_have_account')}{' '}
            <Link href="/(auth)/sign-in" className="text-accent-info font-bold">
              {t('auth_sign_in_action')}
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
