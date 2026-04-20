import { useMutation, useQueryClient } from '@tanstack/react-query';

import { signOut } from '@/features/auth/api/auth';
import { reset } from '@/shared/lib/posthog';
import { useSessionStore } from '@/stores/sessionStore';

export const useSignOut = () => {
  const queryClient = useQueryClient();
  const clearSession = useSessionStore((state) => state.clearSession);

  return useMutation({
    mutationFn: signOut,
    onSuccess: async () => {
      clearSession();
      reset();
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    },
  });
};
