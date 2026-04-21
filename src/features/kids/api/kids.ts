import { supabase } from '@/shared/lib/supabase';
import type { Database } from '@/shared/types/database';

type KidUpdate = Database['public']['Tables']['kids']['Update'];

export type CreateKidInput = {
  familyId: string;
  displayName: string;
  avatarEmoji: string;
  birthYear: number;
  colorTheme: string;
};

export type UpdateKidInput = {
  displayName?: string;
  avatarEmoji?: string;
  birthYear?: number;
  colorTheme?: string;
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

export const updateKid = async (kidId: string, input: UpdateKidInput) => {
  const payload: KidUpdate = {};
  if (input.displayName !== undefined) payload.display_name = input.displayName;
  if (input.avatarEmoji !== undefined) payload.avatar_emoji = input.avatarEmoji;
  if (input.birthYear !== undefined) payload.birth_year = input.birthYear;
  if (input.colorTheme !== undefined) payload.color_theme = input.colorTheme;

  const { data, error } = await supabase.from('kids').update(payload).eq('id', kidId).select().single();
  if (error) throw error;
  return data;
};

/** Soft-remove: kid no longer appears in lists; related rows stay for history. */
export const deactivateKid = async (kidId: string) => {
  const { error } = await supabase.from('kids').update({ is_active: false }).eq('id', kidId);
  if (error) throw error;
};
