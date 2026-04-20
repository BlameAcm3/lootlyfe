import { supabase } from '@/shared/lib/supabase';
import { track } from '@/shared/lib/posthog';

export const listRewards = async (familyId: string) => {
  const { data, error } = await supabase
    .from('rewards')
    .select('*')
    .eq('family_id', familyId)
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const listRedemptionRequests = async (familyId: string) => {
  const { data, error } = await supabase
    .from('reward_redemptions')
    .select('*, rewards(title,icon_emoji), kids(display_name,avatar_emoji)')
    .eq('family_id', familyId)
    .in('status', ['requested', 'approved'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
};

export const createReward = async (payload: {
  familyId: string;
  title: string;
  description: string;
  costPoints: number;
  iconEmoji: string;
  requiresApproval: boolean;
}) => {
  const { data, error } = await supabase
    .from('rewards')
    .insert({
      family_id: payload.familyId,
      title: payload.title,
      description: payload.description || null,
      cost_points: payload.costPoints,
      icon_emoji: payload.iconEmoji,
      requires_approval: payload.requiresApproval,
    })
    .select()
    .single();
  if (error) throw error;

  track('reward_created', { family_id: data.family_id, reward_id: data.id, cost: data.cost_points });
  return data;
};

export const redeemReward = async (rewardId: string, kidId: string, familyId: string) => {
  const { data: reward, error: rewardError } = await supabase
    .from('rewards')
    .select('id,cost_points,family_id')
    .eq('id', rewardId)
    .eq('family_id', familyId)
    .single();
  if (rewardError) throw rewardError;

  const { data, error } = await supabase
    .from('reward_redemptions')
    .insert({
      family_id: familyId,
      reward_id: reward.id,
      kid_id: kidId,
      cost_points: reward.cost_points,
      status: 'requested',
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
};

export const approveRewardRedemption = async (
  redemptionId: string,
  parentId: string,
  familyId: string,
) => {
  const { data, error } = await supabase
    .from('reward_redemptions')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: parentId,
    })
    .eq('id', redemptionId)
    .eq('family_id', familyId)
    .select('id,reward_id,kid_id,cost_points')
    .single();
  if (error) throw error;

  await supabase.rpc('award_points', {
    p_family_id: familyId,
    p_kid_id: data.kid_id,
    p_amount: -data.cost_points,
    p_source_type: 'reward_redemption',
    p_source_id: data.id,
    p_note: 'Approved reward redemption',
  });

  track('reward_approved', {
    family_id: familyId,
    reward_id: data.reward_id,
    kid_id: data.kid_id,
    parent_id: parentId,
  });
  return data;
};
