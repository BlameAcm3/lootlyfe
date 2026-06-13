import type { AgeBucket } from '../constants/game';
import type { LexiconKey } from '../lib/lexicon';
import type { RecurrenceType } from '../lib/recurrence';
import { baseLexicon } from '../themes/high-fantasy';

/**
 * Preset quest library — client-side typed content per CLAUDE.md (data/ holds
 * presets; the DB stores only guild-created rows). NPCs browse these and
 * instantiate them into the quests table via the quest builder, which stamps
 * source_preset_id so preset-sourced quests never count against the free-tier
 * custom quest limit.
 *
 * Display is lexicon-keyed where flavor varies by theme: titles stay literal
 * ("Make your bed" is the chore, in every theme), while category labels and
 * flavor text resolve through t(labelKey) / t(flavorKey) so packs can reskin
 * them ("Castle Chores" vs "Ship Chores").
 *
 * Balancing: gold ≈ minutes of effort; XP ≈ 2x gold so levels move faster
 * than spending money. Difficulty is 1-3 pips.
 */

export type PresetRecurrence = Extract<RecurrenceType, 'daily' | 'weekly' | 'once'>;

export type QuestCategoryId = 'chores' | 'hygiene' | 'school' | 'kindness' | 'exercise';

export type QuestCategory = {
  id: QuestCategoryId;
  labelKey: LexiconKey;
  emoji: string;
};

export type PresetQuest = {
  id: string;
  /** Literal chore name — identical across themes by design. */
  title: string;
  /** Themed flavor text, resolved via t(flavorKey). */
  flavorKey: LexiconKey;
  categoryId: QuestCategoryId;
  emoji: string;
  goldReward: number;
  xpReward: number;
  difficulty: 1 | 2 | 3;
  /** Suggested audience; the builder shows all presets regardless. */
  ageBuckets: AgeBucket[];
  /** Suggested cadence the builder prefills; the NPC can change it. */
  recurrence: PresetRecurrence;
};

export const QUEST_CATEGORIES: QuestCategory[] = [
  { id: 'chores', labelKey: 'category_chores', emoji: '🧹' },
  { id: 'hygiene', labelKey: 'category_hygiene', emoji: '🫧' },
  { id: 'school', labelKey: 'category_school', emoji: '📚' },
  { id: 'kindness', labelKey: 'category_kindness', emoji: '💛' },
  { id: 'exercise', labelKey: 'category_exercise', emoji: '🏃' },
];

