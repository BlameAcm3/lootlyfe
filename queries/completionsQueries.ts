import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/shared/lib/supabase';
import { requestPushPermissionAndRegister } from '@/shared/lib/notifications';
import { todayIso } from '../lib/recurrence';
import { achievementKeys } from './achievementsQueries';
import { adventurerKeys } from './adventurerQueries';
import { pairingKeys } from './pairingQueries';
import { questKeys, type QuestCompletionRow } from './questsQueries';

/**
 * Completion flow. The client only ever writes the completion FACT
 * (quest_id + adventurer_id + due_date) or a status decision — rewards are
 * computed and granted entirely by the DB triggers in migration 013.
 */

export const completionKeys = {
  pending: (guildId: string) => ['completions', 'pending', guildId] as const,
};

/** Root of every questKeys.completions(...) key — for broad invalidation. */
const COMPLETIONS_ROOT = ['quest-completions'] as const;

/** Unique-violation from the occurrence index: the double-tap dedupe. */
const UNIQUE_VIOLATION = '23505';

export type CompleteQuestResult = {
  completion: QuestCompletionRow | null;
  /** True when the row already existed (rapid double-tap collapsed). */
  duplicate: boolean;
};

/**
 * Kid device: record a completion for today. Optimistically appends to the
 * dashboard's today-completions cache; the DB auto-approves (and pays out)
 * quests that don't require approval. A unique-violation means another tap
 * already landed — treated as success, never an error.
 */
export const useCompleteQuest = (adventurerId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (questId: string): Promise<CompleteQuestResult> => {
      const { data, error } = await supabase
        .from('quest_completions')
        .insert({
          quest_id: questId,
          adventurer_id: adventurerId ?? '',
          due_date: todayIso(),
        })
        .select('*')
        .single();
      if (error) {
        if (error.code === UNIQUE_VIOLATION) return { completion: null, duplicate: true };
        throw error;
      }
      return { completion: data, duplicate: false };
    },
    onMutate: async (questId) => {
      const today = todayIso();
      const todayKey = questKeys.completions(adventurerId ?? 'none', { start: today, end: today });
      await queryClient.cancelQueries({ queryKey: todayKey });
      const previous = queryClient.getQueryData<QuestCompletionRow[]>(todayKey);
      const optimistic: QuestCompletionRow = {
        id: `optimistic-${questId}`,
        quest_id: questId,
        adventurer_id: adventurerId ?? '',
        status: 'pending',
        completed_at: new Date().toISOString(),
        due_date: today,
        approved_at: null,
        approved_by_npc_id: null,
        proof_url: null,
        rejection_reason: null,
      };
      queryClient.setQueryData<QuestCompletionRow[]>(todayKey, (current) => [
        ...(current ?? []),
        optimistic,
      ]);
      return { previous, todayKey };
    },
    onError: (_error, _questId, context) => {
      if (context) {
        queryClient.setQueryData(context.todayKey, context.previous);
      }
    },
    onSuccess: async () => {
      // First meaningful moment for a kid device: they just completed a quest,
      // so register for celebration push (approval results, level up, streak).
      // Idempotent — prompts only once, never after a denial.
      const { data } = await supabase.auth.getUser();
      if (data.user) void requestPushPermissionAndRegister(data.user.id);
    },
    onSettled: async () => {
      // Profile aggregates (gold/XP/level/streak) and achievement awards
      // changed server-side in the grant transaction.
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: COMPLETIONS_ROOT }),
        queryClient.invalidateQueries({
          queryKey: pairingKeys.boundAdventurer(adventurerId ?? 'none'),
        }),
        queryClient.invalidateQueries({
          queryKey: achievementKeys.earned(adventurerId ?? 'none'),
        }),
      ]);
    },
  });
};

export type PendingCompletion = QuestCompletionRow & {
  quests: { id: string; title: string; gold_reward: number; xp_reward: number };
  adventurer_profiles: { id: string; nickname: string };
};

/** NPC: the approval queue, oldest first. */
export const usePendingCompletions = (guildId: string | null | undefined) => {
  return useQuery({
    enabled: Boolean(guildId),
    queryKey: completionKeys.pending(guildId ?? 'none'),
    queryFn: async (): Promise<PendingCompletion[]> => {
      const { data, error } = await supabase
        .from('quest_completions')
        .select(
          '*, quests!inner(id, title, gold_reward, xp_reward, guild_id), adventurer_profiles!inner(id, nickname)',
        )
        .eq('status', 'pending')
        .eq('quests.guild_id', guildId ?? '')
        .order('completed_at', { ascending: true });
      if (error) throw error;
      return data as unknown as PendingCompletion[];
    },
  });
};

type ResolveContext = { guildId: string; npcProfileId: string };

const invalidateAfterResolve = async (
  queryClient: ReturnType<typeof useQueryClient>,
  guildId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: completionKeys.pending(guildId) }),
    queryClient.invalidateQueries({ queryKey: COMPLETIONS_ROOT }),
    // Approval granted rewards / rejection recomputed a streak.
    queryClient.invalidateQueries({ queryKey: adventurerKeys.list(guildId) }),
  ]);
};

/**
 * NPC: approve a pending completion. The grant happens in the DB trigger;
 * the conditional .eq('status', 'pending') makes a second approve (or an
 * approve racing a reject) a clean no-op instead of a double grant.
 */
export const useApproveCompletion = ({ guildId, npcProfileId }: ResolveContext) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (completionId: string) => {
      const { data, error } = await supabase
        .from('quest_completions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by_npc_id: npcProfileId,
        })
        .eq('id', completionId)
        .eq('status', 'pending')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data; // null = already resolved elsewhere
    },
    onSettled: () => invalidateAfterResolve(queryClient, guildId),
  });
};

/** NPC: reject with a short reason (shown kindly to the kid). */
export const useRejectCompletion = ({ guildId }: Pick<ResolveContext, 'guildId'>) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ completionId, reason }: { completionId: string; reason: string }) => {
      const { data, error } = await supabase
        .from('quest_completions')
        .update({ status: 'rejected', rejection_reason: reason })
        .eq('id', completionId)
        .eq('status', 'pending')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSettled: () => invalidateAfterResolve(queryClient, guildId),
  });
};
