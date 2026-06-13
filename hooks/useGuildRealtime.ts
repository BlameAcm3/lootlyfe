import { useEffect } from 'react';
import { useQueryClient, type QueryClient } from '@tanstack/react-query';
import type { RealtimePostgresChangesPayload } from '@supabase/supabase-js';

import { supabase } from '@/shared/lib/supabase';
import { useRealtimeStore } from '@/stores/realtimeStore';
import { guildKeys, type CurrentGuild } from '../queries/guildQueries';
import { adventurerKeys, type AdventurerRow } from '../queries/adventurerQueries';
import { pairingKeys } from '../queries/pairingQueries';

type Row = Record<string, unknown>;

type RealtimeContext = {
  /** The guild to subscribe to. Null until known (no channel opened). */
  guildId: string | null | undefined;
  /**
   * Set for kid devices: scopes the adventurer-owned tables to this profile so
   * a paired device only receives its own completions/redemptions/wishlist.
   * Null/undefined for NPCs (RLS scopes those tables to the whole guild).
   */
  adventurerId?: string | null;
};

const BACKOFF_BASE_MS = 1000;
const BACKOFF_MAX_MS = 30_000;

/** Tables carrying guild_id directly → known-shape cache writes where possible. */
const GUILD_FILTER = (guildId: string) => `guild_id=eq.${guildId}`;

/**
 * One Supabase Realtime channel per guild (`guild:${guildId}`). Postgres
 * changes on the six live tables are mapped to surgical TanStack Query cache
 * updates: setQueryData where the row shape is known (guilds, adventurer
 * profiles), invalidate otherwise. RLS scopes delivery — a kid device only ever
 * receives rows its policies allow, which we further narrow with an
 * adventurer_id filter on the adventurer-owned tables.
 *
 * Subscribe when guildId is ready; tear down on unmount / guild change /
 * sign-out. Reconnect with exponential backoff on channel error.
 */
export const useGuildRealtime = ({ guildId, adventurerId }: RealtimeContext): void => {
  const queryClient = useQueryClient();
  const setStatus = useRealtimeStore((state) => state.setStatus);

  useEffect(() => {
    if (!guildId) {
      setStatus('connecting');
      return;
    }

    let channel: ReturnType<typeof supabase.channel> | null = null;
    let backoff = BACKOFF_BASE_MS;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let cancelled = false;

    const subscribe = () => {
      if (cancelled) return;
      setStatus('connecting');

      // Not a "private" channel: postgres_changes RLS is enforced from the
      // session token set via realtime.setAuth() below, and private channels
      // would additionally require realtime.messages policies we don't use.
      const c = supabase.channel(`guild:${guildId}`);

      // --- guild-scoped tables (filter by guild_id) ---
      c.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'guilds', filter: `id=eq.${guildId}` },
        (payload) => onGuildChange(queryClient, payload),
      );
      c.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'adventurer_profiles', filter: GUILD_FILTER(guildId) },
        (payload) => onAdventurerChange(queryClient, guildId, payload),
      );
      c.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quests', filter: GUILD_FILTER(guildId) },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['quests'] });
        },
      );

      // --- adventurer-owned tables (no guild_id column) ---
      // Kid devices filter to their own profile; NPCs subscribe unfiltered and
      // rely on RLS to scope delivery to the guild.
      const advFilter = adventurerId ? { filter: `adventurer_id=eq.${adventurerId}` } : {};
      c.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'quest_completions', ...advFilter },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['quest-completions'] });
          void queryClient.invalidateQueries({ queryKey: ['completions'] });
          void queryClient.invalidateQueries({ queryKey: adventurerKeys.all });
          void queryClient.invalidateQueries({ queryKey: ['bound-adventurer'] });
        },
      );
      c.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'loot_redemptions', ...advFilter },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['loot-redemptions'] });
          void queryClient.invalidateQueries({ queryKey: adventurerKeys.all });
          void queryClient.invalidateQueries({ queryKey: ['bound-adventurer'] });
        },
      );
      c.on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'loot_wishlist', ...advFilter },
        () => {
          void queryClient.invalidateQueries({ queryKey: ['loot-wishlist'] });
        },
      );

      c.subscribe((status) => {
        if (cancelled) return;
        if (status === 'SUBSCRIBED') {
          backoff = BACKOFF_BASE_MS; // healthy: reset the retry clock
          setStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setStatus('offline');
          if (retryTimer) clearTimeout(retryTimer);
          retryTimer = setTimeout(() => {
            void supabase.removeChannel(c);
            subscribe();
          }, backoff);
          backoff = Math.min(backoff * 2, BACKOFF_MAX_MS);
        }
      });

      channel = c;
    };

    // Realtime RLS evaluates the subscriber's JWT; make sure it's the current
    // session token before we open the (private) channel.
    void supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      supabase.realtime.setAuth(data.session?.access_token ?? null);
      subscribe();
    });

    return () => {
      cancelled = true;
      if (retryTimer) clearTimeout(retryTimer);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [guildId, adventurerId, queryClient, setStatus]);
};

// ---------------------------------------------------------------------------
// Surgical cache writers (known shapes). Each guards on an existing cache entry
// so realtime never resurrects a query no screen is observing.
// ---------------------------------------------------------------------------

function onGuildChange(queryClient: QueryClient, payload: RealtimePostgresChangesPayload<Row>) {
  if (payload.eventType !== 'UPDATE') return;
  const next = payload.new as Partial<CurrentGuild['guild']>;
  queryClient.setQueryData<CurrentGuild | null>(guildKeys.current, (prev) =>
    prev ? { ...prev, guild: { ...prev.guild, ...next } } : prev,
  );
}

function onAdventurerChange(
  queryClient: QueryClient,
  guildId: string,
  payload: RealtimePostgresChangesPayload<Row>,
) {
  if (payload.eventType === 'DELETE') {
    void queryClient.invalidateQueries({ queryKey: adventurerKeys.list(guildId) });
    return;
  }
  const row = payload.new as AdventurerRow;
  // NPC roster list: patch the matching row in place.
  queryClient.setQueryData<AdventurerRow[]>(adventurerKeys.list(guildId), (prev) =>
    prev ? prev.map((a) => (a.id === row.id ? { ...a, ...row } : a)) : prev,
  );
  // Kid dashboard: gold/XP/level/streak for the bound adventurer.
  queryClient.setQueryData<AdventurerRow | null>(pairingKeys.boundAdventurer(row.id), (prev) =>
    prev ? { ...prev, ...row } : prev,
  );
}