export const PRESET_QUESTS: PresetQuest[] = [
  // Chores
  {
    id: 'make-bed',
    title: 'Make your bed',
    flavorKey: 'preset_flavor_make_bed',
    categoryId: 'chores',
    emoji: '🛏️',
    goldReward: 5,
    xpReward: 10,
    difficulty: 1,
    ageBuckets: ['5-8', '9-12', '13+'],
    recurrence: 'daily',
  },
  {
    id: 'tidy-room',
    title: 'Tidy your room',
    flavorKey: 'preset_flavor_tidy_room',
    categoryId: 'chores',
    emoji: '🧸',
    goldReward: 10,
    xpReward: 20,
    difficulty: 2,
    ageBuckets: ['5-8', '9-12', '13+'],
    recurrence: 'weekly',
  },
  {
    id: 'set-table',
    title: 'Set the table',
    flavorKey: 'preset_flavor_set_table',
    categoryId: 'chores',
    emoji: '🍽️',
    goldReward: 5,
    xpReward: 10,
    difficulty: 1,
    ageBuckets: ['5-8', '9-12'],
    recurrence: 'daily',
  },
  {
    id: 'unload-dishwasher',
    title: 'Unload the dishwasher',
    flavorKey: 'preset_flavor_unload_dishwasher',
    categoryId: 'chores',
    emoji: '🫙',
    goldReward: 8,
    xpReward: 16,
    difficulty: 2,
    ageBuckets: ['9-12', '13+'],
    recurrence: 'daily',
  },
  {
    id: 'take-out-trash',
    title: 'Take out the trash',
    flavorKey: 'preset_flavor_take_out_trash',
    categoryId: 'chores',
    emoji: '🗑️',
    goldReward: 8,
    xpReward: 15,
    difficulty: 1,
    ageBuckets: ['9-12', '13+'],
    recurrence: 'weekly',
  },
  {
    id: 'feed-pet',
    title: 'Feed the pet',
    flavorKey: 'preset_flavor_feed_pet',
    categoryId: 'chores',
    emoji: '🐕',
    goldReward: 5,
    xpReward: 12,
    difficulty: 1,
    ageBuckets: ['5-8', '9-12', '13+'],
    recurrence: 'daily',
  },

  // Hygiene
  {
    id: 'brush-teeth',
    title: 'Brush your teeth',
    flavorKey: 'preset_flavor_brush_teeth',
    categoryId: 'hygiene',
    emoji: '🪥',
    goldReward: 3,
    xpReward: 8,
    difficulty: 1,
    ageBuckets: ['5-8', '9-12'],
    recurrence: 'daily',
  },
  {
    id: 'take-shower',
    title: 'Take a shower or bath',
    flavorKey: 'preset_flavor_take_shower',
    categoryId: 'hygiene',
    emoji: '🚿',
    goldReward: 5,
    xpReward: 12,
    difficulty: 1,
    ageBuckets: ['5-8', '9-12', '13+'],
    recurrence: 'daily',
  },
  {
    id: 'brush-hair',
    title: 'Brush your hair',
    flavorKey: 'preset_flavor_brush_hair',
    categoryId: 'hygiene',
    emoji: '💇',
    goldReward: 3,
    xpReward: 6,
    difficulty: 1,
    ageBuckets: ['5-8', '9-12'],
    recurrence: 'daily',
  },
  {
    id: 'clothes-in-hamper',
    title: 'Put dirty clothes in the hamper',
    flavorKey: 'preset_flavor_clothes_in_hamper',
    categoryId: 'hygiene',
    emoji: '🧺',
    goldReward: 4,
    xpReward: 8,
    difficulty: 1,
    ageBuckets: ['5-8', '9-12', '13+'],
    recurrence: 'daily',
  },
  {
    id: 'wash-hands',
    title: 'Wash hands before dinner',
    flavorKey: 'preset_flavor_wash_hands',
    categoryId: 'hygiene',
    emoji: '🧼',
    goldReward: 2,
    xpReward: 5,
    difficulty: 1,
    ageBuckets: ['5-8'],
    recurrence: 'daily',
  },
  {
    id: 'trim-nails',
    title: 'Trim your nails',
    flavorKey: 'preset_flavor_trim_nails',
    categoryId: 'hygiene',
    emoji: '✂️',
    goldReward: 5,
    xpReward: 10,
    difficulty: 2,
    ageBuckets: ['9-12', '13+'],
    recurrence: 'weekly',
  },

  // School
  {
    id: 'homework',
    title: 'Finish your homework',
    flavorKey: 'preset_flavor_homework',
    categoryId: 'school',
    emoji: '✏️',
    goldReward: 10,
    xpReward: 25,
    difficulty: 2,
    ageBuckets: ['5-8', '9-12', '13+'],
    recurrence: 'daily',
  },
  {
    id: 'read-20',
    title: 'Read for 20 minutes',
    flavorKey: 'preset_flavor_read_20',
    categoryId: 'school',
    emoji: '📖',
    goldReward: 8,
    xpReward: 20,
    difficulty: 1,
    ageBuckets: ['5-8', '9-12', '13+'],
    recurrence: 'daily',
  },
  {
    id: 'pack-bag',
    title: 'Pack your school bag',
    flavorKey: 'preset_flavor_pack_bag',
    categoryId: 'school',
    emoji: '🎒',
    goldReward: 5,
    xpReward: 10,
    difficulty: 1,
    ageBuckets: ['5-8', '9-12', '13+'],
    recurrence: 'daily',
  },
  {
    id: 'practice-instrument',
    title: 'Practice your instrument',
    flavorKey: 'preset_flavor_practice_instrument',
    categoryId: 'school',
    emoji: '🎻',
    goldReward: 10,
    xpReward: 22,
    difficulty: 2,
    ageBuckets: ['9-12', '13+'],
    recurrence: 'daily',
  },
  {
    id: 'study-spelling',
    title: 'Study your spelling words',
    flavorKey: 'preset_flavor_study_spelling',
    categoryId: 'school',
    emoji: '🔤',
    goldReward: 8,
    xpReward: 18,
    difficulty: 2,
    ageBuckets: ['5-8', '9-12'],
    recurrence: 'weekly',
  },
  {
    id: 'organize-desk',
    title: 'Organize your desk',
    flavorKey: 'preset_flavor_organize_desk',
    categoryId: 'school',
    emoji: '🗂️',
    goldReward: 8,
    xpReward: 15,
    difficulty: 2,
    ageBuckets: ['9-12', '13+'],
    recurrence: 'weekly',
  },

  // Kindness
  {
    id: 'help-sibling',
    title: 'Help a sibling with something',
    flavorKey: 'preset_flavor_help_sibling',
    categoryId: 'kindness',
    emoji: '🤝',
    goldReward: 8,
    xpReward: 20,
    difficulty: 1,
    ageBuckets: ['5-8', '9-12', '13+'],
    recurrence: 'once',
  },
  {
    id: 'write-thanks',
    title: 'Write a thank-you note',
    flavorKey: 'preset_flavor_write_thanks',
    categoryId: 'kindness',
    emoji: '💌',
    goldReward: 10,
    xpReward: 22,
    difficulty: 2,
    ageBuckets: ['9-12', '13+'],
    recurrence: 'once',
  },
  {
    id: 'give-compliment',
    title: 'Give someone a real compliment',
    flavorKey: 'preset_flavor_give_compliment',
    categoryId: 'kindness',
    emoji: '🌟',
    goldReward: 4,
    xpReward: 10,
    difficulty: 1,
    ageBuckets: ['5-8', '9-12', '13+'],
    recurrence: 'daily',
  },
  {
    id: 'share-toy',
    title: 'Share a toy or game',
    flavorKey: 'preset_flavor_share_toy',
    categoryId: 'kindness',
    emoji: '🎲',
    goldReward: 5,
    xpReward: 12,
    difficulty: 1,
    ageBuckets: ['5-8'],
    recurrence: 'once',
  },
  {
    id: 'call-grandparent',
    title: 'Call a grandparent',
    flavorKey: 'preset_flavor_call_grandparent',
    categoryId: 'kindness',
    emoji: '📞',
    goldReward: 8,
    xpReward: 18,
    difficulty: 1,
    ageBuckets: ['5-8', '9-12', '13+'],
    recurrence: 'weekly',
  },
  {
    id: 'carry-groceries',
    title: 'Help carry in the groceries',
    flavorKey: 'preset_flavor_carry_groceries',
    categoryId: 'kindness',
    emoji: '🛒',
    goldReward: 6,
    xpReward: 12,
    difficulty: 1,
    ageBuckets: ['5-8', '9-12', '13+'],
    recurrence: 'once',
  },

  // Exercise
  {
    id: 'walk-dog',
    title: 'Walk the dog',
    flavorKey: 'preset_flavor_walk_dog',
    categoryId: 'exercise',
    emoji: '🦮',
    goldReward: 12,
    xpReward: 25,
    difficulty: 2,
    ageBuckets: ['9-12', '13+'],
    recurrence: 'daily',
  },
  {
    id: 'bike-ride',
    title: 'Go for a bike ride',
    flavorKey: 'preset_flavor_bike_ride',
    categoryId: 'exercise',
    emoji: '🚴',
    goldReward: 10,
    xpReward: 22,
    difficulty: 2,
    ageBuckets: ['9-12', '13+'],
    recurrence: 'weekly',
  },
  {
    id: 'play-outside',
    title: 'Play outside for 30 minutes',
    flavorKey: 'preset_flavor_play_outside',
    categoryId: 'exercise',
    emoji: '🌳',
    goldReward: 8,
    xpReward: 20,
    difficulty: 1,
    ageBuckets: ['5-8', '9-12'],
    recurrence: 'daily',
  },
  {
    id: 'stretch',
    title: 'Do 10 minutes of stretches',
    flavorKey: 'preset_flavor_stretch',
    categoryId: 'exercise',
    emoji: '🧘',
    goldReward: 5,
    xpReward: 12,
    difficulty: 1,
    ageBuckets: ['9-12', '13+'],
    recurrence: 'daily',
  },
  {
    id: 'sports-practice',
    title: 'Go to sports practice',
    flavorKey: 'preset_flavor_sports_practice',
    categoryId: 'exercise',
    emoji: '⚽',
    goldReward: 12,
    xpReward: 28,
    difficulty: 2,
    ageBuckets: ['9-12', '13+'],
    recurrence: 'weekly',
  },
  {
    id: 'dance-party',
    title: 'Have a 15-minute dance party',
    flavorKey: 'preset_flavor_dance_party',
    categoryId: 'exercise',
    emoji: '🪩',
    goldReward: 5,
    xpReward: 14,
    difficulty: 1,
    ageBuckets: ['5-8', '9-12'],
    recurrence: 'once',
  },
];

