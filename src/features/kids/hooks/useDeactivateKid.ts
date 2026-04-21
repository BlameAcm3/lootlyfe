import { useMutation, useQueryClient } from '@tanstack/react-query';

import { deactivateKid } from '@/features/kids/api/kids';

export const useDeactivateKid = (familyId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deactivateKid,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['kids', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['chore-instances', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['streaks'] });
    },
  });
};
