// export-guild-data: compiles a full JSON copy of the caller's guild data
// (COPPA data-access right). Runs with the caller's JWT so every read is
// RLS-scoped to their guild — no service role, no cross-guild leakage. Also
// logs a `data_export` consent event (the NPC may insert consent for their
// own guild per migration 007).

import { createClient } from 'npm:@supabase/supabase-js@2';

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return json(401, { error: 'missing_authorization' });
  }

  // User-scoped client: RLS does the guild scoping for us.
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } },
  );

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData.user) {
    return json(401, { error: 'invalid_session' });
  }

  // The caller's own NPC profile → guild.
  const { data: npc, error: npcError } = await supabase
    .from('npc_profiles')
    .select('id, guild_id')
    .eq('user_id', userData.user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();
  if (npcError) return json(500, { error: 'lookup_failed' });
  if (!npc) return json(404, { error: 'no_guild' });

  const guildId = npc.guild_id as string;

  const [guild, npcs, adventurers, quests, lootItems, consentEvents, notifPrefs] =
    await Promise.all([
      supabase.from('guilds').select('*').eq('id', guildId).maybeSingle(),
      supabase.from('npc_profiles').select('*').eq('guild_id', guildId),
      supabase.from('adventurer_profiles').select('*').eq('guild_id', guildId),
      supabase.from('quests').select('*').eq('guild_id', guildId),
      supabase.from('loot_items').select('*').eq('guild_id', guildId),
      supabase.from('consent_events').select('*').eq('guild_id', guildId),
      supabase.from('notification_preferences').select('*'),
    ]);

  const adventurerIds = (adventurers.data ?? []).map((row) => row.id as string);

  // Adventurer-scoped tables (no direct guild_id column). Empty guild → skip.
  const byAdventurer = async (table: string) => {
    if (adventurerIds.length === 0) return [];
    const { data } = await supabase.from(table).select('*').in('adventurer_id', adventurerIds);
    return data ?? [];
  };

  const [completions, redemptions, wishlist, ledger, cosmetics] = await Promise.all([
    byAdventurer('quest_completions'),
    byAdventurer('loot_redemptions'),
    byAdventurer('loot_wishlist'),
    byAdventurer('gold_xp_ledger'),
    byAdventurer('adventurer_cosmetics'),
  ]);

  // Best-effort audit log (immutable consent record).
  await supabase.from('consent_events').insert({
    guild_id: guildId,
    npc_id: npc.id,
    type: 'data_export',
    method: 'self_service',
  });

  return json(200, {
    exported_at: new Date().toISOString(),
    guild: guild.data ?? null,
    npc_profiles: npcs.data ?? [],
    adventurer_profiles: adventurers.data ?? [],
    quests: quests.data ?? [],
    quest_completions: completions,
    loot_items: lootItems.data ?? [],
    loot_redemptions: redemptions,
    loot_wishlist: wishlist,
    gold_xp_ledger: ledger,
    adventurer_cosmetics: cosmetics,
    consent_events: consentEvents.data ?? [],
    notification_preferences: notifPrefs.data ?? [],
  });
});
