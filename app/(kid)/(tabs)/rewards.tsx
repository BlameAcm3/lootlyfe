import { useModeStore } from '@/stores/modeStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useRewards } from '@/features/rewards';
import { useRedeemReward } from '@/features/redemptions';
import { Button, Card, EmptyState, Screen, Stack, Text } from '@/shared/components';

export default function KidRewardsScreen() {
  const familyId = useSessionStore((state) => state.familyId);
  const activeKidId = useModeStore((state) => state.activeKidId);
  const rewardsQuery = useRewards(familyId);
  const redeemMutation = useRedeemReward(familyId);

  return (
    <Screen scroll>
      <Stack gap="lg">
        <Text variant="h1">Rewards</Text>
        {(rewardsQuery.data ?? []).length === 0 ? (
          <EmptyState title="No rewards yet" description="Ask your parent to add rewards in parent mode." />
        ) : (
          (rewardsQuery.data ?? []).map((reward) => (
            <Card key={reward.id}>
              <Stack gap="sm">
                <Text variant="h2">{reward.icon_emoji ?? '🎁'} {reward.title}</Text>
                <Text color="muted">{reward.cost_points} points</Text>
                <Button
                  accessibilityLabel={`Redeem ${reward.title}`}
                  label="Redeem"
                  size="lg"
                  loading={redeemMutation.isPending}
                  onPress={async () => {
                    if (!activeKidId) return;
                    await redeemMutation.mutateAsync({
                      rewardId: reward.id,
                      kidId: activeKidId,
                      cost: reward.cost_points,
                    });
                  }}
                />
              </Stack>
            </Card>
          ))
        )}
      </Stack>
    </Screen>
  );
}
