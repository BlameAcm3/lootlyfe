import { useMutation, useQueryClient } from '@tanstack/react-query';

import { updateFamily, type UpdateFamilyInput } from '@/features/families/api/families';
import { useSession } from '@/features/auth';

export const useUpdateFamily = () => {
  const queryClient = useQueryClient();
  const { user } = useSession();

  return useMutation({
    mutationFn: async ({ familyId, values }: { familyId: string; values: UpdateFamilyInput }) =>
      updateFamily(familyId, values),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['family', user?.id] });
    },
  });
};
