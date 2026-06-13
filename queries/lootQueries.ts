import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/shared/lib/supabase';
import type { Database } from '../types/database';
import { pairingKeys } from './pairingQueries';

export type LootItemRow = Database['public']['Tables']['loot_items']['Row'];
type LootItemInsert = Database['public']['Tables']['loot_items']['Insert'];
type LootItemUpdate = Database['public']['Tables']['loot_items']['Update'];
export type LootRedemptionRow = Database['public']['Tables']['loot_redemptions']['Row'];
export type LootWishlistRow = Database['public']['Tables']['loot_wishlist']['Row'];

/** A loot item is sold out when its finite stock has reached zero. */
export const isSoldOut = (item: Pick<LootItemRow, 'stock'>): boolean => item.stock === 0;

/** Postgres check-constraint violation: an overdraw rolled the request back. */
const CHECK_VIOLATION = '23514';

/** Outcome the redeem mutation surfaces so screens render kid-friendly copy. */
export type RedeemOutcome = 'redeemed' | 'insufficient_gold' | 'sold_out' | 'error';

export const lootKeys = {
  items: (guildId: string) => ['loot-items', guildId] as const,
  redemptionsGuild: (guildId: string) => ['loot-redemptions', 'guild', guildId] as const,
  redemptionsAdventurer: (adventurerId: string) =>
    ['loot-redemptions', 'adventurer', adventurerId] as const,
  wishlistGuild: (guildId: string) => ['loot-wishlist', 'guild', guildId] as const,
  wishlistAdventurer: (adventurerId: string) =>
    ['loot-wishlist', 'adventurer', adventurerId] as const,
};

// ---------------------------------------------------------------------------
// loot_items — NPC CRUD, kid-device read.
// ---------------------------------------------------------------------------

/** The guild's loot library (NPC manage view and the kid shop both read this). */
export const useLootItems = (guildId: string | null | undefined) => {
  return useQuery({
    enabled: Boolean(guildId),
    queryKey: lootKeys.items(guildId ?? 'none'),
    queryFn: async (): Promise<LootItemRow[]> => {
      const { data, error } = await supabase
        .from('loot_items')
        .select('*')
        .eq('guild_id', guildId ?? '')
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

type CreateLootInput = Pick<LootItemInsert, 'name' | 'description' | 'gold_cost' | 'stock'>;

export const useCreateLootItem = (guildId: string, npcProfileId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateLootInput) => {
      const { data, error } = await supabase
        .from('loot_items')
        .insert({ ...input, guild_id: guildId, created_by_npc_id: npcProfileId })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: lootKeys.items(guildId) });
    },
  });
};

type UpdateLootInput = {
  id: string;
  patch: Pick<LootItemUpdate, 'name' | 'description' | 'gold_cost' | 'stock'>;
};

/** Edit a loot item with an optimistic cache patch and rollback on error. */
export const useUpdateLootItem = (guildId: string) => {
  const queryClient = useQueryClient();
  const itemsKey = lootKeys.items(guildId);
  return useMutation({
    mutationFn: async ({ id, patch }: UpdateLootInput) => {
      const { data, error } = await supabase
        .from('loot_items')
        .update(patch)
        .eq('id', id)
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, patch }) => {
      await queryClient.cancelQueries({ queryKey: itemsKey });
      const previous = queryClient.getQueryData<LootItemRow[]>(itemsKey);
      queryClient.setQueryData<LootItemRow[]>(itemsKey, (current) =>
        (current ?? []).map((row) => (row.id === id ? { ...row, ...patch } : row)),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) queryClient.setQueryData(itemsKey, context.previous);
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: itemsKey });
    },
  });
};

/** Delete a loot item (redemptions cascade). */
export const useDeleteLootItem = (guildId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('loot_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: lootKeys.items(guildId) });
    },
  });
};

// ---------------------------------------------------------------------------
// loot_redemptions — request (kid), fulfill/deny (NPC), history (both).
// ---------------------------------------------------------------------------

