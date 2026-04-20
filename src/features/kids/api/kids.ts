import { supabase } from '@/shared/lib/supabase';

export type CreateKidInput = {
  familyId: string;
  displayName: string;
  avatarEmoji: string;
  birthYear: number;
  colorTheme: string;
};

export const listKids = async (familyId: string) => {
  const { data, error } = await supabase
    .from('kids')
    .select('*')
    .eq('family_id', familyId)
    .eq('is_active', true)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
};

export const createKid = async (input: CreateKidInput) => {
  const { data, error } = await supabase
    .from('kids')
    .insert({
      family_id: input.familyId,
      display_name: input.displayName,
      avatar_emoji: input.avatarEmoji,
      birth_year: input.birthYear,
      color_theme: input.colorTheme,
    })
    .select()
    .single();
  if (error) throw error;

  await supabase.from('streaks').upsert(
    {
      kid_id: data.id,
      current_weekly_streak: 0,
      longest_weekly_streak: 0,
    },
    { onConflict: 'kid_id' },
  );

  return data;
};
