import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth';
import { approveRewardRedemption } from '@/features/rewards/api/rewards';

export const useApproveRedemption = (familyId: string | null | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: async (redemptionId: string) => {
      if (!familyId || !user?.id) throw new Error('Missing family context.');
      return approveRewardRedemption(redemptionId, user.id, familyId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['redemptions', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['kids', familyId] });
    },
  });
};
