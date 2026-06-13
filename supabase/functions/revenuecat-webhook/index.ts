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
//   free:     EXPIRATION, SUBSCRIPTION_PAUSED
//   transfer: TRANSFER — entitlement moves between guilds (per-guild model);
//             the LOSING guild ids go free, the GAINING guild id goes premium.
//   no-op:    CANCELLATION and BILLING_ISSUE both KEEP premium — access
//             continues through the billing grace period until RevenueCat
//             ultimately fires EXPIRATION. Downgrade timing is therefore
//             correct without us tracking grace state ourselves. TEST and
//             anything unrecognized are acknowledged with 200 so RevenueCat
//             does not retry forever.

import { createClient } from 'npm:@supabase/supabase-js@2';

type RevenueCatEvent = {
  type?: unknown;
  app_user_id?: unknown;
  // TRANSFER carries the moved-from / moved-to ids instead of app_user_id.
  transferred_from?: unknown;
  transferred_to?: unknown;
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
// Access ends: EXPIRATION (after any grace period) and explicit pause.
const FREE_EVENTS = new Set(['EXPIRATION', 'SUBSCRIPTION_PAUSED']);

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

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const guildIds = (value: unknown): string[] =>
    (Array.isArray(value) ? value : [value]).filter(
      (id): id is string => typeof id === 'string' && UUID_PATTERN.test(id),
    );

  // Idempotent write; returns true if a guild row was actually matched.
  const setEntitlement = async (ids: string[], value: 'free' | 'premium'): Promise<number> => {
    if (ids.length === 0) return 0;
    const { data, error } = await admin
      .from('guilds')
      .update({ subscription_entitlement: value })
      .in('id', ids)
      .select('id');
    if (error) throw error;
    return data?.length ?? 0;
  };

  try {
    // TRANSFER moves the subscription between guilds (per-guild model). The
    // losing guild(s) revert to free; the gaining guild becomes premium.
    if (eventType === 'TRANSFER') {
      const from = guildIds(payload.event?.transferred_from);
      const to = guildIds(payload.event?.transferred_to);
      const downgraded = await setEntitlement(from, 'free');
      const upgraded = await setEntitlement(to, 'premium');
      return json(200, { received: true, action: 'transferred', downgraded, upgraded });
    }

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

    const matched = await setEntitlement([appUserId], entitlement);
    if (matched === 0) {
      return json(200, { received: true, action: 'skipped_unknown_guild' });
    }
    return json(200, { received: true, action: 'updated', entitlement });
  } catch {
    return json(500, { error: 'guild_update_failed' });
  }
});