/**
 * Kid device: request a redemption. The row insert fires the DB triggers that
 * stamp the authoritative cost and HOLD the gold immediately (ledger debit,
 * status pending) — there is no client-side balance math. We map the two
 * server guards to friendly outcomes; affordability is also gated in the UI,
 * so reaching the overdraw path means gold dropped between load and tap.
 */
export const useRedeemLoot = (adventurerId: string | null | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (item: LootItemRow): Promise<RedeemOutcome> => {
      const { error } = await supabase.from('loot_redemptions').insert({
        loot_id: item.id,
        adventurer_id: adventurerId ?? '',
        gold_spent: item.gold_cost, // display value; the trigger overrides it
      });
      if (!error) return 'redeemed';
      if (error.code === CHECK_VIOLATION) return 'insufficient_gold';
      if (error.message.includes('loot_sold_out')) return 'sold_out';
      return 'error';
    },
    onSettled: async () => {
      if (!adventurerId) return;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: lootKeys.redemptionsAdventurer(adventurerId),
        }),
        // Held gold changed the profile balance.
        queryClient.invalidateQueries({ queryKey: pairingKeys.boundAdventurer(adventurerId) }),
      ]);
    },
  });
};

/** A redemption joined with its loot item (name, emoji-less) for history rows. */
export type RedemptionWithLoot = LootRedemptionRow & {
  loot_items: Pick<LootItemRow, 'id' | 'name' | 'description'> | null;
};

/** Kid device: own redemption history (pending / fulfilled / denied). */
export const useAdventurerRedemptions = (adventurerId: string | null | undefined) => {
  return useQuery({
    enabled: Boolean(adventurerId),
    queryKey: lootKeys.redemptionsAdventurer(adventurerId ?? 'none'),
    queryFn: async (): Promise<RedemptionWithLoot[]> => {
      const { data, error } = await supabase
        .from('loot_redemptions')
        .select('*, loot_items(id, name, description)')
        .eq('adventurer_id', adventurerId ?? '')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return data as unknown as RedemptionWithLoot[];
    },
  });
};

export type GuildRedemption = RedemptionWithLoot & {
  adventurer_profiles: { id: string; nickname: string } | null;
};

/** NPC: all redemptions in the guild (fulfillment queue + history). */
export const useGuildRedemptions = (guildId: string | null | undefined) => {
  return useQuery({
    enabled: Boolean(guildId),
    queryKey: lootKeys.redemptionsGuild(guildId ?? 'none'),
    queryFn: async (): Promise<GuildRedemption[]> => {
      const { data, error } = await supabase
        .from('loot_redemptions')
        .select(
          '*, loot_items!inner(id, name, description, guild_id), adventurer_profiles!inner(id, nickname)',
        )
        .eq('loot_items.guild_id', guildId ?? '')
        .order('requested_at', { ascending: false });
      if (error) throw error;
      return data as unknown as GuildRedemption[];
    },
  });
};

const invalidateAfterRedemptionResolve = async (
  queryClient: ReturnType<typeof useQueryClient>,
  guildId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: lootKeys.redemptionsGuild(guildId) }),
    queryClient.invalidateQueries({ queryKey: ['loot-redemptions'] }),
    // Approval decremented stock; denial refunded gold.
    queryClient.invalidateQueries({ queryKey: lootKeys.items(guildId) }),
  ]);
};

/**
 * NPC: approve a pending redemption. The conditional status guard makes a
 * second approve (or an approve racing a deny) a clean no-op. Stock decrement
 * happens in the DB trigger; a sold-out race surfaces as an error here.
 */
export const useApproveRedemption = (guildId: string, npcProfileId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (redemptionId: string) => {
      const { data, error } = await supabase
        .from('loot_redemptions')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by_npc_id: npcProfileId,
        })
        .eq('id', redemptionId)
        .eq('status', 'pending')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data; // null = already resolved
    },
    onSettled: () => invalidateAfterRedemptionResolve(queryClient, guildId),
  });
};

