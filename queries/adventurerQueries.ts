import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/shared/lib/supabase';
import type { Database } from '../types/database';

export type AdventurerRow = Database['public']['Tables']['adventurer_profiles']['Row'];
type AdventurerInsert = Database['public']['Tables']['adventurer_profiles']['Insert'];
type AdventurerUpdate = Database['public']['Tables']['adventurer_profiles']['Update'];

export const adventurerKeys = {
  all: ['adventurers'] as const,
  list: (guildId: string) => ['adventurers', guildId] as const,
};

/** All adventurers in the guild (archived included; UI splits on archived_at). */
export const useAdventurers = (guildId: string | null | undefined) => {
  return useQuery({
    enabled: Boolean(guildId),
    queryKey: adventurerKeys.list(guildId ?? 'none'),
    queryFn: async (): Promise<AdventurerRow[]> => {
      const { data, error } = await supabase
        .from('adventurer_profiles')
        .select('*')
        .eq('guild_id', guildId ?? '')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

type CreateAdventurerInput = Pick<
  AdventurerInsert,
  'nickname' | 'age_bucket' | 'theme_id' | 'variant_id'
>;

export const useCreateAdventurer = (guildId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateAdventurerInput) => {
      const { data, error } = await supabase
        .from('adventurer_profiles')
        .insert({ ...input, guild_id: guildId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: adventurerKeys.list(guildId) });
    },
  });
};

type UpdateAdventurerInput = {
  id: string;
  patch: Pick<
    AdventurerUpdate,
    'nickname' | 'age_bucket' | 'theme_id' | 'variant_id' | 'archived_at'
  >;
};

/** Edit/archive with an optimistic cache patch and rollback on error. */
export const useUpdateAdventurer = (guildId: string) => {
  const queryClient = useQueryClient();
  const listKey = adventurerKeys.list(guildId);

  return useMutation({
    mutationFn: async ({ id, patch }: UpdateAdventurerInput) => {
      const { data, error } = await supabase
        .from('adventurer_profiles')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<AdventurerRow[]>(listKey);
      queryClient.setQueryData<AdventurerRow[]>(listKey, (current) =>
        (current ?? []).map((row) => (row.id === id ? { ...row, ...patch } : row)),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(listKey, context.previous);
      }
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: listKey });
    },
  });
};
