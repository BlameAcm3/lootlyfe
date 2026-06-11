import iconQuest from '../assets/images/themes/retro-gaming/icon-quest.png';
import iconLoot from '../assets/images/themes/retro-gaming/icon-loot.png';
import iconGold from '../assets/images/themes/retro-gaming/icon-gold.png';
import iconStreak from '../assets/images/themes/retro-gaming/icon-streak.png';
import avatarA from '../assets/images/themes/retro-gaming/avatar-a.png';
import avatarB from '../assets/images/themes/retro-gaming/avatar-b.png';
import soundQuestComplete from '../assets/sounds/themes/retro-gaming/quest-complete.wav';
import soundLevelUp from '../assets/sounds/themes/retro-gaming/level-up.wav';
import soundGoldPickup from '../assets/sounds/themes/retro-gaming/gold-pickup.wav';
import soundLootRedeem from '../assets/sounds/themes/retro-gaming/loot-redeem.wav';

import type { ThemePack } from '../types/theme';

export const retroGaming: ThemePack = {
  id: 'retro-gaming',
  name: 'Retro Arcade',
  premium: true,
  palette: {
    'bg-base': '#141432', // CRT dark
    surface: '#1d1d45',
    'surface-raised': '#27275a',
    border: '#33336e', // scanline seam
    'text-primary': '#f8f8f2',
    'text-muted': '#9d9dc7',
    'text-inverse': '#141432',
    'accent-loot': '#ffd83d', // coin yellow
    'accent-progress': '#4ade4a', // pixel green
    'accent-info': '#4ac8ff',
    danger: '#ff5555',
    'accent-achievement': '#ff7ac8',
  },
  typography: {
    headingFont: 'PressStart2P',
    accentFont: 'VT323',
  },
  lexicon: {
    guild: 'Party',
    npc: 'Game Master',
    adventurer: 'Player',
    quest: 'Level',
    quest_plural: 'Levels',
    complete_action: 'Clear Level',
    gold: 'Coins',
    xp: 'Score',
    level: 'Stage',
    loot: 'Power-Ups',
    loot_list: 'Wish List',
    streak: 'Combo',
    store: 'Item Shop',
    achievement_points: 'Stars',
    level_up_title: 'STAGE UP!',
    level_up_body: 'New high score energy. Keep that combo going!',
    pairing_title: 'Join the Party',
    greeting_morning: 'Ready, Player',
    greeting_afternoon: 'Game on, Player',
    greeting_evening: 'Night mode, Player',
    rank_title: 'Stage {level} Player',
    xp_to_next: '{xp} pts to Stage {level}',
    xp_earned: '+{xp} pts scored',
    quests_today_label: "Today's Levels",
    daily_progress_label: 'Level Progress',
    today_label: 'today',
    done_label: 'CLEAR!',
    all_done_title: 'STAGE CLEAR!',
    all_done_body: 'Every level beaten. New high score unlocked!',
    empty_quests_body: 'No levels loaded today. Insert coin tomorrow!',
    store_subtitle: 'Spend your hard-earned coins',
    empty_loot_title: 'Shop is sold out',
    empty_loot_body: 'Ask your Game Master to restock the item shop.',
    requested_label: 'Reserved',
    owned_label: 'Collected',
    stock_left: 'x{count} left',
    xp_unlocks_title: 'Score Unlocks',
    xp_unlocks_body: 'Avatar gear — rack up points, keep it forever',
    filter_all: 'All',
    filter_experiences: 'Bonus Rounds',
    filter_stuff: 'Items',
    filter_special: 'Rare',
    badge_collection_title: 'Trophy Collection',
    quests_done_label: 'Levels Beaten',
    badges_label: 'Trophies',
    preview_level_up: 'Preview the stage up ceremony',
  },
  assets: {
    icons: { quest: iconQuest, loot: iconLoot, gold: iconGold, streak: iconStreak },
    avatarBases: [avatarA, avatarB],
  },
  sounds: {
    quest_complete: soundQuestComplete,
    level_up: soundLevelUp,
    gold_pickup: soundGoldPickup,
    loot_redeem: soundLootRedeem,
  },
  variants: [
    {
      id: 'handheld',
      name: 'Pocket Classic',
      palette: {
        'bg-base': '#c4cfa1', // LCD green
        surface: '#d7e0b8',
        'surface-raised': '#e4ebc9',
        border: '#a9b787',
        'text-primary': '#1f3306',
        'text-muted': '#4a5e2a',
        'text-inverse': '#d7e0b8',
        'accent-loot': '#306230',
        'accent-progress': '#0f380f',
        'accent-info': '#306230',
        danger: '#5e3023',
        'accent-achievement': '#0f380f',
      },
      avatarBases: [0],
    },
    {
      id: 'arcade',
      name: 'Neon Arcade',
      palette: {
        'bg-base': '#0d0221',
        surface: '#1b0b3a',
        'accent-loot': '#f6f740',
        'accent-info': '#26f7fd',
        'accent-achievement': '#ff2ec4',
      },
      avatarBases: [1],
    },
  ],
};
