import type { AgeBucket } from '../constants/game';

/**
 * Preset quest library — client-side typed content per CLAUDE.md (data/ holds
 * presets; the DB stores only guild-created rows). NPCs browse these and
 * instantiate them into the guild's quests table in the quest pass.
 *
 * Balancing: gold ≈ minutes of effort; XP ≈ 2x gold for required-feeling
 * quests so levels move faster than spending money. Difficulty is 1-3 pips.
 */
export type QuestRecurrence = 'daily' | 'weekly' | 'once';

export type QuestCategory = {
  id: string;
  label: string;
  emoji: string;
};

export type PresetQuest = {
  id: string;
  title: string;
  description?: string;
  categoryId: string;
  emoji: string;
  goldReward: number;
  xpReward: number;
  difficulty: 1 | 2 | 3;
  ageBuckets: AgeBucket[];
  recurrence: QuestRecurrence;
};

export const QUEST_CATEGORIES: QuestCategory[] = [
  { id: 'morning', label: 'Morning Routine', emoji: '🌅' },
  { id: 'home', label: 'Around the Castle', emoji: '🏰' },
  { id: 'pets', label: 'Creature Care', emoji: '🐾' },
  { id: 'learning', label: 'Training Grounds', emoji: '📚' },
  { id: 'outdoors', label: 'Outdoor Expeditions', emoji: '🌳' },
  { id: 'kindness', label: 'Deeds of Honor', emoji: '💛' },
];

