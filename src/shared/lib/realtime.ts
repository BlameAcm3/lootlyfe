import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/shared/lib/supabase';

const FAMILY_TABLES = ['chores', 'rewards', 'reward_redemptions', 'chore_instances', 'kids'] as const;

export const useFamilyRealtime = (familyId: string | null | undefined) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!familyId) return;

    const channel = supabase.channel(`family-${familyId}-changes`);

    FAMILY_TABLES.forEach((table) => {
      channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table, filter: `family_id=eq.${familyId}` },
        async () => {
          await queryClient.invalidateQueries({ queryKey: [table, familyId] });
          await queryClient.invalidateQueries({ queryKey: ['family', familyId, table] });
        },
      );
    });

    channel.subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [familyId, queryClient]);
};
