import { useCompleteChoreInstance, useTodaysKidInstances } from '@/features/chore-instances';
import { useKids } from '@/features/kids';
import { useKidStreak } from '@/features/points';
import { useRewards } from '@/features/rewards';
import { Button, Card, EmptyState, Screen, Stack, Text } from '@/shared/components';
import { useTheme } from '@/shared/hooks';
import { useModeStore } from '@/stores/modeStore';
import { useSessionStore } from '@/stores/sessionStore';

export default function KidHomeScreen() {
  const { spacing } = useTheme();
  const familyId = useSessionStore((state) => state.familyId);
  const activeKidId = useModeStore((state) => state.activeKidId);
  const kidsQuery = useKids(familyId);
  const kid = (kidsQuery.data ?? []).find((entry) => entry.id === activeKidId) ?? null;
  const instancesQuery = useTodaysKidInstances(familyId, activeKidId);
  const rewardsQuery = useRewards(familyId);
  const completeMutation = useCompleteChoreInstance(familyId, activeKidId);

  const streakQuery = useKidStreak(activeKidId);

  return (
    <Screen scroll>
      <Stack gap="lg">
        <Text variant="display">{kid ? `${kid.avatar_emoji ?? '🌟'} Hi, ${kid.display_name}!` : 'Kid mode'}</Text>
        <Card>
          <Text variant="h2">⭐ {kid?.points_balance ?? 0} points</Text>
          <Text variant="bodySm" color="muted">
            🔥 Streak: {streakQuery.data?.current_weekly_streak ?? 0} weeks
          </Text>
        </Card>

        {(instancesQuery.data ?? []).length === 0 ? (
          <EmptyState title="All done for today!" description="You finished every chore. Great job!" />
        ) : (
          (instancesQuery.data ?? []).map((item) => (
            <Card key={item.id}>
              <Stack gap="md">
                <Text variant="h2">🧹 {(item.chores as { title?: string } | null)?.title ?? 'Chore'}</Text>
                <Button
                  accessibilityLabel="Mark chore done"
                  label={item.status === 'completed_unverified' ? 'Waiting for parent' : 'Done!'}
                  size="lg"
                  disabled={item.status !== 'pending'}
                  loading={completeMutation.isPending}
                  onPress={async () => {
                    await completeMutation.mutateAsync(item.id);
                  }}
                />
              </Stack>
            </Card>
          ))
        )}

        <Stack gap="sm" style={{ marginTop: spacing.md }}>
          <Text variant="h2">What can I get?</Text>
          {(rewardsQuery.data ?? []).slice(0, 3).map((reward) => (
            <Text key={reward.id}>🎁 {reward.title} - {reward.cost_points} points</Text>
          ))}
        </Stack>
      </Stack>
    </Screen>
  );
}
