import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';

import { useSession } from '@/features/auth';
import { batchCreateStarterChores, starterChores } from '@/features/chores';
import { useFamily } from '@/features/families';
import { useKids } from '@/features/kids';
import { Button, EmptyState, Pressable, Screen, Stack, Text } from '@/shared/components';
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
      <Stack gap="lg">
        <Text variant="h1">Starter chores</Text>
        <Text color="muted">Pick a few to launch your family routine.</Text>
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
                backgroundColor: selected ? colors.surface : colors.bgElevated,
                borderColor: colors.border,
                borderRadius: radii.md,
                borderWidth: 1,
                padding: spacing.md,
              }}
            >
              <Text variant="label">{selected ? '☑' : '☐'} {chore.title}</Text>
              <Text variant="bodySm" color="muted">
                {chore.description} ({chore.points} points)
              </Text>
            </Pressable>
          );
        })}
        <Button
          accessibilityLabel="Create selected starter chores"
          label="Create selected chores"
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
