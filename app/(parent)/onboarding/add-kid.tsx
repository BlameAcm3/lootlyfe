import { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { useFamily } from '@/features/families';
import { useCreateKid, useKids } from '@/features/kids';
import {
  Button,
  EmptyState,
  Input,
  OnboardingHeroBar,
  Pressable,
  RpgGradientButton,
  Screen,
  ScreenHeader,
  Stack,
  Text,
} from '@/shared/components';
import { useTheme } from '@/shared/hooks';

/** 4×4 hero avatars (RPG / fantasy). */
const HERO_AVATARS = [
  '🧙',
  '🤴',
  '😎',
  '🧜‍♀️',
  '🧚',
  '🏹',
  '🦊',
  '🐉',
  '🦁',
  '🐺',
  '🦅',
  '🦉',
  '🐸',
  '🦄',
  '🦖',
  '🐲',
] as const;

const colorKeys = ['blue', 'purple', 'orange', 'green', 'pink', 'teal'] as const;

const colorDot: Record<(typeof colorKeys)[number], string> = {
  blue: '#3B82F6',
  purple: '#A855F7',
  orange: '#F97316',
  green: '#22C55E',
  pink: '#EC4899',
  teal: '#14B8A6',
};

export default function AddKidScreen() {
  const router = useRouter();
  const { spacing, radii, colors } = useTheme();
  const familyQuery = useFamily();
  const familyId = familyQuery.data?.id ?? null;
  const kidsQuery = useKids(familyId);
  const createKidMutation = useCreateKid();
  const [name, setName] = useState('');
  const [birthYear, setBirthYear] = useState(String(new Date().getFullYear() - 8));
  const [avatarEmoji, setAvatarEmoji] = useState<(typeof HERO_AVATARS)[number]>('🧙');
  const [colorTheme, setColorTheme] = useState<(typeof colorKeys)[number]>('blue');

  if (!familyId) {
    return (
      <Screen>
        <EmptyState
          title="Create your guild first"
          description="We need a family profile before you can add heroes."
        />
      </Screen>
    );
  }

  const kidCount = kidsQuery.data?.length ?? 0;

  return (
    <Screen scroll keyboardAvoiding>
      <Stack gap="lg">
        <OnboardingHeroBar step={2} />
        <Text
          variant="caption"
          color="muted"
          style={{ letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700' }}
        >
          Step 2 of 3
        </Text>
        <ScreenHeader
          title="Add your hero"
          subtitle="Set up your first adventurer. You can add more later from Family."
        />

        <View>
          <Text
            variant="caption"
            color="muted"
            style={{ letterSpacing: 1.5, marginBottom: 8, fontWeight: '700' }}
          >
            Hero name
          </Text>
          <Input accessibilityLabel="Hero name" placeholder="Caleb" value={name} onChangeText={setName} />
        </View>
        <Input
          accessibilityLabel="Birth year"
          label="Birth year"
          keyboardType="number-pad"
          value={birthYear}
          onChangeText={setBirthYear}
        />

        <Stack gap="sm">
          <Text
            variant="caption"
            color="muted"
            style={{ letterSpacing: 1.5, fontWeight: '700' }}
          >
            Choose avatar
          </Text>
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: spacing.sm,
              justifyContent: 'space-between',
            }}
          >
            {HERO_AVATARS.map((emoji) => {
              const selected = avatarEmoji === emoji;
              return (
                <Pressable
                  key={emoji}
                  accessibilityLabel={`Avatar ${emoji}`}
                  onPress={() => setAvatarEmoji(emoji)}
                  style={{
                    width: '22%',
                    aspectRatio: 1,
                    maxWidth: 72,
                    borderRadius: radii.md,
                    borderWidth: 2,
                    borderColor: selected ? colors.primaryLight : colors.border,
                    backgroundColor: selected ? colors.primaryMuted : colors.bgElevated,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: spacing.sm,
                  }}
                >
                  <Text style={{ fontSize: 28 }}>{emoji}</Text>
                </Pressable>
              );
            })}
          </View>
        </Stack>

        <Stack gap="sm">
          <Text variant="label">Accent color</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
            {colorKeys.map((color) => {
              const selected = colorTheme === color;
              return (
                <Pressable
                  key={color}
                  accessibilityLabel={`Color ${color}`}
                  onPress={() => setColorTheme(color)}
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: radii.pill,
                    backgroundColor: colorDot[color],
                    borderWidth: selected ? 3 : 0,
                    borderColor: colors.bgElevated,
                  }}
                />
              );
            })}
          </View>
        </Stack>

        <RpgGradientButton
          accessibilityLabel={kidCount > 0 ? 'Add another hero' : 'Summon hero'}
          label={kidCount > 0 ? 'Add another hero' : 'Summon hero'}
          loading={createKidMutation.isPending}
          onPress={async () => {
            const trimmed = name.trim();
            if (!trimmed) return;
            const isFirst = kidCount === 0;
            await createKidMutation.mutateAsync({
              familyId,
              displayName: trimmed,
              avatarEmoji,
              birthYear: Number.parseInt(birthYear, 10),
              colorTheme,
            });
            setName('');
            if (isFirst) {
              router.replace({
                pathname: '/(parent)/onboarding/hero-ready',
                params: { kidName: trimmed, avatar: avatarEmoji },
              });
            }
          }}
        />

        {kidCount > 0 ? (
          <Stack gap="md">
            <Text variant="bodySm" color="muted" style={{ textAlign: 'center' }}>
              {kidCount} hero{kidCount === 1 ? '' : 'es'} in your guild
            </Text>
            <Button
              accessibilityLabel="Continue to starter quests"
              label="Continue →"
              fullWidth
              variant="secondary"
              onPress={() => router.replace('/(parent)/onboarding/starter-chores')}
            />
          </Stack>
        ) : (
          <EmptyState title="Add your first hero" description="Quests are assigned to heroes so we need one profile to continue." />
        )}
      </Stack>
    </Screen>
  );
}
