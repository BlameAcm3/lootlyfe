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

/**
 * XP curve: advancing from level L to L+1 costs round(BASE * GROWTH^(L-1)).
 * Level is capped at 50. MUST stay in sync with the SQL mirrors
 * (xp_for_level / level_for_xp in migration 013).
 */
export const XP_CURVE = {
  base: 100,
  growth: 1.15,
  levelCap: 50,
} as const;

/**
 * Streak tiers: MULTIPLIERS[i] applies when current streak days >=
 * THRESHOLDS[i-1] (index 0 is the no-streak baseline). MUST stay in sync
 * with streak_multiplier() in migration 013.
 *
 *   0-2 days → 1.0   ·   3-6 → 1.1   ·   7-13 → 1.25
 *   14-29 → 1.5      ·   30+ → 2.0
 */
export const STREAK_TIER_THRESHOLDS = [3, 7, 14, 30] as const;
export const STREAK_TIER_MULTIPLIERS = [1, 1.1, 1.25, 1.5, 2] as const;

/**
 * Achievement points granted per level gained (cosmetic currency). MUST stay
 * in sync with the level-up grant in migration 013.
 */
export const ACHIEVEMENT_POINTS_PER_LEVEL_UP = 25;
