import { supabase } from '@/shared/lib/supabase';
import { track } from '@/shared/lib/posthog';

const today = new Date().toISOString().slice(0, 10);

export const listTodaysFamilyInstances = async (familyId: string) => {
  const { data, error } = await supabase
    .from('chore_instances')
    .select('*, chores(id,title,points,requires_approval), kids(id,display_name,avatar_emoji,color_theme)')
    .eq('family_id', familyId)
    .eq('due_date', today)
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
};

export const listTodaysKidInstances = async (familyId: string, kidId: string) => {
  const { data, error } = await supabase
    .from('chore_instances')
    .select('*, chores(id,title,points,requires_approval)')
    .eq('family_id', familyId)
    .eq('kid_id', kidId)
    .eq('due_date', today)
    .in('status', ['pending', 'completed_unverified'])
    .order('created_at', { ascending: true });
  if (error) throw error;
  return data;
};

export const completeChoreInstance = async (instanceId: string, kidId: string) => {
  const { data, error } = await supabase
    .from('chore_instances')
    .update({
      status: 'completed_unverified',
      completed_at: new Date().toISOString(),
    })
    .eq('id', instanceId)
    .eq('kid_id', kidId)
    .select('id,family_id,chore_id,kid_id,points_awarded')
    .single();
  if (error) throw error;

  track('chore_completed', {
    family_id: data.family_id,
    chore_id: data.chore_id,
    kid_id: data.kid_id,
    points_awarded: data.points_awarded ?? 0,
  });
  return data;
};

export const approveChoreInstance = async (instanceId: string, parentId: string) => {
  const { data, error } = await supabase
    .from('chore_instances')
    .update({
      status: 'completed_verified',
      verified_by: parentId,
      verified_at: new Date().toISOString(),
    })
    .eq('id', instanceId)
    .select('id,family_id,chore_id,kid_id,points_awarded')
    .single();
  if (error) throw error;

  track('chore_approved', {
    family_id: data.family_id,
    chore_id: data.chore_id,
    kid_id: data.kid_id,
    parent_id: parentId,
  });
  if (data.points_awarded !== null) {
    track('points_awarded', {
      family_id: data.family_id,
      kid_id: data.kid_id,
      amount: data.points_awarded,
      source: 'chore',
    });
  }
  return data;
};
