// send-push: server-triggered push dispatch (quest completed/approved, loot
// redeemed/approved, streak milestone, level up, invite accepted, wishlist
// proposed) honoring each NPC's notification_preferences.
//
// Skeleton only — dispatch logic lands with the notifications pass.

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });

Deno.serve((req) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'method_not_allowed' });
  }
  return json(501, { error: 'not_implemented' });
});
