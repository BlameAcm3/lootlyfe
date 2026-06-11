import iconQuest from '../assets/images/themes/sci-fi/icon-quest.png';
import iconLoot from '../assets/images/themes/sci-fi/icon-loot.png';
import iconGold from '../assets/images/themes/sci-fi/icon-gold.png';
import iconStreak from '../assets/images/themes/sci-fi/icon-streak.png';
import avatarA from '../assets/images/themes/sci-fi/avatar-a.png';
import avatarB from '../assets/images/themes/sci-fi/avatar-b.png';
import soundQuestComplete from '../assets/sounds/themes/sci-fi/quest-complete.wav';
import soundLevelUp from '../assets/sounds/themes/sci-fi/level-up.wav';
import soundGoldPickup from '../assets/sounds/themes/sci-fi/gold-pickup.wav';
import soundLootRedeem from '../assets/sounds/themes/sci-fi/loot-redeem.wav';

import type { ThemePack } from '../types/theme';

export const sciFi: ThemePack = {
  id: 'sci-fi',
  name: 'Starfarer',
  premium: true,
  palette: {
    'bg-base': '#0b1026', // deep space navy
    surface: '#141b39',
    'surface-raised': '#1d2750',
    border: '#28335f', // hull seam
    'text-primary': '#e6f1ff', // starlight
    'text-muted': '#8ba3c7',
    'text-inverse': '#0b1026',
    'accent-loot': '#59e3f0', // plasma cyan
    'accent-progress': '#45d17c',
    'accent-info': '#4f7cff',
    danger: '#ff4d5e',
    'accent-achievement': '#b173ff',
  },
  typography: {
    headingFont: 'Orbitron',
    accentFont: 'Exo2',
  },
  lexicon: {
    guild: 'Colony',
    npc: 'Commander',
    adventurer: 'Cadet',
    quest: 'Mission',
    quest_plural: 'Missions',
    complete_action: 'Complete Mission',
    gold: 'Credits',
    xp: 'Data',
    level: 'Rank',
    loot: 'Cargo',
    loot_list: 'Cargo Manifest',
    streak: 'Warp Chain',
    store: 'Supply Depot',
    achievement_points: 'Commendations',
    level_up_title: 'Rank Up!',
    level_up_body: 'Promotion confirmed. The Crew salutes you, Cadet!',
    pairing_title: 'Join your Colony',
    greeting_morning: 'Morning, Cadet',
    greeting_afternoon: 'Afternoon, Cadet',
    greeting_evening: 'Evening, Cadet',
    rank_title: 'Rank {level} Cadet',
    xp_to_next: '{xp} Data to Rank {level}',
    xp_earned: '+{xp} Data logged',
    quests_today_label: "Today's Missions",
    daily_progress_label: 'Mission Progress',
    today_label: 'today',
    done_label: 'Complete!',
    all_done_title: 'Sector Clear!',
    all_done_body: 'All missions accomplished. The Colony salutes you, Cadet.',
    empty_quests_body: 'No missions on the docket. Enjoy the quiet orbit.',
    store_subtitle: 'Spend your hard-earned credits',
    empty_loot_title: 'Cargo hold is empty',
    empty_loot_body: 'Ask your Commander to stock the supply depot.',
    requested_label: 'Requisitioned',
    owned_label: 'Acquired',
    stock_left: '{count} in stock',
    xp_unlocks_title: 'Data Unlocks',
    xp_unlocks_body: 'Avatar upgrades — log data, keep them forever',
    filter_all: 'All',
    filter_experiences: 'Expeditions',
    filter_stuff: 'Equipment',
    filter_special: 'Classified',
    badge_collection_title: 'Medal Collection',
    quests_done_label: 'Missions Done',
    badges_label: 'Medals',
    preview_level_up: 'Preview the rank up ceremony',
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
      id: 'nebula',
      name: 'Nebula',
      palette: {
        'bg-base': '#160b2e',
        surface: '#241544',
        'accent-loot': '#ff8de1',
        'accent-info': '#9a6bff',
      },
      avatarBases: [0],
    },
    {
      id: 'red-planet',
      name: 'Red Planet',
      palette: {
        'bg-base': '#21100c',
        surface: '#321b14',
        'accent-loot': '#ffb45e',
        'accent-progress': '#e0813f',
      },
      avatarBases: [1],
    },
  ],
};
