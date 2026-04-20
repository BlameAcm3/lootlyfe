import { supabase } from '@/shared/lib/supabase';

export type CreateFamilyInput = {
  name: string;
  timezone: string;
  parentPin: string;
  userId: string;
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

  await supabase.from('family_members').upsert(
    {
      family_id: data.id,
      profile_id: input.userId,
      role: 'parent',
    },
    { onConflict: 'family_id,profile_id' },
  );

  return data;
};
