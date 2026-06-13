import {
  ACHIEVEMENT_POINTS_PER_LEVEL_UP,
  STREAK_TIER_MULTIPLIERS,
  STREAK_TIER_THRESHOLDS,
  XP_CURVE,
} from '../constants/game.ts';

/**
 * All XP/level/streak/reward calculations, as pure functions (per CLAUDE.md:
 * never inline these in components). The server mirrors live in migration
 * 013 (xp_for_level, level_for_xp, streak_multiplier) and MUST produce
 * identical results — rewards are granted server-side; the client uses these
 * only for display and optimistic prediction.
 */

/**
 * XP required to advance FROM `level` TO `level + 1`.
 * Level 1→2 costs 100; each step grows 15%, rounded per level.
 * At or above the cap there is no next level: returns 0.
 */
export const xpForLevel = (level: number): number => {
  if (level < 1 || level >= XP_CURVE.levelCap) return 0;
  return Math.round(XP_CURVE.base * XP_CURVE.growth ** (level - 1));
};

/** Total accumulated XP at which `level` is reached (level 1 = 0 XP). */
export const totalXpForLevel = (level: number): number => {
  const target = Math.min(level, XP_CURVE.levelCap);
  let total = 0;
  for (let l = 1; l < target; l += 1) total += xpForLevel(l);
  return total;
};

/** Current level for a total XP amount, capped at XP_CURVE.levelCap. */
export const levelFromXp = (xp: number): number => {
  let level = 1;
  let total = 0;
  while (level < XP_CURVE.levelCap) {
    const step = xpForLevel(level);
    if (total + step > xp) break;
    total += step;
    level += 1;
  }
  return level;
};

export type XpProgress = {
  level: number;
  /** XP earned inside the current level. */
  into: number;
  /** XP needed to finish the current level (0 at the cap). */
  toNext: number;
};

/** XPBar read model: level + progress within it. Full bar at the cap. */
export const xpProgress = (xp: number): XpProgress => {
  const level = levelFromXp(xp);
  const toNext = xpForLevel(level);
  return {
    level,
    into: toNext === 0 ? 0 : Math.max(0, xp - totalXpForLevel(level)),
    toNext,
  };
};

/** Streak multiplier per STREAK_TIER_THRESHOLDS / STREAK_TIER_MULTIPLIERS. */
export const streakMultiplier = (streakDays: number): number => {
  let tier = 0;
  for (let i = 0; i < STREAK_TIER_THRESHOLDS.length; i += 1) {
    if (streakDays >= STREAK_TIER_THRESHOLDS[i]) tier = i + 1;
  }
  return STREAK_TIER_MULTIPLIERS[tier];
};

export type QuestReward = {
  gold: number;
  xp: number;
  multiplier: number;
};

/**
 * Reward for completing a quest at a given streak: base gold/XP times the
 * streak multiplier, rounded half-up per value (matches SQL round()).
 */
export const calculateQuestReward = (
  quest: { gold_reward: number; xp_reward: number },
  streakDays: number,
): QuestReward => {
  const multiplier = streakMultiplier(streakDays);
  return {
    gold: Math.round(quest.gold_reward * multiplier),
    xp: Math.round(quest.xp_reward * multiplier),
    multiplier,
  };
};

/** Achievement points awarded for climbing from one level to another. */
export const achievementPointsForLevelUp = (fromLevel: number, toLevel: number): number =>
  Math.max(0, toLevel - fromLevel) * ACHIEVEMENT_POINTS_PER_LEVEL_UP;

/**
 * How many more quests-worth of gold a kid needs to afford a piece of loot,
 * framed motivationally (never shaming). `averageReward` is the mean base gold
 * reward across the adventurer's assigned quests. Returns 0 once affordable.
 * Falls back to null when there's nothing to average against (no assigned
 * quests), so the UI can show a plain "keep earning" nudge instead of a count.
 */
export const questsAwayFromLoot = (
  goldCost: number,
  goldBalance: number,
  averageReward: number,
): number | null => {
  const shortfall = goldCost - goldBalance;
  if (shortfall <= 0) return 0;
  if (averageReward <= 0) return null;
  return Math.ceil(shortfall / averageReward);
};

/** Mean base gold reward across quests; 0 when the list is empty. */
export const averageGoldReward = (quests: { gold_reward: number }[]): number => {
  if (quests.length === 0) return 0;
  const total = quests.reduce((sum, quest) => sum + quest.gold_reward, 0);
  return total / quests.length;
};
