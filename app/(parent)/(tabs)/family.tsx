import { useFamily } from '@/features/families';
import { useKids } from '@/features/kids';
import { useStreaks } from '@/features/points';
import { Card, EmptyState, Screen, Stack, Text } from '@/shared/components';
import { useSessionStore } from '@/stores/sessionStore';

export default function ParentFamilyScreen() {
  const familyId = useSessionStore((state) => state.familyId);
  const familyQuery = useFamily();
  const kidsQuery = useKids(familyId);

  const streaksQuery = useStreaks((kidsQuery.data ?? []).map((kid) => kid.id));

  return (
    <Screen scroll>
      <Stack gap="lg">
        <Text variant="h1">Family</Text>
        <Card>
          <Text variant="h3">{familyQuery.data?.name ?? 'Your family'}</Text>
          <Text color="muted">Timezone: {familyQuery.data?.timezone ?? 'UTC'}</Text>
        </Card>
        {(kidsQuery.data ?? []).length === 0 ? (
          <EmptyState title="No kids added" description="Add a kid in onboarding to start earning points." />
        ) : (
          (kidsQuery.data ?? []).map((kid) => {
            const streak = (streaksQuery.data ?? []).find((item) => item.kid_id === kid.id);
            return (
              <Card key={kid.id}>
                <Text variant="h3">{kid.avatar_emoji ?? '🙂'} {kid.display_name}</Text>
                <Text color="muted">Points: {kid.points_balance}</Text>
                <Text color="muted">Streak: {streak?.current_weekly_streak ?? 0} weeks</Text>
              </Card>
            );
          })
        )}
      </Stack>
    </Screen>
  );
}
