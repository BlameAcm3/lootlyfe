// revenuecat-webhook: maps RevenueCat subscription events to
// guilds.subscription_entitlement ('free' | 'premium').
//
// RevenueCat is configured with the guild id as app_user_id (subscription is
// per-guild), and sends the value of its configured Authorization header with
// every webhook. verify_jwt is OFF for this function (RevenueCat has no
// Supabase JWT); auth is the shared secret check below.
//
// TODO: set the shared secret before going live:
//   supabase secrets set REVENUECAT_WEBHOOK_SECRET=<value configured in the
//   RevenueCat dashboard's webhook Authorization header>
//
// Event mapping (https://www.revenuecat.com/docs/integrations/webhooks):
//   premium:  INITIAL_PURCHASE, RENEWAL, UNCANCELLATION, PRODUCT_CHANGE
//   free:     EXPIRATION
//   no-op:    CANCELLATION (access continues until EXPIRATION), BILLING_ISSUE,
//             TEST, and anything unrecognized — always 200 so RevenueCat does
//             not retry forever.

import { createClient } from 'npm:@supabase/supabase-js@2';

type RevenueCatEvent = {
  type?: unknown;
  app_user_id?: unknown;
};

type WebhookPayload = {
  event?: RevenueCatEvent;
};

const PREMIUM_EVENTS = new Set([
  'INITIAL_PURCHASE',
  'RENEWAL',
  'UNCANCELLATION',
  'PRODUCT_CHANGE',
]);
const FREE_EVENTS = new Set(['EXPIRATION']);

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }

  const secret = Deno.env.get('REVENUECAT_WEBHOOK_SECRET');
  if (!secret) {
    // Refuse to process unauthenticated entitlement changes.
    return json(500, { error: 'webhook_secret_not_configured' });
  }
  if (req.headers.get('Authorization') !== secret) {
    return json(401, { error: 'invalid_webhook_auth' });
  }

  let payload: WebhookPayload;
  try {
    payload = (await req.json()) as WebhookPayload;
  } catch {
    return json(400, { error: 'invalid_json' });
  }

  const eventType = typeof payload.event?.type === 'string' ? payload.event.type : '';
  const appUserId = typeof payload.event?.app_user_id === 'string' ? payload.event.app_user_id : '';

  const entitlement = PREMIUM_EVENTS.has(eventType)
    ? 'premium'
    : FREE_EVENTS.has(eventType)
      ? 'free'
      : null;

  if (entitlement === null) {
    return json(200, { received: true, action: 'ignored', event: eventType });
  }

  if (!UUID_PATTERN.test(appUserId)) {
    // Anonymous RevenueCat ids ($RCAnonymousID:...) or misconfigured
    // app_user_id — acknowledge so RevenueCat stops retrying, but flag it.
    return json(200, { received: true, action: 'skipped_invalid_app_user_id' });
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const { data: guild, error } = await admin
    .from('guilds')
    .update({ subscription_entitlement: entitlement })
    .eq('id', appUserId)
    .select('id')
    .maybeSingle();
  if (error) {
    return json(500, { error: 'guild_update_failed' });
  }
  if (!guild) {
    return json(200, { received: true, action: 'skipped_unknown_guild' });
  }

  return json(200, { received: true, action: 'updated', entitlement });
});
