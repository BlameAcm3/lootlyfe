import type { PaywallContext } from '../../../lib/routes';

/**
 * Server-side free-tier enforcement raises these exceptions (migration 016 for
 * co-parent seats, migration 017 for the BEFORE INSERT triggers). The Supabase
 * client surfaces the message verbatim, so we map it back to the paywall context
 * that should open — client checks are UX, these triggers are the law, and this
 * is the safety net when a client check is bypassed (deep link, stale data).
 */
const LIMIT_ERROR_CONTEXT: Record<string, PaywallContext> = {
  adventurer_limit_reached: 'adventurer_limit',
  quest_limit_reached: 'quest_limit',
  loot_limit_reached: 'loot_limit',
  npc_seat_limit_reached: 'coparent',
  premium_required: 'coparent',
};

const messageOf = (error: unknown): string | null => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null && 'message' in error) {
    const message = (error as { message?: unknown }).message;
    return typeof message === 'string' ? message : null;
  }
  return null;
};

/** The paywall context a thrown mutation error maps to, or null if unrelated. */
export const limitErrorContext = (error: unknown): PaywallContext | null => {
  const message = messageOf(error);
  if (!message) return null;
  for (const [code, context] of Object.entries(LIMIT_ERROR_CONTEXT)) {
    if (message.includes(code)) return context;
  }
  return null;
};
