import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/shared/lib/supabase';
import type { Database } from '../types/database';

export type AdventurerAchievementRow =
  Database['public']['Tables']['adventurer_achievements']['Row'];

export const achievementKeys = {
  earned: (adventurerId: string) => ['achievements', 'earned', adventurerId] as const,
};

/**
 * Awards for one adventurer. Detection and granting are entirely server-side
 * (migration 014); the client only reads. Presentation (name, emoji, points)
 * joins data/preset-achievements.ts on achievement_id.
 */
export const useAdventurerAchievements = (adventurerId: string | null | undefined) => {
  return useQuery({
    enabled: Boolean(adventurerId),
    queryKey: achievementKeys.earned(adventurerId ?? 'none'),
    queryFn: async (): Promise<AdventurerAchievementRow[]> => {
      const { data, error } = await supabase
        .from('adventurer_achievements')
        .select('*')
        .eq('adventurer_id', adventurerId ?? '')
        .order('earned_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};
