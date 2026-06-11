import { useEffect, useLayoutEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/shared/lib/supabase';
import { useSessionStore } from '@/stores/sessionStore';

export const SESSION_QUERY_KEY = ['auth', 'session'] as const;

export const useSession = () => {
  const queryClient = useQueryClient();
  const setSession = useSessionStore((state) => state.setSession);
  const storeSession = useSessionStore((state) => state.session);

  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
    staleTime: Infinity,
    gcTime: Infinity,
  });

  // Prefer React Query once it has run; avoids redirecting to sign-in while Zustand is one tick behind after login.
  const session = query.data !== undefined ? query.data : storeSession;

  useLayoutEffect(() => {
    if (query.data !== undefined) {
      setSession(query.data);
    }
  }, [query.data, setSession]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, nextSession);
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [queryClient, setSession]);

  return {
    session,
    isLoading: query.isPending,
    user: session?.user ?? null,
  };
};
