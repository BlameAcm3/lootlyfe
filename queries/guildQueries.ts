import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/shared/lib/supabase';
import { isPremium } from '@/features/subscriptions/entitlement';
import { useSession } from '@/features/auth';
import type { Database } from '../types/database';

export type GuildRow = Database['public']['Tables']['guilds']['Row'];
export type NpcProfileRow = Database['public']['Tables']['npc_profiles']['Row'];

export type CurrentGuild = {
  guild: GuildRow;
  npcProfile: NpcProfileRow;
};

export const guildKeys = {
  all: ['guild'] as const,
  current: ['guild', 'current'] as const,
};

const fetchCurrentGuild = async (userId: string): Promise<CurrentGuild | null> => {
  const { data, error } = await supabase
    .from('npc_profiles')
    .select('*, guilds!npc_profiles_guild_id_fkey(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const { guilds: guild, ...npcProfile } = data;
  if (!guild) return null;
  return { guild, npcProfile };
};

/** The signed-in NPC's guild + own npc_profile (null until guild creation). */
export const useCurrentGuild = () => {
  const { user } = useSession();

  const query = useQuery({
    enabled: Boolean(user?.id),
    queryKey: guildKeys.current,
    queryFn: () => fetchCurrentGuild(user?.id ?? ''),
  });

  const entitlement = query.data?.guild.subscription_entitlement ?? 'free';
  return {
    ...query,
    guild: query.data?.guild ?? null,
    npcProfile: query.data?.npcProfile ?? null,
    isPremium: isPremium(entitlement),
  };
};

type CreateGuildInput = {
  name: string;
  crest: string;
  displayName?: string;
};

/** Atomic guild + owner profile + consent event via the create_guild RPC. */
export const useCreateGuild = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ name, crest, displayName }: CreateGuildInput) => {
      const { data, error } = await supabase.rpc('create_guild', {
        p_name: name,
        p_crest: crest,
        p_display_name: displayName ?? '',
        p_consent_method: 'signup_checkbox',
      });
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: guildKeys.all });
    },
  });
};

/**
 * Owner-only cascading guild deletion (delete_guild RPC). Consent events are
 * retained server-side per policy; everything else is removed. Caller signs out
 * + resets local state afterward.
 */
export const useDeleteGuild = () => {
  return useMutation({
    mutationFn: async (guildId: string) => {
      const { error } = await supabase.rpc('delete_guild', { p_guild_id: guildId });
      if (error) throw error;
    },
  });
};

/** COPPA data export: invokes export-guild-data (RLS-scoped to the caller). */
export const useGuildDataExport = (enabled: boolean) => {
  return useQuery({
    enabled,
    queryKey: ['guild', 'export'],
    gcTime: 0,
    staleTime: 0,
    queryFn: async (): Promise<string> => {
      const { data, error } = await supabase.functions.invoke('export-guild-data', { body: {} });
      if (error) throw error;
      return JSON.stringify(data, null, 2);
    },
  });
};
