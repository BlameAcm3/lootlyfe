import { useState } from 'react';

import { useApproveRedemption, useRedemptions } from '@/features/redemptions';
import { useCreateReward, useRewards } from '@/features/rewards';
import { Button, Card, EmptyState, Input, Screen, ScreenHeader, Stack, Text } from '@/shared/components';
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
      <Stack gap="xl">
        <ScreenHeader
          title="Rewards"
          subtitle="Kids spend points on rewards you define. You approve redemptions from this screen."
        />

        <Card>
          <Stack gap="md">
            <Text variant="h3">Create a reward</Text>
            <Input accessibilityLabel="Reward title" label="Title" value={title} onChangeText={setTitle} />
            <Input
              accessibilityLabel="Reward points cost"
              label="Point cost"
              value={cost}
              keyboardType="number-pad"
              onChangeText={setCost}
            />
            <Button
              accessibilityLabel="Create reward"
              label="Save reward"
              fullWidth
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

        <Stack gap="sm">
          <Text variant="h2">Catalog</Text>
          {(rewardsQuery.data ?? []).length === 0 ? (
            <Card>
              <EmptyState title="No rewards yet" description="Add screen time, treats, or outings kids can unlock." />
            </Card>
          ) : (
            (rewardsQuery.data ?? []).map((reward) => (
              <Card key={reward.id}>
                <Stack gap="xs">
                  <Text variant="h3">
                    {reward.icon_emoji ?? '🎁'} {reward.title}
                  </Text>
                  <Text color="muted">{reward.cost_points} points</Text>
                </Stack>
              </Card>
            ))
          )}
        </Stack>

        <Stack gap="md">
          <Text variant="h2">Pending requests</Text>
          {(redemptionsQuery.data ?? []).length === 0 ? (
            <Card>
              <EmptyState title="Nothing pending" description="When a kid requests a reward, it will show up here." />
            </Card>
          ) : (
            (redemptionsQuery.data ?? []).map((redemption) => (
              <Card key={redemption.id}>
                <Stack gap="md">
                  <Text variant="body">
                    {(redemption.kids as { display_name?: string } | null)?.display_name ?? 'Kid'} wants{' '}
                    {(redemption.rewards as { title?: string } | null)?.title ?? 'a reward'}
                  </Text>
                  <Button
                    accessibilityLabel="Approve reward redemption"
                    label="Approve redemption"
                    fullWidth
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
