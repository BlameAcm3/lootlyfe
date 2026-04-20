import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { View } from 'react-native';

import { Button, Input, Pressable, Row, Stack, Text } from '@/shared/components';
import { useTheme } from '@/shared/hooks';
import type { ChoreFormValues } from '@/features/chores/types';

const schema = z.object({
  title: z.string().min(1, 'Title is required.'),
  description: z.string(),
  points: z.number().int().min(1).max(1000),
  scheduleType: z.enum(['one_time', 'daily', 'weekly']),
  weeklyDays: z.array(z.number().int().min(0).max(6)),
  assignedKidIds: z.array(z.string()).min(1, 'Assign at least one kid.'),
  requiresApproval: z.boolean(),
});

type Props = {
  initialValues?: ChoreFormValues;
  kidOptions: Array<{ id: string; name: string }>;
  onSubmit: (values: ChoreFormValues) => Promise<void> | void;
  submitLabel: string;
  loading?: boolean;
};

const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const pointPresets = [1, 5, 10, 25] as const;

export const ChoreForm = ({ initialValues, kidOptions, onSubmit, submitLabel, loading = false }: Props) => {
  const { spacing, colors, radii } = useTheme();
  const form = useForm<ChoreFormValues>({
    resolver: zodResolver(schema),
    defaultValues: initialValues ?? {
      title: '',
      description: '',
      points: 5,
      scheduleType: 'daily',
      weeklyDays: [1, 3, 5],
      assignedKidIds: [],
      requiresApproval: true,
    },
  });

  return (
    <Stack gap="md">
      <Controller
        control={form.control}
        name="title"
        render={({ field, fieldState }) => (
          <Input
            accessibilityLabel="Chore title"
            label="Title"
            onChangeText={field.onChange}
            value={field.value}
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={form.control}
        name="description"
        render={({ field, fieldState }) => (
          <Input
            accessibilityLabel="Chore description"
            label="Description"
            multiline
            onChangeText={field.onChange}
            value={field.value}
            error={fieldState.error?.message}
          />
        )}
      />

      <Controller
        control={form.control}
        name="points"
        render={({ field }) => (
          <Stack gap="sm">
            <Text variant="label">Points</Text>
            <Row gap="sm">
              {pointPresets.map((preset) => (
                <Button
                  key={preset}
                  accessibilityLabel={`Set ${preset} points`}
                  label={String(preset)}
                  variant={field.value === preset ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => field.onChange(preset)}
                />
              ))}
            </Row>
          </Stack>
        )}
      />

      <Controller
        control={form.control}
        name="scheduleType"
        render={({ field }) => (
          <Stack gap="sm">
            <Text variant="label">Schedule</Text>
            <Row gap="sm">
              {(['one_time', 'daily', 'weekly'] as const).map((option) => (
                <Button
                  key={option}
                  accessibilityLabel={`Set schedule ${option}`}
                  label={option.replace('_', ' ')}
                  variant={field.value === option ? 'primary' : 'secondary'}
                  size="sm"
                  onPress={() => field.onChange(option)}
                />
              ))}
            </Row>
          </Stack>
        )}
      />

      {form.watch('scheduleType') === 'weekly' ? (
        <Controller
          control={form.control}
          name="weeklyDays"
          render={({ field }) => (
            <Stack gap="sm">
              <Text variant="label">Weekly days</Text>
              <Row gap="xs" style={{ flexWrap: 'wrap' }}>
                {weekdays.map((day, index) => {
                  const selected = field.value.includes(index);
                  return (
                    <Button
                      key={day}
                      accessibilityLabel={`Toggle ${day}`}
                      label={day}
                      size="sm"
                      variant={selected ? 'primary' : 'secondary'}
                      onPress={() => {
                        const next = selected
                          ? field.value.filter((value) => value !== index)
                          : [...field.value, index];
                        field.onChange(next);
                      }}
                    />
                  );
                })}
              </Row>
            </Stack>
          )}
        />
      ) : null}

      <Controller
        control={form.control}
        name="assignedKidIds"
        render={({ field, fieldState }) => (
          <Stack gap="sm">
            <Text variant="label">Assign to kid(s)</Text>
            {kidOptions.map((kid) => {
              const selected = field.value.includes(kid.id);
              return (
                <Pressable
                  key={kid.id}
                  accessibilityLabel={`Assign chore to ${kid.name}`}
                  onPress={() => {
                    const next = selected
                      ? field.value.filter((id) => id !== kid.id)
                      : [...field.value, kid.id];
                    field.onChange(next);
                  }}
                  style={{
                    backgroundColor: selected ? colors.surface : colors.bgElevated,
                    borderColor: colors.border,
                    borderRadius: radii.md,
                    borderWidth: 1,
                    padding: spacing.md,
                  }}
                >
                  <Text>{selected ? '☑' : '☐'} {kid.name}</Text>
                </Pressable>
              );
            })}
            {fieldState.error ? <Text variant="caption" color="danger">{fieldState.error.message}</Text> : null}
          </Stack>
        )}
      />

      <Controller
        control={form.control}
        name="requiresApproval"
        render={({ field }) => (
          <Pressable
            accessibilityLabel="Toggle requires approval"
            onPress={() => field.onChange(!field.value)}
            style={{
              backgroundColor: colors.bgElevated,
              borderColor: colors.border,
              borderRadius: radii.md,
              borderWidth: 1,
              padding: spacing.md,
            }}
          >
            <Text>{field.value ? '☑' : '☐'} Requires parent approval</Text>
          </Pressable>
        )}
      />

      {form.formState.errors.root?.message ? (
        <Text variant="caption" color="danger">{form.formState.errors.root.message}</Text>
      ) : null}

      <View style={{ marginTop: spacing.md }}>
        <Button
          accessibilityLabel={submitLabel}
          label={submitLabel}
          loading={loading}
          onPress={form.handleSubmit(async (values) => {
            await onSubmit(values);
          })}
        />
      </View>
    </Stack>
  );
};
