import { useMutation, useQueryClient } from '@tanstack/react-query';

import { signInWithEmail, signInWithMagicLink } from '@/features/auth/api/auth';
import { SESSION_QUERY_KEY } from '@/features/auth/hooks/useSession';
import { identify } from '@/shared/lib/analytics';

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
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    },
  });
};
