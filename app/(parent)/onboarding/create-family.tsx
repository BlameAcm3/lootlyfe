import { useMemo } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';

import { useCreateFamily } from '@/features/families';
import { Button, Input, Screen, Stack, Text } from '@/shared/components';

const schema = z.object({
  name: z.string().min(2),
  timezone: z.string().min(2),
  parentPin: z.string().min(4),
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
      timezone: guessedTimezone,
      parentPin: '',
    },
  });

  return (
    <Screen scroll keyboardAvoiding>
      <Stack gap="lg">
        <Text variant="h1">Create your family</Text>
        <Controller
          control={form.control}
          name="name"
          render={({ field, fieldState }) => (
            <Input
              accessibilityLabel="Family name"
              label="Family name"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="timezone"
          render={({ field, fieldState }) => (
            <Input
              accessibilityLabel="Timezone"
              label="Timezone"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Controller
          control={form.control}
          name="parentPin"
          render={({ field, fieldState }) => (
            <Input
              accessibilityLabel="Parent PIN"
              label="Parent PIN"
              secureTextEntry
              keyboardType="number-pad"
              value={field.value}
              onChangeText={field.onChange}
              error={fieldState.error?.message}
            />
          )}
        />
        <Button
          accessibilityLabel="Create family and continue"
          label="Continue"
          loading={mutation.isPending}
          onPress={form.handleSubmit(async (values) => {
            await mutation.mutateAsync(values);
            router.replace('/(parent)/onboarding/add-kid');
          })}
        />
      </Stack>
    </Screen>
  );
}
