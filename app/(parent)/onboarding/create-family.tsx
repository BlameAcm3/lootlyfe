import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { View } from 'react-native';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';

import { useCreateFamily } from '@/features/families';
import {
  Input,
  OnboardingHeroBar,
  RpgGradientButton,
  Screen,
  ScreenHeader,
  Stack,
  Text,
} from '@/shared/components';
import { formatSupabaseError } from '@/shared/lib/formatSupabaseError';
import { MINIMAL_ONBOARDING } from '@/shared/lib/featureFlags';

const schema = z.object({
  name: z.string().min(2, 'Enter at least 2 characters.'),
  parentPin: z.string().min(4, 'PIN must be at least 4 digits.'),
});

type FormValues = z.infer<typeof schema>;

export default function CreateFamilyScreen() {
  const mutation = useCreateFamily();
  const router = useRouter();
  const guessedTimezone = useMemo(() => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC', []);
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      parentPin: '',
    },
  });

  return (
    <Screen scroll keyboardAvoiding>
      <Stack gap="xl">
        <OnboardingHeroBar step={1} />
        <Text
          variant="caption"
          color="muted"
          style={{ letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700' }}
        >
          Step 1 of 3
        </Text>
        <ScreenHeader
          title="Name your guild"
          subtitle="Every great adventure needs a name. You will use your PIN to unlock parent mode."
        />

        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <View>
              <Text
                variant="caption"
                color="muted"
                style={{ letterSpacing: 1.5, marginBottom: 8, fontWeight: '700' }}
              >
                Family name
              </Text>
              <Input
                accessibilityLabel="Guild family name"
                placeholder="e.g. The Smiths"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            </View>
          )}
        />
        <Controller
          control={form.control}
          name="parentPin"
          render={({ field, fieldState }) => (
            <View>
              <Text
                variant="caption"
                color="muted"
                style={{ letterSpacing: 1.5, marginBottom: 8, fontWeight: '700' }}
              >
                Parent PIN
              </Text>
              <Input
                accessibilityLabel="Parent PIN"
                placeholder="4+ digits"
                secureTextEntry
                keyboardType="number-pad"
                value={field.value}
                onChangeText={field.onChange}
                error={fieldState.error?.message}
              />
            </View>
          )}
        />
        <Text variant="bodySm" color="muted">
          Time zone: {guessedTimezone} (change later in Family settings.)
        </Text>

        {mutation.isError ? (
          <Text variant="caption" color="danger">
            {formatSupabaseError(mutation.error)}
          </Text>
        ) : null}

        <RpgGradientButton
          accessibilityLabel="Create guild and continue"
          label="Continue →"
          loading={mutation.isPending}
          onPress={form.handleSubmit(async (values) => {
            try {
              await mutation.mutateAsync({
                name: values.name,
                timezone: guessedTimezone,
                parentPin: values.parentPin,
              });
              router.replace(
                MINIMAL_ONBOARDING ? '/(parent)/(tabs)' : '/(parent)/onboarding/add-kid',
              );
            } catch {
              // Error shown via mutation.isError
            }
          })}
        />
      </Stack>
    </Screen>
  );
}
