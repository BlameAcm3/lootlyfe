import { useMutation, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/shared/lib/supabase';
import { guildKeys } from './guildQueries';

/**
 * Co-parent invites (migration 016). Both paths are SECURITY DEFINER RPCs:
 *   * create_guild_invite — premium-gated (free = 1 NPC), mints an 8-char code.
 *   * accept_guild_invite — attaches the signed-in NPC to the guild as admin.
 * Postgres `raise exception '<code>'` surfaces as error.message; we map the
 * known ones so callers can show friendly, localized copy.
 */

export type InviteErrorCode =
  | 'premium_required'
  | 'npc_seat_limit_reached'
  | 'not_a_guild_npc'
  | 'invite_not_found'
  | 'invite_expired'
  | 'invite_already_used'
  | 'already_member'
  | 'requires_full_account'
  | 'generic';

const KNOWN_CODES: InviteErrorCode[] = [
  'premium_required',
  'npc_seat_limit_reached',
  'not_a_guild_npc',
  'invite_not_found',
  'invite_expired',
  'invite_already_used',
  'already_member',
  'requires_full_account',
];

export class InviteError extends Error {
  code: InviteErrorCode;
  constructor(code: InviteErrorCode) {
    super(code);
    this.code = code;
  }
}

const toInviteError = (message: string | undefined): InviteError => {
  const match = KNOWN_CODES.find((code) => (message ?? '').includes(code));
  return new InviteError(match ?? 'generic');
};

export type GuildInvite = { code: string; expires_at: string };

/** NPC: mint a co-parent invite code (premium-gated server-side). */
export const useCreateGuildInvite = () =>
  useMutation({
    mutationFn: async (): Promise<GuildInvite> => {
      const { data, error } = await supabase.rpc('create_guild_invite');
      if (error) throw toInviteError(error.message);
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) throw new InviteError('generic');
      return row as GuildInvite;
    },
  });

/** Invited NPC: accept a code, joining the existing guild as an admin. */
export const useAcceptGuildInvite = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ code, displayName }: { code: string; displayName?: string }) => {
      const { data, error } = await supabase.rpc('accept_guild_invite', {
        p_code: code.trim().toUpperCase(),
        p_display_name: displayName ?? '',
      });
      if (error) throw toInviteError(error.message);
      return data as string; // guild_id
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: guildKeys.all });
    },
  });
};
