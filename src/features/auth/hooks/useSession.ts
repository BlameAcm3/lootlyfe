import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/shared/lib/supabase';
import { useSessionStore } from '@/stores/sessionStore';

const SESSION_QUERY_KEY = ['auth', 'session'] as const;

export const useSession = () => {
  const setSession = useSessionStore((state) => state.setSession);
  const setFamilyId = useSessionStore((state) => state.setFamilyId);
  const session = useSessionStore((state) => state.session);

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

  useEffect(() => {
    if (query.data !== undefined) {
      setSession(query.data);
    }
  }, [query.data, setSession]);

  useEffect(() => {
    const syncFamily = async () => {
      if (!session?.user?.id) {
        setFamilyId(null);
        return;
      }
      const { data } = await supabase
        .from('families')
        .select('id')
        .eq('created_by', session.user.id)
        .maybeSingle();
      setFamilyId(data?.id ?? null);
    };
    void syncFamily();
  }, [session?.user?.id, setFamilyId]);

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setSession]);

  return {
    session,
    isLoading: query.isLoading,
    user: session?.user ?? null,
  };
};
