import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/shared/lib/supabase';
import type { Database } from '../types/database';
import { pairingKeys } from './pairingQueries';

export type CosmeticItemRow = Database['public']['Tables']['cosmetic_items']['Row'];
export type AdventurerCosmeticRow = Database['public']['Tables']['adventurer_cosmetics']['Row'];

/** Status strings returned by the purchase_cosmetic RPC (migration 014). */
export type PurchaseStatus =
  | 'purchased'
  | 'already_owned'
  | 'insufficient_points'
  | 'premium_required';

export const cosmeticKeys = {
  catalog: ['cosmetics', 'catalog'] as const,
  owned: (adventurerId: string) => ['cosmetics', 'owned', adventurerId] as const,
  entitlement: (guildId: string) => ['cosmetics', 'entitlement', guildId] as const,
};

/** Global cosmetic catalog (read-only; costs and premium gating live here). */
export const useCosmeticCatalog = () => {
  return useQuery({
    queryKey: cosmeticKeys.catalog,
    queryFn: async (): Promise<CosmeticItemRow[]> => {
      const { data, error } = await supabase
        .from('cosmetic_items')
        .select('*')
        .order('achievement_point_cost', { ascending: true });
      if (error) throw error;
      return data;
    },
  });
};

export const useOwnedCosmetics = (adventurerId: string | null | undefined) => {
  return useQuery({
    enabled: Boolean(adventurerId),
    queryKey: cosmeticKeys.owned(adventurerId ?? 'none'),
    queryFn: async (): Promise<AdventurerCosmeticRow[]> => {
      const { data, error } = await supabase
        .from('adventurer_cosmetics')
        .select('*')
        .eq('adventurer_id', adventurerId ?? '');
      if (error) throw error;
      return data;
    },
  });
};

/**
 * The guild's entitlement, readable from a kid device too (the device RLS
 * policy exposes its own guild row). useEntitlements only covers NPC sessions.
 */
export const useGuildEntitlement = (guildId: string | null | undefined) => {
  return useQuery({
    enabled: Boolean(guildId),
    queryKey: cosmeticKeys.entitlement(guildId ?? 'none'),
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase
        .from('guilds')
        .select('subscription_entitlement')
        .eq('id', guildId ?? '')
        .maybeSingle();
      if (error) throw error;
      return data?.subscription_entitlement === 'premium';
    },
  });
};

const invalidateAvatarState = async (
  queryClient: ReturnType<typeof useQueryClient>,
  adventurerId: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: cosmeticKeys.owned(adventurerId) }),
    // Balance (purchase) and avatar_config (equip) live on the profile.
    queryClient.invalidateQueries({ queryKey: pairingKeys.boundAdventurer(adventurerId) }),
  ]);
};

/**
 * Unlock with achievement points. The RPC is one transaction: unlock insert +
 * ledger debit; the DB's non-negative balance check and unique constraints
 * make overdraw and double-spend impossible regardless of how fast the kid
 * taps — the client just renders the returned status.
 */
export const usePurchaseCosmetic = (adventurerId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (cosmeticId: string): Promise<PurchaseStatus> => {
      const { data, error } = await supabase.rpc('purchase_cosmetic', {
        p_adventurer_id: adventurerId ?? '',
        p_cosmetic_id: cosmeticId,
      });
      if (error) throw error;
      return data as PurchaseStatus;
    },
    onSettled: async () => {
      if (adventurerId) await invalidateAvatarState(queryClient, adventurerId);
    },
  });
};

/** Equip/unequip an owned cosmetic; the server keeps avatar_config in sync. */
export const useEquipCosmetic = (adventurerId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ cosmeticId, equipped }: { cosmeticId: string; equipped: boolean }) => {
      const { error } = await supabase.rpc('set_equipped_cosmetic', {
        p_adventurer_id: adventurerId ?? '',
        p_cosmetic_id: cosmeticId,
        p_equipped: equipped,
      });
      if (error) throw error;
    },
    onSettled: async () => {
      if (adventurerId) await invalidateAvatarState(queryClient, adventurerId);
    },
  });
};

export const useSetAvatarBase = (adventurerId: string | null | undefined) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (base: number) => {
      const { error } = await supabase.rpc('set_avatar_base', {
        p_adventurer_id: adventurerId ?? '',
        p_base: base,
      });
      if (error) throw error;
    },
    onSettled: async () => {
      if (adventurerId) {
        await queryClient.invalidateQueries({
          queryKey: pairingKeys.boundAdventurer(adventurerId),
        });
      }
    },
  });
};
