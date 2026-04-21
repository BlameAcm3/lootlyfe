import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateKid, type UpdateKidInput } from '@/features/kids/api/kids';

export const useUpdateKid = (familyId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ kidId, values }: { kidId: string; values: UpdateKidInput }) => updateKid(kidId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['kids', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['chore-instances', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['streaks'] });
    },
  });
};
