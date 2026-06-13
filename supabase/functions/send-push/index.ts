// send-push: server-triggered push dispatch.
//
// Called by the database (pg_net) from the AFTER triggers in migration 016
// with the service-role key in the Authorization header (verify_jwt is off —
// the shared service key IS the auth). Payload shape (built by the triggers):
//
//   { type, guild_id, adventurer_id?, route, data }
//
// Recipient resolution + preference/quiet-hours filtering lives in the SQL
// function public.resolve_push_targets (so it is testable in psql). This
// function only: authenticates the caller, resolves tokens, composes the
// (NPC- or kid-appropriate) copy, and posts to the Expo push service.
//
// Kid devices receive ONLY celebration-class events (approval results, level
// up, streak) — never NPC management alerts, never marketing.

import { createClient } from 'npm:@supabase/supabase-js@2';

type PushType =
  | 'quest_completed'
  | 'quest_approved'
  | 'quest_rejected'
  | 'redemption_requested'
  | 'redemption_approved'
  | 'redemption_denied'
  | 'level_up'
  | 'streak_milestone'
  | 'invite_accepted'
  | 'wishlist_proposed';

type PushPayload = {
  type?: PushType;
  guild_id?: string;
  adventurer_id?: string | null;
  route?: string;
  data?: Record<string, unknown>;
};

type PushTarget = { user_id: string; token: string; platform: string | null };

const EXPO_PUSH_URL = Deno.env.get('EXPO_PUSH_URL') ?? 'https://exp.host/--/api/v2/push/send';

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const num = (v: unknown): number | null => (typeof v === 'number' ? v : null);

/** NPC-facing copy is adult/clear; kid-facing copy is short and celebratory. */
const compose = (type: PushType, data: Record<string, unknown>): { title: string; body: string } => {
  const nickname = str(data.nickname, 'Your adventurer');
  const quest = str(data.quest_title, 'a quest');
  const loot = str(data.loot_name, 'a reward');
  const level = num(data.level);
  const days = num(data.days);
  const who = str(data.display_name, 'A co-parent');

  switch (type) {
    case 'quest_completed':
      return { title: 'Quest awaiting approval', body: `${nickname} completed "${quest}".` };
    case 'redemption_requested':
      return { title: 'Reward request', body: `${nickname} wants to redeem "${loot}".` };
    case 'wishlist_proposed':
      return { title: 'New wishlist idea', body: `${nickname} proposed "${loot}".` };
    case 'invite_accepted':
      return { title: 'Co-parent joined', body: `${who} joined your guild.` };
    case 'quest_approved':
      return { title: 'Quest approved! ⚔️', body: `"${quest}" was approved. Loot is yours!` };
    case 'quest_rejected':
      return { title: 'Quest needs another go', body: `Give "${quest}" another try!` };
    case 'redemption_approved':
      return { title: 'Reward unlocked! 🎁', body: `"${loot}" is approved!` };
    case 'redemption_denied':
      return { title: 'Reward on hold', body: `"${loot}" wasn't approved this time.` };
    case 'level_up':
      return { title: 'Level up! ✨', body: level ? `You reached level ${level}!` : 'You leveled up!' };
    case 'streak_milestone':
      return { title: 'Streak milestone! 🔥', body: days ? `${days}-day streak — amazing!` : 'Streak milestone!' };
    default:
      return { title: 'Lootlyfe', body: 'You have a new update.' };
  }
};

/** Expo accepts up to 100 messages per request. */
const chunk = <T,>(items: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
};

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const authHeader = req.headers.get('Authorization') ?? '';
  if (authHeader.replace(/^Bearer\s+/i, '') !== serviceKey) {
    // Only the database (with the service key) may trigger dispatch.
    return json(401, { error: 'unauthorized' });
  }

  let payload: PushPayload;
  try {
    payload = (await req.json()) as PushPayload;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const type = payload.type;
  const guildId = str(payload.guild_id);
  if (!type || !guildId) {
    return json(400, { error: 'missing_type_or_guild' });
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey);

  const { data: targets, error } = await admin.rpc('resolve_push_targets', {
    p_type: type,
    p_guild_id: guildId,
    p_adventurer_id: payload.adventurer_id ?? null,
  });
  if (error) {
    return json(500, { error: 'resolve_failed', detail: error.message });
  }

  const tokens = ((targets as PushTarget[] | null) ?? [])
    .map((t) => t.token)
    .filter((t) => typeof t === 'string' && t.startsWith('ExponentPushToken'));

  if (tokens.length === 0) {
    return json(200, { sent: 0, reason: 'no_recipients' });
  }

  const { title, body } = compose(type, payload.data ?? {});
  const route = str(payload.route);

  const messages = tokens.map((to) => ({
    to,
    title,
    body,
    sound: 'default',
    data: { type, route, ...(payload.data ?? {}) },
  }));

  let sent = 0;
  for (const batch of chunk(messages, 100)) {
    try {
      const res = await fetch(EXPO_PUSH_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          'Accept-Encoding': 'gzip, deflate',
        },
        body: JSON.stringify(batch),
      });
      if (res.ok) sent += batch.length;
    } catch {
      // Best-effort: a failed batch doesn't fail the whole dispatch.
    }
  }

  return json(200, { sent, recipients: tokens.length, type });
});
