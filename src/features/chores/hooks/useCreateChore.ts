import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth';
import { createChore } from '@/features/chores/api/chores';
import type { ChoreFormValues } from '@/features/chores/types';
import { track } from '@/shared/lib/posthog';

export const useCreateChore = (familyId: string | null | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: async (values: ChoreFormValues) => {
      if (!familyId || !user?.id) throw new Error('Missing family context.');
      return createChore(familyId, user.id, values);
    },
    onSuccess: async (chore) => {
      track('chore_created', {
        family_id: chore.family_id,
        chore_id: chore.id,
        points: chore.points,
        schedule_type: chore.schedule_type,
      });
      await queryClient.invalidateQueries({ queryKey: ['chores', chore.family_id] });
      await queryClient.invalidateQueries({ queryKey: ['chore-instances', chore.family_id] });
    },
  });
};
