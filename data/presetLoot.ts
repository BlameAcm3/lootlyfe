/**
 * Preset loot library — client-side typed content per CLAUDE.md. NPCs browse
 * these and instantiate them into loot_items in the loot pass.
 *
 * Pricing: anchored to the quest economy (a daily quest pays ~5-12 gold), so
 * small privileges cost a day or two of effort and big experiences cost a
 * week-plus — the "save up for it" loop that keeps kids engaged.
 */
export type LootKind = 'privilege' | 'experience' | 'treat' | 'item';

export type PresetLoot = {
  id: string;
  name: string;
  description?: string;
  emoji: string;
  goldCost: number;
  kind: LootKind;
  /** null = unlimited */
  stock: number | null;
};

export const PRESET_LOOT: PresetLoot[] = [
  // Privileges
  { id: 'screen-30', name: '30 minutes of screen time', description: 'Bonus screen time after responsibilities.', emoji: '📱', goldCost: 25, kind: 'privilege', stock: null },
  { id: 'stay-up-late', name: 'Stay up 30 minutes late', description: 'One later bedtime, school nights excluded.', emoji: '🌙', goldCost: 30, kind: 'privilege', stock: null },
  { id: 'skip-a-quest', name: 'Skip-a-quest pass', description: 'Skip one optional quest, guilt-free.', emoji: '🎫', goldCost: 50, kind: 'privilege', stock: 2 },
  { id: 'pick-music', name: 'Car DJ for a week', description: 'You control the playlist on every ride.', emoji: '🎧', goldCost: 35, kind: 'privilege', stock: null },

  // Experiences
  { id: 'movie-pick', name: 'Family movie night pick', description: 'Your choice, no vetoes.', emoji: '🎬', goldCost: 40, kind: 'experience', stock: null },
  { id: 'park-trip', name: 'Trip to the park', description: 'A proper outdoor expedition with a grown-up.', emoji: '🏞️', goldCost: 60, kind: 'experience', stock: null },
  { id: 'friend-sleepover', name: 'Friend sleepover', description: 'Invite a friend for the night.', emoji: '🏕️', goldCost: 120, kind: 'experience', stock: 1 },
  { id: 'game-night', name: 'Game night pick', description: 'Choose the board game and go first.', emoji: '🎲', goldCost: 30, kind: 'experience', stock: null },
  { id: 'bake-together', name: 'Bake something together', description: 'You pick the recipe, everyone helps.', emoji: '🧁', goldCost: 45, kind: 'experience', stock: null },

  // Treats
  { id: 'ice-cream', name: 'Ice cream outing', description: 'Two scoops. Sprinkles negotiable.', emoji: '🍦', goldCost: 50, kind: 'treat', stock: null },
  { id: 'dessert-pick', name: 'Pick dinner dessert', description: 'Tonight, dessert is your call.', emoji: '🍰', goldCost: 20, kind: 'treat', stock: null },

  // Items
  { id: 'small-toy', name: 'Small toy or book', description: 'Up to the guild treasury limit.', emoji: '🧩', goldCost: 150, kind: 'item', stock: 1 },
];
