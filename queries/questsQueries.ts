import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/shared/lib/supabase';
import { requestPushPermissionAndRegister } from '@/shared/lib/notifications';
import { addDays, type DateRange, type Recurrence } from '../lib/recurrence';
import type { Database, Json } from '../types/database';

export type QuestRow = Database['public']['Tables']['quests']['Row'];
export type QuestInsert = Database['public']['Tables']['quests']['Insert'];
type QuestUpdate = Database['public']['Tables']['quests']['Update'];
export type QuestCompletionRow = Database['public']['Tables']['quest_completions']['Row'];

export const questKeys = {
  all: ['quests'] as const,
  list: (guildId: string) => ['quests', guildId] as const,
  forAdventurer: (adventurerId: string) => ['quests', 'adventurer', adventurerId] as const,
  completions: (scopeId: string, range: DateRange) =>
    ['quest-completions', scopeId, range.start, range.end] as const,
};

/** A quest counts against the free-tier custom_quests limit when true. */
export const isActiveCustomQuest = (quest: QuestRow): boolean =>
  !quest.archived_at && !quest.source_preset_id;

/** All quests in the guild (archived included; UI splits on archived_at). */
export const useQuests = (guildId: string | null | undefined) => {
  return useQuery({
    enabled: Boolean(guildId),
    queryKey: questKeys.list(guildId ?? 'none'),
    queryFn: async (): Promise<QuestRow[]> => {
      const { data, error } = await supabase
        .from('quests')
        .select('*')
        .eq('guild_id', guildId ?? '')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

type CreateQuestInput = Pick<
  QuestInsert,
  | 'title'
  | 'description'
  | 'category'
  | 'xp_reward'
  | 'gold_reward'
  | 'is_required'
  | 'requires_approval'
  | 'assigned_adventurer_ids'
  | 'source_preset_id'
> & { recurrence: Recurrence | null };

// Recurrence is a plain JSON-shaped object; the cast bridges TS's lack of
// implicit index signatures on intersection types.
const asJson = (recurrence: Recurrence | null): Json => recurrence as unknown as Json;

export const useCreateQuest = (guildId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateQuestInput) => {
      const { data, error } = await supabase
        .from('quests')
        .insert({ ...input, recurrence: asJson(input.recurrence), guild_id: guildId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: questKeys.list(guildId) });
      // First meaningful moment for an NPC: they've set up their first quest, so
      // now ask for push permission. Idempotent — the OS only prompts once, and
      // we never re-ask after a denial.
      const { data } = await supabase.auth.getUser();
      if (data.user) void requestPushPermissionAndRegister(data.user.id);
    },
  });
};

type UpdateQuestInput = {
  id: string;
  patch: Pick<
    QuestUpdate,
    | 'title'
    | 'description'
    | 'category'
    | 'xp_reward'
    | 'gold_reward'
    | 'is_required'
    | 'requires_approval'
    | 'assigned_adventurer_ids'
    | 'archived_at'
  > & { recurrence?: Recurrence | null };
};

/** Edit/archive/restore with an optimistic cache patch and rollback on error. */
export const useUpdateQuest = (guildId: string) => {
  const queryClient = useQueryClient();
  const listKey = questKeys.list(guildId);

  return useMutation({
    mutationFn: async ({ id, patch }: UpdateQuestInput) => {
      const { recurrence, ...rest } = patch;
      const update: QuestUpdate =
        recurrence === undefined ? rest : { ...rest, recurrence: asJson(recurrence) };
      const { data, error } = await supabase
        .from('quests')
        .update(update)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, patch }) => {
      const { recurrence, ...rest } = patch;
      const optimistic: QuestUpdate =
        recurrence === undefined ? rest : { ...rest, recurrence: asJson(recurrence) };
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<QuestRow[]>(listKey);
      queryClient.setQueryData<QuestRow[]>(listKey, (current) =>
        (current ?? []).map((row) => (row.id === id ? { ...row, ...optimistic } : row)),
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

/** Hard delete — quest_completions cascade. Archive is the default UI path. */
export const useDeleteQuest = (guildId: string) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('quests').delete().eq('id', id);
      if (error) throw error;
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: questKeys.list(guildId) });
    },
  });
};

/**
 * Completions whose completed_at falls inside the local-date range. Fetched
 * with a one-day buffer on each side (completed_at is a UTC timestamptz; the
 * log groups by the device's local date), callers match by local date.
 * RLS scopes rows to the caller's guild (NPC) or bound adventurer (device).
 */
const fetchCompletions = async (
  range: DateRange,
  adventurerId?: string,
): Promise<QuestCompletionRow[]> => {
  let query = supabase
    .from('quest_completions')
    .select('*')
    .gte('completed_at', addDays(range.start, -1))
    .lte('completed_at', `${addDays(range.end, 1)}T23:59:59Z`);
  if (adventurerId) query = query.eq('adventurer_id', adventurerId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

/** NPC log views: all guild completions in range (guild-scoped by RLS). */
export const useGuildCompletions = (guildId: string | null | undefined, range: DateRange) => {
  return useQuery({
    enabled: Boolean(guildId),
    queryKey: questKeys.completions(guildId ?? 'none', range),
    queryFn: () => fetchCompletions(range),
  });
};

/** Adventurer dashboard: active quests assigned to this adventurer. */
export const useAdventurerQuests = (adventurerId: string | null | undefined) => {
  return useQuery({
    enabled: Boolean(adventurerId),
    queryKey: questKeys.forAdventurer(adventurerId ?? 'none'),
    queryFn: async (): Promise<QuestRow[]> => {
      const { data, error } = await supabase
        .from('quests')
        .select('*')
        .contains('assigned_adventurer_ids', [adventurerId ?? ''])
        .is('archived_at', null)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

/** Adventurer dashboard: own completions in range. */
export const useAdventurerCompletions = (
  adventurerId: string | null | undefined,
  range: DateRange,
) => {
  return useQuery({
    enabled: Boolean(adventurerId),
    queryKey: questKeys.completions(adventurerId ?? 'none', range),
    queryFn: () => fetchCompletions(range, adventurerId ?? ''),
  });
};
