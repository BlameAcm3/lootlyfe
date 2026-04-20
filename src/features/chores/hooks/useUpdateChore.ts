import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateChore } from '@/features/chores/api/chores';
import type { ChoreFormValues } from '@/features/chores/types';

export const useUpdateChore = (familyId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { choreId: string; values: ChoreFormValues }) => {
      if (!familyId) throw new Error('Missing family context.');
      return updateChore(payload.choreId, familyId, payload.values);
    },
    onSuccess: async (chore) => {
      await queryClient.invalidateQueries({ queryKey: ['chores', chore.family_id] });
      await queryClient.invalidateQueries({ queryKey: ['chore-instances', chore.family_id] });
    },
  });
};
