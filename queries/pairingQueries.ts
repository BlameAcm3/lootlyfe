import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { FunctionsHttpError } from '@supabase/supabase-js';

import { supabase } from '@/shared/lib/supabase';
import { useSession } from '@/features/auth';
import type { Database } from '../types/database';

export type DeviceBindingRow = Database['public']['Tables']['device_bindings']['Row'];
export type AdventurerRow = Database['public']['Tables']['adventurer_profiles']['Row'];

export const pairingKeys = {
  bindings: (adventurerId: string) => ['device-bindings', adventurerId] as const,
  ownBinding: ['own-binding'] as const,
  boundAdventurer: (adventurerId: string) => ['bound-adventurer', adventurerId] as const,
};

/** NPC: mint a fresh 6-digit code (retires previous live codes). */
export const useCreatePairingCode = () => {
  return useMutation({
    mutationFn: async (adventurerId: string) => {
      const { data, error } = await supabase.rpc('create_pairing_code', {
        p_adventurer_id: adventurerId,
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new Error('no code returned');
      return row as { code: string; expires_at: string };
    },
  });
};

/** NPC: bindings for one adventurer (revocation dashboard). */
export const useDeviceBindings = (adventurerId: string | null | undefined) => {
  return useQuery({
    enabled: Boolean(adventurerId),
    queryKey: pairingKeys.bindings(adventurerId ?? 'none'),
    queryFn: async (): Promise<DeviceBindingRow[]> => {
      const { data, error } = await supabase
        .from('device_bindings')
        .select('*')
        .eq('adventurer_id', adventurerId ?? '')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useRevokeBinding = (adventurerId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (bindingId: string) => {
      const { error } = await supabase
        .from('device_bindings')
        .update({ revoked_at: new Date().toISOString() })
        .eq('id', bindingId);
      if (error) throw error;
    },
    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: pairingKeys.bindings(adventurerId) });
    },
  });
};

/** Device: this session's most recent binding (may be revoked; caller checks). */
export const useOwnBinding = () => {
  const { user } = useSession();
  return useQuery({
    enabled: Boolean(user?.id),
    queryKey: pairingKeys.ownBinding,
    queryFn: async (): Promise<DeviceBindingRow | null> => {
      const { data, error } = await supabase
        .from('device_bindings')
        .select('*')
        .eq('user_id', user?.id ?? '')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
};

/** The adventurer profile a binding (or mode toggle) points at. */
export const useBoundAdventurer = (adventurerId: string | null | undefined) => {
  return useQuery({
    enabled: Boolean(adventurerId),
    queryKey: pairingKeys.boundAdventurer(adventurerId ?? 'none'),
    queryFn: async (): Promise<AdventurerRow | null> => {
      const { data, error } = await supabase
        .from('adventurer_profiles')
        .select('*')
        .eq('id', adventurerId ?? '')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });
};

export type PairErrorCode =
  | 'code_not_found'
  | 'code_expired'
  | 'code_already_used'
  | 'generic';

export class PairError extends Error {
  code: PairErrorCode;
  constructor(code: PairErrorCode) {
    super(code);
    this.code = code;
  }
}

/** Kid device: redeem a code via the pair-device Edge Function. */
export const usePairDevice = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, label }: { code: string; label?: string }) => {
      const { data, error } = await supabase.functions.invoke('pair-device', {
        body: { code, label },
      });
      if (error) {
        let errorCode: PairErrorCode = 'generic';
        if (error instanceof FunctionsHttpError) {
          const body = (await error.context.json().catch(() => null)) as { error?: string } | null;
          if (body?.error === 'code_not_found' || body?.error === 'invalid_code_format') {
            errorCode = 'code_not_found';
          } else if (body?.error === 'code_expired') {
            errorCode = 'code_expired';
          } else if (body?.error === 'code_already_used') {
            errorCode = 'code_already_used';
          }
        }
        throw new PairError(errorCode);
      }
      return data as { binding_id: string; adventurer_id: string; guild_id: string };
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: pairingKeys.ownBinding });
    },
  });
};

/** Heartbeat: update last_seen_at; false means the binding was revoked. */
export const touchDeviceBinding = async (): Promise<boolean> => {
  const { data, error } = await supabase.rpc('touch_device_binding');
  if (error) return true; // network hiccup: don't treat as revocation
  return Boolean(data);
};
