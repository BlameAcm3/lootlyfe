import { useMutation, useQueryClient } from '@tanstack/react-query';

import { signOut } from '@/features/auth/api/auth';
import { SESSION_QUERY_KEY } from '@/features/auth/hooks/useSession';
import { reset } from '@/shared/lib/analytics';
import { useSessionStore } from '@/stores/sessionStore';

export const useSignOut = () => {
  const queryClient = useQueryClient();
  const clearSession = useSessionStore((state) => state.clearSession);

  return useMutation({
    mutationFn: signOut,
    onSuccess: async () => {
      clearSession();
      reset();
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    },
  });
};
