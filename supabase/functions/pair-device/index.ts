// pair-device: binds a kid device (anonymous auth session) to an adventurer.
//
// POST { code: string, label?: string } with the anon session's JWT in the
// Authorization header (verify_jwt is on for this function).
//
// Flow:
//   1. Resolve the caller from the JWT; require an ANONYMOUS user (NPC
//      sessions never get bindings — single-device families use mode toggle).
//   2. Look up the 6-digit code: must exist, be unconsumed, and unexpired.
//   3. Consume the code atomically (conditional update) so two devices racing
//      on the same code cannot both pair.
//   4. Revoke any previous bindings for this device, insert the new
//      device_bindings row, and log the verifiable parental consent event.
//
// Uses the service role: pairing_codes/device_bindings/consent_events have no
// client INSERT policies for devices by design.

import { createClient } from 'npm:@supabase/supabase-js@2';

type PairRequest = {
  code?: unknown;
  label?: unknown;
};

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  let body: PairRequest;
  try {
    body = (await req.json()) as PairRequest;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const code = typeof body.code === 'string' ? body.code.trim() : '';
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 80) : null;
  if (!/^[0-9]{6}$/.test(code)) {
    return json(400, { error: 'invalid_code_format' });
  }

  const authHeader = req.headers.get('Authorization') ?? '';
  const jwt = authHeader.replace(/^Bearer\s+/i, '');
  if (!jwt) {
    return json(401, { error: 'missing_authorization' });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const {
    data: { user },
    error: userError,
  } = await admin.auth.getUser(jwt);
  if (userError || !user) {
    return json(401, { error: 'invalid_session' });
  }
  if (!user.is_anonymous) {
    // Bindings are for kid devices only; a signed-in NPC pairing their own
    // session would conflate the two identities.
    return json(403, { error: 'requires_anonymous_session' });
  }

  const { data: pairingCode, error: codeError } = await admin
    .from('pairing_codes')
    .select('id, guild_id, adventurer_id, expires_at, consumed_at, created_by_npc_id')
    .eq('code', code)
    .is('consumed_at', null)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (codeError) {
    return json(500, { error: 'code_lookup_failed' });
  }
  if (!pairingCode) {
    return json(404, { error: 'code_not_found' });
  }
  if (new Date(pairingCode.expires_at).getTime() <= Date.now()) {
    return json(410, { error: 'code_expired' });
  }

  // Atomic consume: only one device can flip consumed_at from null.
  const { data: consumed, error: consumeError } = await admin
    .from('pairing_codes')
    .update({ consumed_at: new Date().toISOString() })
    .eq('id', pairingCode.id)
    .is('consumed_at', null)
    .select('id')
    .maybeSingle();
  if (consumeError) {
    return json(500, { error: 'code_consume_failed' });
  }
  if (!consumed) {
    return json(409, { error: 'code_already_used' });
  }

  // Re-pairing replaces: a device holds at most one active binding.
  const { error: revokeError } = await admin
    .from('device_bindings')
    .update({ revoked_at: new Date().toISOString() })
    .eq('user_id', user.id)
    .is('revoked_at', null);
  if (revokeError) {
    return json(500, { error: 'binding_revoke_failed' });
  }

  const { data: binding, error: bindingError } = await admin
    .from('device_bindings')
    .insert({
      user_id: user.id,
      adventurer_id: pairingCode.adventurer_id,
      guild_id: pairingCode.guild_id,
      label,
    })
    .select('id, adventurer_id, guild_id')
    .single();
  if (bindingError || !binding) {
    return json(500, { error: 'binding_create_failed' });
  }

  // Verifiable parental consent: the NPC who minted the code consented to
  // this device pairing.
  const { error: consentError } = await admin.from('consent_events').insert({
    guild_id: pairingCode.guild_id,
    npc_id: pairingCode.created_by_npc_id,
    type: 'device_pairing',
    method: 'pairing_code',
  });
  if (consentError) {
    // The binding exists; surface the logging failure rather than hiding it.
    return json(500, { error: 'consent_log_failed' });
  }

  return json(200, {
    binding_id: binding.id,
    adventurer_id: binding.adventurer_id,
    guild_id: binding.guild_id,
  });
});
