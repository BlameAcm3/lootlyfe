import { supabase } from '@/shared/lib/supabase';

export const listStreaksByKidIds = async (kidIds: string[]) => {
  if (kidIds.length === 0) return [];
  const { data, error } = await supabase.from('streaks').select('*').in('kid_id', kidIds);
  if (error) throw error;
  return data;
};

export const getKidStreak = async (kidId: string) => {
  const { data, error } = await supabase.from('streaks').select('*').eq('kid_id', kidId).maybeSingle();
  if (error) throw error;
  return data;
};
