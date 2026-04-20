import { useState } from 'react';
import { useRouter } from 'expo-router';

import { useFamily } from '@/features/families';
import { useCreateKid, useKids } from '@/features/kids';
import { Button, EmptyState, Input, Pressable, Screen, Stack, Text } from '@/shared/components';
import { useTheme } from '@/shared/hooks';

const emojis = ['🦊', '🦄', '🐯', '🐶', '🐼', '🐸', '🦖', '🐨'];
const colors = ['blue', 'purple', 'orange', 'green', 'pink', 'teal'];

export default function AddKidScreen() {
  const router = useRouter();
  const { spacing, radii } = useTheme();
  const familyQuery = useFamily();
  const familyId = familyQuery.data?.id ?? null;
  const kidsQuery = useKids(familyId);
  const createKidMutation = useCreateKid();
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState(String(new Date().getFullYear() - 8));
  const [avatarEmoji, setAvatarEmoji] = useState('🦊');
  const [colorTheme, setColorTheme] = useState('blue');

  if (!familyId) {
    return (
      <Screen>
        <EmptyState title="Create your family first" description="Start with your family details before adding kids." />
      </Screen>
    );
  }

  return (
    <Screen scroll keyboardAvoiding>
      <Stack gap="lg">
        <Text variant="h1">Add at least one kid</Text>
        <Input accessibilityLabel="Kid name" label="Kid name" value={name} onChangeText={setName} />
        <Input
          accessibilityLabel="Birth year"
          label="Birth year"
          keyboardType="number-pad"
          value={birthYear}
          onChangeText={setBirthYear}
        />
        <Text variant="label">Avatar emoji</Text>
        <Stack gap="sm" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {emojis.map((emoji) => (
            <Pressable
              key={emoji}
              accessibilityLabel={`Select avatar ${emoji}`}
              onPress={() => setAvatarEmoji(emoji)}
              style={{
                borderRadius: radii.md,
                borderWidth: 1,
                padding: spacing.sm,
              }}
            >
              <Text>{emoji}</Text>
            </Pressable>
          ))}
        </Stack>
        <Text variant="label">Color theme</Text>
        <Stack gap="sm" style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {colors.map((color) => (
            <Button
              key={color}
              accessibilityLabel={`Select color ${color}`}
              label={color}
              size="sm"
              variant={colorTheme === color ? 'primary' : 'secondary'}
              onPress={() => setColorTheme(color)}
            />
          ))}
        </Stack>
        <Button
          accessibilityLabel="Add kid"
          label="Add kid"
          loading={createKidMutation.isPending}
          onPress={async () => {
            if (!name.trim()) return;
            await createKidMutation.mutateAsync({
              familyId,
              displayName: name.trim(),
              avatarEmoji,
              birthYear: Number.parseInt(birthYear, 10),
              colorTheme,
            });
            setName('');
          }}
        />
        {(kidsQuery.data?.length ?? 0) > 0 ? (
          <Button
            accessibilityLabel="Continue to starter chores"
            label="Continue"
            onPress={() => router.replace('/(parent)/onboarding/starter-chores')}
          />
        ) : (
          <EmptyState title="No kids yet" description="Add your first kid to continue onboarding." />
        )}
      </Stack>
    </Screen>
  );
}
