import { supabase } from '@/shared/lib/supabase';
import type { Database } from '@/shared/types/database';

type FamilyUpdate = Database['public']['Tables']['families']['Update'];

export type CreateFamilyInput = {
  name: string;
  timezone: string;
  parentPin: string;
  userId: string;
};

/** `families.created_by` references `profiles`, not `auth.users`. Ensure a row exists (trigger may have missed older accounts). */
const ensureUserProfileExists = async (userId: string) => {
  const { data, error } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (error) throw error;
  if (data) return;

  const { error: insertError } = await supabase.from('profiles').insert({
    id: userId,
    display_name: null,
  });
  if (insertError) throw insertError;
};

export type UpdateFamilyInput = {
  name?: string;
  timezone?: string;
  /** Stored as entered today (same as create); hashing can be added server-side later. */
  parentPin?: string;
};

export const updateFamily = async (familyId: string, input: UpdateFamilyInput) => {
  const payload: FamilyUpdate = {};
  if (input.name !== undefined) payload.name = input.name;
  if (input.timezone !== undefined) payload.timezone = input.timezone;
  if (input.parentPin !== undefined) payload.parent_pin_hash = input.parentPin;

  if (Object.keys(payload).length === 0) return null;

  const { data, error } = await supabase.from('families').update(payload).eq('id', familyId).select().single();
  if (error) throw error;
  return data;
};

export const getCurrentFamily = async (userId: string) => {
  const { data, error } = await supabase
    .from('families')
    .select('*')
    .eq('created_by', userId)
    .maybeSingle();
  if (error) throw error;
  return data;
};

export const createFamily = async (input: CreateFamilyInput) => {
  await ensureUserProfileExists(input.userId);

  const { data, error } = await supabase
    .from('families')
    .insert({
      name: input.name,
      timezone: input.timezone,
      parent_pin_hash: input.parentPin,
      created_by: input.userId,
    })
    .select()
    .single();
  if (error) throw error;

  const { error: memberError } = await supabase.from('family_members').upsert(
    {
      family_id: data.id,
      profile_id: input.userId,
      role: 'parent',
    },
    { onConflict: 'family_id,profile_id' },
  );
  if (memberError) throw memberError;

  return data;
};