export const PRESET_QUESTS: PresetQuest[] = [
  // Morning routine
  { id: 'make-bed', title: 'Make your bed', description: 'Smooth the blankets and arrange the pillows.', categoryId: 'morning', emoji: '🛏️', goldReward: 5, xpReward: 10, difficulty: 1, ageBuckets: ['5-8', '9-12', '13+'], recurrence: 'daily' },
  { id: 'brush-teeth', title: 'Brush your teeth', description: 'Two full minutes, morning and night.', categoryId: 'morning', emoji: '🪥', goldReward: 3, xpReward: 8, difficulty: 1, ageBuckets: ['5-8', '9-12'], recurrence: 'daily' },
  { id: 'get-dressed', title: 'Get dressed on time', description: 'Ready before the breakfast bell rings.', categoryId: 'morning', emoji: '👕', goldReward: 4, xpReward: 8, difficulty: 1, ageBuckets: ['5-8'], recurrence: 'daily' },
  { id: 'pack-bag', title: 'Pack your school bag', description: 'Homework, water bottle, and lunch — all aboard.', categoryId: 'morning', emoji: '🎒', goldReward: 5, xpReward: 10, difficulty: 1, ageBuckets: ['5-8', '9-12', '13+'], recurrence: 'daily' },

  // Around the home
  { id: 'tidy-room', title: 'Tidy your room', description: 'Toys in bins, clothes in the hamper, floor visible.', categoryId: 'home', emoji: '🧸', goldReward: 10, xpReward: 20, difficulty: 2, ageBuckets: ['5-8', '9-12', '13+'], recurrence: 'weekly' },
  { id: 'set-table', title: 'Set the table', description: 'Plates, cups, and cutlery for the whole party.', categoryId: 'home', emoji: '🍽️', goldReward: 5, xpReward: 10, difficulty: 1, ageBuckets: ['5-8', '9-12'], recurrence: 'daily' },
  { id: 'unload-dishwasher', title: 'Unload the dishwasher', description: 'Put away the clean dishes safely.', categoryId: 'home', emoji: '🫧', goldReward: 8, xpReward: 16, difficulty: 2, ageBuckets: ['9-12', '13+'], recurrence: 'daily' },
  { id: 'take-out-trash', title: 'Take out the trash', description: 'Kitchen trash and recycling to the outside bins.', categoryId: 'home', emoji: '🗑️', goldReward: 8, xpReward: 15, difficulty: 1, ageBuckets: ['9-12', '13+'], recurrence: 'weekly' },
  { id: 'fold-laundry', title: 'Fold and put away laundry', description: 'Your own basket, folded and in drawers.', categoryId: 'home', emoji: '🧺', goldReward: 12, xpReward: 24, difficulty: 2, ageBuckets: ['9-12', '13+'], recurrence: 'weekly' },
  { id: 'vacuum', title: 'Vacuum a room', description: 'Corners count. Watch out for sleeping dragons.', categoryId: 'home', emoji: '🌀', goldReward: 12, xpReward: 22, difficulty: 2, ageBuckets: ['9-12', '13+'], recurrence: 'weekly' },

  // Pets
  { id: 'feed-pet', title: 'Feed the pet', description: 'Measure the food, refresh the water.', categoryId: 'pets', emoji: '🐕', goldReward: 5, xpReward: 12, difficulty: 1, ageBuckets: ['5-8', '9-12', '13+'], recurrence: 'daily' },
  { id: 'walk-dog', title: 'Walk the dog', description: 'A proper adventure around the block.', categoryId: 'pets', emoji: '🦮', goldReward: 12, xpReward: 25, difficulty: 2, ageBuckets: ['9-12', '13+'], recurrence: 'daily' },
  { id: 'clean-litter', title: 'Clean the litter box', description: 'The bravest quest of all.', categoryId: 'pets', emoji: '🐈', goldReward: 15, xpReward: 28, difficulty: 3, ageBuckets: ['9-12', '13+'], recurrence: 'weekly' },

  // Learning
  { id: 'homework', title: 'Finish your homework', description: 'All of it, before screens.', categoryId: 'learning', emoji: '✏️', goldReward: 10, xpReward: 25, difficulty: 2, ageBuckets: ['5-8', '9-12', '13+'], recurrence: 'daily' },
  { id: 'read-20', title: 'Read for 20 minutes', description: 'Any book counts. Comics too.', categoryId: 'learning', emoji: '📖', goldReward: 8, xpReward: 20, difficulty: 1, ageBuckets: ['5-8', '9-12', '13+'], recurrence: 'daily' },
  { id: 'practice-instrument', title: 'Practice your instrument', description: '15 minutes of bardic training.', categoryId: 'learning', emoji: '🎻', goldReward: 10, xpReward: 22, difficulty: 2, ageBuckets: ['9-12', '13+'], recurrence: 'daily' },

  // Outdoors
  { id: 'water-plants', title: 'Water the plants', description: 'Indoor herbs and the garden beds.', categoryId: 'outdoors', emoji: '🪴', goldReward: 6, xpReward: 12, difficulty: 1, ageBuckets: ['5-8', '9-12'], recurrence: 'weekly' },
  { id: 'rake-leaves', title: 'Rake the leaves', description: 'Bonus points for an epic leaf pile.', categoryId: 'outdoors', emoji: '🍂', goldReward: 18, xpReward: 35, difficulty: 3, ageBuckets: ['9-12', '13+'], recurrence: 'once' },
  { id: 'wash-car', title: 'Help wash the car', description: 'Suds, rinse, shine.', categoryId: 'outdoors', emoji: '🚗', goldReward: 20, xpReward: 40, difficulty: 3, ageBuckets: ['9-12', '13+'], recurrence: 'once' },

  // Kindness
  { id: 'help-sibling', title: 'Help a sibling with something', description: 'Teamwork makes the dream work.', categoryId: 'kindness', emoji: '🤝', goldReward: 8, xpReward: 20, difficulty: 1, ageBuckets: ['5-8', '9-12', '13+'], recurrence: 'once' },
  { id: 'write-thanks', title: 'Write a thank-you note', description: 'To a friend, teacher, or family member.', categoryId: 'kindness', emoji: '💌', goldReward: 10, xpReward: 22, difficulty: 2, ageBuckets: ['9-12', '13+'], recurrence: 'once' },
];

export const questsByCategory = (categoryId: string): PresetQuest[] =>
  PRESET_QUESTS.filter((quest) => quest.categoryId === categoryId);
