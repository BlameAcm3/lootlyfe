import { useMutation, useQueryClient } from '@tanstack/react-query';

import { signUpWithEmail } from '@/features/auth/api/auth';

export const useSignUp = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { email: string; password: string }) => {
      return signUpWithEmail(payload.email, payload.password);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    },
  });
};