/** NPC: deny a pending redemption — the DB trigger auto-refunds the held gold. */
export const useDenyRedemption = (guildId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (redemptionId: string) => {
      const { data, error } = await supabase
        .from('loot_redemptions')
        .update({ status: 'rejected' })
        .eq('id', redemptionId)
        .eq('status', 'pending')
        .select('*')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSettled: () => invalidateAfterRedemptionResolve(queryClient, guildId),
  });
};

// ---------------------------------------------------------------------------
// loot_wishlist — propose (kid), accept/decline (NPC).
// ---------------------------------------------------------------------------

/** Kid device: own wish list with status chips. */
export const useAdventurerWishlist = (adventurerId: string | null | undefined) => {
  return useQuery({
    enabled: Boolean(adventurerId),
    queryKey: lootKeys.wishlistAdventurer(adventurerId ?? 'none'),
    queryFn: async (): Promise<LootWishlistRow[]> => {
      const { data, error } = await supabase
        .from('loot_wishlist')
        .select('*')
        .eq('adventurer_id', adventurerId ?? '')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export type WishlistWithAdventurer = LootWishlistRow & {
  adventurer_profiles: { id: string; nickname: string; guild_id: string } | null;
};

/** NPC: proposed wishes across the guild's adventurers (review queue). */
export const useGuildWishlist = (guildId: string | null | undefined) => {
  return useQuery({
    enabled: Boolean(guildId),
    queryKey: lootKeys.wishlistGuild(guildId ?? 'none'),
    queryFn: async (): Promise<WishlistWithAdventurer[]> => {
      const { data, error } = await supabase
        .from('loot_wishlist')
        .select('*, adventurer_profiles!inner(id, nickname, guild_id)')
        .eq('adventurer_profiles.guild_id', guildId ?? '')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as unknown as WishlistWithAdventurer[];
    },
  });
};

type ProposeWishInput = {
  name: string;
  description: string | null;
  proposedGoldCost: number | null;
};

/** Kid device: propose a wish (kid-friendly form). Starts as 'proposed'. */
export const useProposeWish = (adventurerId: string | null | undefined) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: ProposeWishInput) => {
      const { data, error } = await supabase
        .from('loot_wishlist')
        .insert({
          adventurer_id: adventurerId ?? '',
          name: input.name,
          description: input.description,
          proposed_gold_cost: input.proposedGoldCost,
        })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: async () => {
      if (adventurerId) {
        await queryClient.invalidateQueries({
          queryKey: lootKeys.wishlistAdventurer(adventurerId),
        });
      }
    },
  });
};

/**
 * NPC: accept a proposed wish, optionally adjusting cost/stock. The RPC creates
 * the live loot item and flips the wish to 'accepted' in one transaction.
 */
export const useAcceptWish = (guildId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      wishlistId,
      goldCost,
      stock,
    }: {
      wishlistId: string;
      goldCost: number;
      stock: number | null;
    }) => {
      const { data, error } = await supabase.rpc('accept_wishlist_item', {
        p_wishlist_id: wishlistId,
        p_gold_cost: goldCost,
        // Omit for unlimited; the RPC defaults p_stock to null.
        ...(stock === null ? {} : { p_stock: stock }),
      });
      if (error) throw error;
      return data;
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: lootKeys.wishlistGuild(guildId) }),
        queryClient.invalidateQueries({ queryKey: ['loot-wishlist'] }),
        queryClient.invalidateQueries({ queryKey: lootKeys.items(guildId) }),
      ]);
    },
  });
};

/** NPC: decline a proposed wish with kind copy (plain status update). */
export const useDeclineWish = (guildId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (wishlistId: string) => {
      const { error } = await supabase
        .from('loot_wishlist')
        .update({ status: 'declined' })
        .eq('id', wishlistId)
        .eq('status', 'proposed');
      if (error) throw error;
    },
    onSettled: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: lootKeys.wishlistGuild(guildId) }),
        queryClient.invalidateQueries({ queryKey: ['loot-wishlist'] }),
      ]);
    },
  });
};
