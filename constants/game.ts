/**
 * Free-tier limits — single source of truth per AGENTS.md > Subscriptions.
 * Enforced client-side via useSubscription/useEntitlements checks, and
 * server-side via Edge Functions in a later pass.
 */
export const FREE_TIER_LIMITS = {
  adventurers: 2,
  custom_quests: 10,
  custom_loot: 5,
  history_days: 7,
  npc_accounts: 1,
} as const;

/** Adventurer age buckets (COPPA: bucket only, never birthdate). */
export const AGE_BUCKETS = ['5-8', '9-12', '13+'] as const;
export type AgeBucket = (typeof AGE_BUCKETS)[number];