export const questsByCategory = (categoryId: QuestCategoryId): PresetQuest[] =>
  PRESET_QUESTS.filter((quest) => quest.categoryId === categoryId);

export const presetById = (id: string | null | undefined): PresetQuest | undefined =>
  id ? PRESET_QUESTS.find((quest) => quest.id === id) : undefined;

export const categoryById = (id: string | null | undefined): QuestCategory | undefined =>
  QUEST_CATEGORIES.find((category) => category.id === id);

/**
 * Canonical (theme-neutral, base-lexicon) flavor text — what the builder
 * writes to quests.description when instantiating a preset.
 */
export const presetCanonicalDescription = (preset: PresetQuest): string =>
  baseLexicon[preset.flavorKey];

/**
 * Display description for a stored quest row. Preset-sourced quests whose
 * description the NPC never customized re-resolve through the lexicon, so
 * flavor text follows the viewer's theme; customized text always wins.
 */
export const questDisplayDescription = (
  quest: { source_preset_id: string | null; description: string | null },
  t: (key: LexiconKey) => string,
): string | undefined => {
  const preset = presetById(quest.source_preset_id);
  if (preset && (!quest.description || quest.description === baseLexicon[preset.flavorKey])) {
    return t(preset.flavorKey);
  }
  return quest.description ?? undefined;
};

/** Emoji tile for a stored quest row: preset art, else its category, else ⚔️. */
export const questEmoji = (quest: {
  source_preset_id: string | null;
  category: string | null;
}): string =>
  presetById(quest.source_preset_id)?.emoji ?? categoryById(quest.category)?.emoji ?? '⚔️';
