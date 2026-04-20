import { useMutation, useQueryClient } from '@tanstack/react-query';

import { completeChoreInstance } from '@/features/chore-instances/api/choreInstances';

export const useCompleteChoreInstance = (familyId: string | null | undefined, kidId: string | null | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (instanceId: string) => {
      if (!kidId) throw new Error('No active kid selected.');
      return completeChoreInstance(instanceId, kidId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['chore-instances', familyId, 'today'] });
      await queryClient.invalidateQueries({ queryKey: ['chore-instances', familyId, kidId, 'today'] });
      await queryClient.invalidateQueries({ queryKey: ['kids', familyId] });
    },
  });
};
