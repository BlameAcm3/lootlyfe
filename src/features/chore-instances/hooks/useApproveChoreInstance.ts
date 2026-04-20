import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth';
import { approveChoreInstance } from '@/features/chore-instances/api/choreInstances';

export const useApproveChoreInstance = (familyId: string | null | undefined) => {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: async (instanceId: string) => {
      if (!user?.id) throw new Error('You must be signed in.');
      return approveChoreInstance(instanceId, user.id);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chore-instances', familyId, 'today'] });
      await queryClient.invalidateQueries({ queryKey: ['kids', familyId] });
      await queryClient.invalidateQueries({ queryKey: ['points-transactions', familyId] });
    },
  });
};
