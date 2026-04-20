import { useState } from 'react';

import { useApproveRedemption, useRedemptions } from '@/features/redemptions';
import { useCreateReward, useRewards } from '@/features/rewards';
import { Button, Card, EmptyState, Input, Screen, Stack, Text } from '@/shared/components';
import { useSessionStore } from '@/stores/sessionStore';

export default function ParentRewardsScreen() {
  const familyId = useSessionStore((state) => state.familyId);
  const rewardsQuery = useRewards(familyId);
  const redemptionsQuery = useRedemptions(familyId);
  const createRewardMutation = useCreateReward();
  const approveRedemptionMutation = useApproveRedemption(familyId);
  const [title, setTitle] = useState('');
  const [cost, setCost] = useState('25');

  return (
    <Screen scroll>
      <Stack gap="lg">
        <Text variant="h1">Rewards</Text>

        <Card>
          <Stack gap="sm">
            <Text variant="h3">Add reward</Text>
            <Input accessibilityLabel="Reward title" label="Title" value={title} onChangeText={setTitle} />
            <Input
              accessibilityLabel="Reward points cost"
              label="Cost points"
              value={cost}
              keyboardType="number-pad"
              onChangeText={setCost}
            />
            <Button
              accessibilityLabel="Create reward"
              label="Create reward"
              loading={createRewardMutation.isPending}
              onPress={async () => {
                if (!familyId || !title.trim()) return;
                await createRewardMutation.mutateAsync({
                  familyId,
                  title: title.trim(),
                  description: '',
                  iconEmoji: '🎁',
                  costPoints: Number.parseInt(cost, 10) || 25,
                  requiresApproval: true,
                });
                setTitle('');
              }}
            />
          </Stack>
        </Card>

        {(rewardsQuery.data ?? []).length === 0 ? (
          <EmptyState title="No rewards yet" description="Create rewards to motivate your kids." />
        ) : (
          (rewardsQuery.data ?? []).map((reward) => (
            <Card key={reward.id}>
              <Text variant="h3">{reward.icon_emoji ?? '🎁'} {reward.title}</Text>
              <Text color="muted">{reward.cost_points} points</Text>
            </Card>
          ))
        )}

        <Stack gap="sm">
          <Text variant="h2">Pending redemption requests</Text>
          {(redemptionsQuery.data ?? []).length === 0 ? (
            <EmptyState title="Nothing pending" description="New redemption requests will show up here." />
          ) : (
            (redemptionsQuery.data ?? []).map((redemption) => (
              <Card key={redemption.id}>
                <Stack gap="sm">
                  <Text>
                    {(redemption.kids as { display_name?: string } | null)?.display_name ?? 'Kid'} requested{' '}
                    {(redemption.rewards as { title?: string } | null)?.title ?? 'reward'}
                  </Text>
                  <Button
                    accessibilityLabel="Approve reward redemption"
                    label="Approve"
                    size="sm"
                    loading={approveRedemptionMutation.isPending}
                    onPress={async () => {
                      await approveRedemptionMutation.mutateAsync(redemption.id);
                    }}
                  />
                </Stack>
              </Card>
            ))
          )}
        </Stack>
      </Stack>
    </Screen>
  );
}
