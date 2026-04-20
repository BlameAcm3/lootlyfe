import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createKid } from '@/features/kids/api/kids';
import { track } from '@/shared/lib/posthog';

export const useCreateKid = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createKid,
    onSuccess: async (kid) => {
      track('kid_added', {
        family_id: kid.family_id,
        kid_id: kid.id,
        age_range: kid.birth_year ? String(Math.max(0, new Date().getFullYear() - kid.birth_year)) : 'unknown',
      });
      await queryClient.invalidateQueries({ queryKey: ['kids', kid.family_id] });
      await queryClient.invalidateQueries({ queryKey: ['family', kid.family_id] });
    },
  });
};
