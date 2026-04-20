import { useMutation, useQueryClient } from '@tanstack/react-query';

import { useSession } from '@/features/auth';
import { createFamily } from '@/features/families/api/families';
import { track } from '@/shared/lib/posthog';
import { useSessionStore } from '@/stores/sessionStore';

export const useCreateFamily = () => {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const setFamilyId = useSessionStore((state) => state.setFamilyId);

  return useMutation({
    mutationFn: async (input: { name: string; timezone: string; parentPin: string }) => {
      if (!user?.id) throw new Error('You must be signed in.');
      return createFamily({ ...input, userId: user.id });
    },
    onSuccess: async (family) => {
      setFamilyId(family.id);
      track('family_created', { family_id: family.id });
      await queryClient.invalidateQueries({ queryKey: ['family'] });
      await queryClient.invalidateQueries({ queryKey: ['family-members'] });
    },
  });
};
