import { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';

import { useSession } from '@/features/auth';
import { batchCreateStarterChores, starterChores } from '@/features/chores';
import { useFamily } from '@/features/families';
import { useKids } from '@/features/kids';
import {
  Button,
  EmptyState,
  OnboardingHeroBar,
  Pressable,
  Screen,
  ScreenHeader,
  Stack,
  Text,
} from '@/shared/components';
import { useTheme } from '@/shared/hooks';

export default function StarterChoresScreen() {
  const router = useRouter();
  const { spacing, radii, colors } = useTheme();
  const { user } = useSession();
  const familyQuery = useFamily();
  const kidsQuery = useKids(familyQuery.data?.id);
  const [selectedIds, setSelectedIds] = useState<string[]>(starterChores.slice(0, 3).map((chore) => chore.id));
  const [isSaving, setIsSaving] = useState(false);

  const averageAge = useMemo(() => {
    const years = (kidsQuery.data ?? []).map((kid) => kid.birth_year).filter((value): value is number => value !== null);
    if (years.length === 0) return 8;
    const avgYear = years.reduce((acc, year) => acc + year, 0) / years.length;
    return Math.max(4, new Date().getFullYear() - Math.floor(avgYear));
  }, [kidsQuery.data]);

  const choices = starterChores.filter((chore) => averageAge >= chore.minAge && averageAge <= chore.maxAge + 2);
  const kidIds = (kidsQuery.data ?? []).map((kid) => kid.id);

  if (!familyQuery.data?.id || kidIds.length === 0) {
    return (
      <Screen>
        <EmptyState title="Add a kid first" description="Starter chores need at least one kid in your family." />
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <Stack gap="xl">
        <OnboardingHeroBar step={3} />
        <Text
          variant="caption"
          color="muted"
          style={{ letterSpacing: 2, textTransform: 'uppercase', fontWeight: '700' }}
        >
          Step 3 of 3
        </Text>
        <ScreenHeader
          title="Pick starter quests"
          subtitle="We will create templates and assign them to every hero. Edit anytime from the Quests tab."
        />

        <Stack gap="md">
          {choices.map((chore) => {
            const selected = selectedIds.includes(chore.id);
            return (
              <Pressable
                key={chore.id}
                accessibilityLabel={`Toggle starter chore ${chore.title}`}
                onPress={() =>
                  setSelectedIds((current) =>
                    selected ? current.filter((id) => id !== chore.id) : [...current, chore.id],
                  )
                }
                style={{
                  backgroundColor: selected ? colors.primaryMuted : colors.bgElevated,
                  borderColor: selected ? colors.primary : colors.border,
                  borderRadius: radii.lg,
                  borderWidth: selected ? 2 : 1,
                  padding: spacing.lg,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md }}>
                  <View
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: radii.sm,
                      borderWidth: 2,
                      borderColor: selected ? colors.primary : colors.borderStrong,
                      backgroundColor: selected ? colors.primary : 'transparent',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginTop: 2,
                    }}
                  >
                    {selected ? <Text style={{ color: colors.primaryText, fontSize: 14, fontWeight: '800' }}>✓</Text> : null}
                  </View>
                  <Stack gap="xs" style={{ flex: 1 }}>
                    <Text variant="h3">{chore.title}</Text>
                    <Text variant="bodySm" color="muted">
                      {chore.description}
                    </Text>
                    <Text variant="caption" color="primary">
                      {chore.points} points
                    </Text>
                  </Stack>
                </View>
              </Pressable>
            );
          })}
        </Stack>

        <Button
          accessibilityLabel="Create selected starter chores"
          label="Create selected chores"
          fullWidth
          loading={isSaving}
          onPress={async () => {
            if (!familyQuery.data?.id || !user?.id || selectedIds.length === 0) return;
            setIsSaving(true);
            try {
              await batchCreateStarterChores(
                familyQuery.data.id,
                user.id,
                starterChores.filter((chore) => selectedIds.includes(chore.id)),
                kidIds,
              );
              router.replace('/(parent)/(tabs)');
            } finally {
              setIsSaving(false);
            }
          }}
        />
      </Stack>
    </Screen>
  );
}
