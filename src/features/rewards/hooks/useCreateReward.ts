import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createReward } from '@/features/rewards/api/rewards';

export const useCreateReward = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createReward,
    onSuccess: async (reward) => {
      await queryClient.invalidateQueries({ queryKey: ['rewards', reward.family_id] });
    },
  });
};
