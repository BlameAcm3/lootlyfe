import { useMutation, useQueryClient } from '@tanstack/react-query';

import { signInWithEmail, signInWithMagicLink } from '@/features/auth/api/auth';
import { identify } from '@/shared/lib/posthog';

export const useSignIn = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { email: string; password?: string; magicLink?: boolean }) => {
      const authResponse = payload.magicLink
        ? await signInWithMagicLink(payload.email)
        : await signInWithEmail(payload.email, payload.password ?? '');

      if (authResponse.user?.id) {
        identify(authResponse.user.id, { email: authResponse.user.email ?? null });
      }
      return authResponse;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['auth', 'session'] });
    },
  });
};
