import { useMutation, useQueryClient } from '@tanstack/react-query';

import { signUpWithEmail } from '@/features/auth/api/auth';
import { SESSION_QUERY_KEY } from '@/features/auth/hooks/useSession';

export const useSignUp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      return signUpWithEmail(payload.email, payload.password);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    },
  });
};
