import { useMutation, useQueryClient } from '@tanstack/react-query';

import { redeemReward } from '@/features/rewards/api/rewards';
import { track } from '@/shared/lib/posthog';

export const useRedeemReward = (familyId: string | null | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { rewardId: string; kidId: string; cost: number }) => {
      if (!familyId) throw new Error('Missing family context.');
      const redemptionId = await redeemReward(payload.rewardId, payload.kidId, familyId);
      track('reward_redeemed', {
        family_id: familyId ?? '',
        reward_id: payload.rewardId,
        kid_id: payload.kidId,
        cost: payload.cost,
      });
      return redemptionId;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['rewards', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['redemptions', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['kids', familyId] });
    },
  });
};
