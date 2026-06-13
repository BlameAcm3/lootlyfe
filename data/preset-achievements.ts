import type { LexiconKey } from '../lib/lexicon';

/**
 * Achievement catalog — presentation side. Award detection lives entirely in
 * the DB (migration 014: achievements table + award_achievements trigger
 * path); ids, kinds, thresholds, and points here MUST match those seeds, the
 * same way lib/game-math.ts mirrors the SQL game-math functions.
 *
 * Kinds:
 *   quest_count       — total approved quest completions
 *   streak_days       — best streak reached (current or longest)
 *   level             — level reached
 *   redemption_count  — approved loot redemptions
 *   required_week     — every required quest approved across a 7-day window
 */

export type AchievementKind =
  | 'quest_count'
  | 'streak_days'
  | 'level'
  | 'redemption_count'
  | 'required_week';

type PresetAchievementShape = {
  id: string;
  kind: AchievementKind;
  threshold: number;
  /** Achievement points granted via the ledger when earned. */
  points: number;
  emoji: string;
  nameKey: LexiconKey;
  descriptionKey: LexiconKey;
};

export const PRESET_ACHIEVEMENTS = [
  // Quest milestones
  {
    id: 'first-quest',
    kind: 'quest_count',
    threshold: 1,
    points: 10,
    emoji: '🌱',
    nameKey: 'ach_first_quest_name',
    descriptionKey: 'ach_first_quest_desc',
  },
  {
    id: 'quests-10',
    kind: 'quest_count',
    threshold: 10,
    points: 15,
    emoji: '🗡️',
    nameKey: 'ach_quests_10_name',
    descriptionKey: 'ach_quests_10_desc',
  },
  {
    id: 'quests-25',
    kind: 'quest_count',
    threshold: 25,
    points: 25,
    emoji: '🛡️',
    nameKey: 'ach_quests_25_name',
    descriptionKey: 'ach_quests_25_desc',
  },
  {
    id: 'quests-50',
    kind: 'quest_count',
    threshold: 50,
    points: 40,
    emoji: '⚔️',
    nameKey: 'ach_quests_50_name',
    descriptionKey: 'ach_quests_50_desc',
  },
  {
    id: 'quests-100',
    kind: 'quest_count',
    threshold: 100,
    points: 75,
    emoji: '🏰',
    nameKey: 'ach_quests_100_name',
    descriptionKey: 'ach_quests_100_desc',
  },
  {
    id: 'quests-250',
    kind: 'quest_count',
    threshold: 250,
    points: 150,
    emoji: '🐉',
    nameKey: 'ach_quests_250_name',
    descriptionKey: 'ach_quests_250_desc',
  },
  // Streaks
  {
    id: 'streak-3',
    kind: 'streak_days',
    threshold: 3,
    points: 10,
    emoji: '✨',
    nameKey: 'ach_streak_3_name',
    descriptionKey: 'ach_streak_3_desc',
  },
  {
    id: 'streak-7',
    kind: 'streak_days',
    threshold: 7,
    points: 25,
    emoji: '🔥',
    nameKey: 'ach_streak_7_name',
    descriptionKey: 'ach_streak_7_desc',
  },
  {
    id: 'streak-14',
    kind: 'streak_days',
    threshold: 14,
    points: 50,
    emoji: '☄️',
    nameKey: 'ach_streak_14_name',
    descriptionKey: 'ach_streak_14_desc',
  },
  {
    id: 'streak-30',
    kind: 'streak_days',
    threshold: 30,
    points: 100,
    emoji: '🌋',
    nameKey: 'ach_streak_30_name',
    descriptionKey: 'ach_streak_30_desc',
  },
  // Level milestones
  {
    id: 'level-5',
    kind: 'level',
    threshold: 5,
    points: 20,
    emoji: '⭐',
    nameKey: 'ach_level_5_name',
    descriptionKey: 'ach_level_5_desc',
  },
  {
    id: 'level-10',
    kind: 'level',
    threshold: 10,
    points: 40,
    emoji: '🌟',
    nameKey: 'ach_level_10_name',
    descriptionKey: 'ach_level_10_desc',
  },
  {
    id: 'level-25',
    kind: 'level',
    threshold: 25,
    points: 75,
    emoji: '💫',
    nameKey: 'ach_level_25_name',
    descriptionKey: 'ach_level_25_desc',
  },
  {
    id: 'level-50',
    kind: 'level',
    threshold: 50,
    points: 200,
    emoji: '👑',
    nameKey: 'ach_level_50_name',
    descriptionKey: 'ach_level_50_desc',
  },
  // Loot
  {
    id: 'first-redemption',
    kind: 'redemption_count',
    threshold: 1,
    points: 10,
    emoji: '🎁',
    nameKey: 'ach_first_redemption_name',
    descriptionKey: 'ach_first_redemption_desc',
  },
  {
    id: 'redemptions-10',
    kind: 'redemption_count',
    threshold: 10,
    points: 25,
    emoji: '💰',
    nameKey: 'ach_redemptions_10_name',
    descriptionKey: 'ach_redemptions_10_desc',
  },
  // Dedication
  {
    id: 'required-week',
    kind: 'required_week',
    threshold: 1,
    points: 30,
    emoji: '🏅',
    nameKey: 'ach_required_week_name',
    descriptionKey: 'ach_required_week_desc',
  },
] as const satisfies readonly PresetAchievementShape[];

export type PresetAchievement = (typeof PRESET_ACHIEVEMENTS)[number];
export type AchievementId = PresetAchievement['id'];

const byId = new Map<string, PresetAchievement>(PRESET_ACHIEVEMENTS.map((a) => [a.id, a]));

/** Presentation entry for an award row, or null for ids this app build
 * doesn't know yet (newer server catalog — skip rendering, don't crash). */
export const presetAchievementById = (id: string): PresetAchievement | null => byId.get(id) ?? null;
