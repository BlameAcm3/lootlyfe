import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { supabase } from '@/shared/lib/supabase';
import type { Database } from '../types/database';

export type NotificationSettingsRow =
  Database['public']['Tables']['npc_notification_settings']['Row'];
export type NotificationPreferenceRow =
  Database['public']['Tables']['notification_preferences']['Row'];

/**
 * NPC notification controls. Two backing stores (migration 016):
 *   * npc_notification_settings — master switch + quiet hours (one row per NPC).
 *   * notification_preferences  — the MUTE SET. A row exists only when something
 *     is muted (enabled = false); absence means "notify". resolve_push_targets
 *     reads both. We model toggles as insert/delete to sidestep NULL handling
 *     in the (npc_id, channel, scope_type, scope_id) unique index.
 */

/** NPC-class events an NPC may individually mute (kid celebration events aren't mutable). */
export const MUTABLE_EVENT_TYPES = [
  'quest_completed',
  'redemption_requested',
  'wishlist_proposed',
] as const;
export type MutableEventType = (typeof MUTABLE_EVENT_TYPES)[number];

export const notificationKeys = {
  settings: (npcId: string) => ['notification-settings', npcId] as const,
  mutes: (npcId: string) => ['notification-mutes', npcId] as const,
};

const DEFAULT_SETTINGS = (npcId: string): NotificationSettingsRow => ({
  npc_id: npcId,
  master_enabled: true,
  quiet_hours_start: null,
  quiet_hours_end: null,
  timezone: 'UTC',
});

/** Per-NPC master switch + quiet hours (falls back to defaults when unset). */
export const useNotificationSettings = (npcId: string | null | undefined) =>
  useQuery({
    enabled: Boolean(npcId),
    queryKey: notificationKeys.settings(npcId ?? 'none'),
    queryFn: async (): Promise<NotificationSettingsRow> => {
      const { data, error } = await supabase
        .from('npc_notification_settings')
        .select('*')
        .eq('npc_id', npcId ?? '')
        .maybeSingle();
      if (error) throw error;
      return data ?? DEFAULT_SETTINGS(npcId ?? '');
    },
  });

type SettingsPatch = Partial<
  Pick<NotificationSettingsRow, 'master_enabled' | 'quiet_hours_start' | 'quiet_hours_end' | 'timezone'>
>;

export const useUpdateNotificationSettings = (npcId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (patch: SettingsPatch) => {
      const { data, error } = await supabase
        .from('npc_notification_settings')
        .upsert({ npc_id: npcId, ...patch }, { onConflict: 'npc_id' })
        .select('*')
        .single();
      if (error) throw error;
      return data;
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: notificationKeys.settings(npcId) }),
  });
};

/** All mute rows for this NPC (event-type mutes + per-adventurer mutes). */
export const useNotificationMutes = (npcId: string | null | undefined) =>
  useQuery({
    enabled: Boolean(npcId),
    queryKey: notificationKeys.mutes(npcId ?? 'none'),
    queryFn: async (): Promise<NotificationPreferenceRow[]> => {
      const { data, error } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('npc_id', npcId ?? '')
        .eq('enabled', false);
      if (error) throw error;
      return data;
    },
  });

export const isEventMuted = (mutes: NotificationPreferenceRow[], event: string): boolean =>
  mutes.some((m) => m.scope_type === 'event' && m.channel === event);

export const isAdventurerMuted = (
  mutes: NotificationPreferenceRow[],
  adventurerId: string,
): boolean => mutes.some((m) => m.scope_type === 'adventurer' && m.scope_id === adventurerId);

/** Mute/unmute by event type (presence of an enabled=false row = muted). */
export const useToggleEventMute = (npcId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ event, muted }: { event: MutableEventType; muted: boolean }) => {
      if (muted) {
        const { error } = await supabase.from('notification_preferences').insert({
          npc_id: npcId,
          channel: event,
          scope_type: 'event',
          scope_id: null,
          enabled: false,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_preferences')
          .delete()
          .eq('npc_id', npcId)
          .eq('scope_type', 'event')
          .eq('channel', event);
        if (error) throw error;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.mutes(npcId) }),
  });
};

/** Mute/unmute all notifications about a specific adventurer. */
export const useToggleAdventurerMute = (npcId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ adventurerId, muted }: { adventurerId: string; muted: boolean }) => {
      if (muted) {
        const { error } = await supabase.from('notification_preferences').insert({
          npc_id: npcId,
          channel: 'all',
          scope_type: 'adventurer',
          scope_id: adventurerId,
          enabled: false,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('notification_preferences')
          .delete()
          .eq('npc_id', npcId)
          .eq('scope_type', 'adventurer')
          .eq('scope_id', adventurerId);
        if (error) throw error;
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: notificationKeys.mutes(npcId) }),
  });
};
