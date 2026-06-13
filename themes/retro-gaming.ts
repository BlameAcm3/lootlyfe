import iconQuest from '../assets/images/themes/retro-gaming/icon-quest.png';
import iconLoot from '../assets/images/themes/retro-gaming/icon-loot.png';
import iconGold from '../assets/images/themes/retro-gaming/icon-gold.png';
import iconStreak from '../assets/images/themes/retro-gaming/icon-streak.png';
import avatarA from '../assets/images/themes/retro-gaming/avatar-a.png';
import avatarB from '../assets/images/themes/retro-gaming/avatar-b.png';
import avatarC from '../assets/images/themes/retro-gaming/avatar-c.png';
import cosmeticHeadStarter from '../assets/images/themes/retro-gaming/cosmetic-head-starter.png';
import cosmeticHeadGuard from '../assets/images/themes/retro-gaming/cosmetic-head-guard.png';
import cosmeticHeadCrown from '../assets/images/themes/retro-gaming/cosmetic-head-crown.png';
import cosmeticHeadMythic from '../assets/images/themes/retro-gaming/cosmetic-head-mythic.png';
import cosmeticBodyStarter from '../assets/images/themes/retro-gaming/cosmetic-body-starter.png';
import cosmeticBodyScout from '../assets/images/themes/retro-gaming/cosmetic-body-scout.png';
import cosmeticBodyKnight from '../assets/images/themes/retro-gaming/cosmetic-body-knight.png';
import cosmeticBodyMythic from '../assets/images/themes/retro-gaming/cosmetic-body-mythic.png';
import cosmeticAccStarter from '../assets/images/themes/retro-gaming/cosmetic-acc-starter.png';
import cosmeticAccCharm from '../assets/images/themes/retro-gaming/cosmetic-acc-charm.png';
import cosmeticAccBanner from '../assets/images/themes/retro-gaming/cosmetic-acc-banner.png';
import cosmeticAccMythic from '../assets/images/themes/retro-gaming/cosmetic-acc-mythic.png';
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
    // Level categories + flavor — titles stay literal across themes.
    category_chores: 'Home World',
    category_hygiene: 'Clean-Up Stage',
    category_school: 'Brain Training',
    category_kindness: 'Kindness Combo',
    category_exercise: 'Fitness Bonus',
    preset_flavor_make_bed: 'Tidy bunk = +1 morning power-up.',
    preset_flavor_tidy_room: 'Clear the clutter level. Go for a 100% run.',
    preset_flavor_feed_pet: "Feed your companion. Don't skip the water refill.",
    preset_flavor_brush_teeth: 'Daily double: two minutes, morning and night.',
    preset_flavor_take_shower: 'Wash cycle complete. Shine restored.',
    preset_flavor_read_20: 'Grind 20 minutes of book XP. Comics count.',
    preset_flavor_pack_bag: 'Inventory check: homework, water, lunch.',
    preset_flavor_walk_dog: 'Escort mission: one lap around the block.',
    preset_flavor_play_outside: 'Outdoor bonus round: 30 minutes.',
    preset_flavor_stretch: 'Warm-up combo: 10 minutes of stretches.',
    quest_awaiting_approval: 'Score sent to the Game Master — points pending!',
    quest_rejected_kind: 'Continue screen: {reason}. Insert coin and retry!',
    quest_try_again_action: 'Retry',
    complete_error_body: 'Didn’t save — press the button again!',
    streak_bonus_label: '×{multiplier} combo bonus',
    level_up_spoils_label: 'Bonus unlocked',
    level_up_points_line: '+{points} Stars',
    level_up_continue_action: 'Continue ▶',
    // Profile, store, achievements.
    profile_title: 'Player Card',
    equipped_section_label: 'Equipped Items',
    avatar_base_label: 'Select your player',
    cosmetic_store_title: 'Skin Shop',
    cosmetic_store_subtitle: 'Trade Stars for legendary skins',
    slot_head: 'Hat',
    slot_body: 'Outfit',
    slot_accessory: 'Power-Up',
    cosmetic_cost_label: '{points} Stars',
    cosmetic_need_more: 'Score {points} more Stars to unlock this!',
    cosmetic_premium_locked_label: 'Deluxe Edition',
    cosmetic_premium_nudge:
      'This skin is Deluxe Edition only. Ask your Game Master about upgrading!',
    cosmetic_head_starter_name: 'Player Cap',
    cosmetic_head_guard_name: 'Pixel Helm',
    cosmetic_head_crown_name: 'High-Score Crown',
    cosmetic_head_mythic_name: '8-Bit Halo',
    cosmetic_body_starter_name: 'Starter Tee',
    cosmetic_body_scout_name: 'Speedrun Jacket',
    cosmetic_body_knight_name: 'Boss Armor',
    cosmetic_body_mythic_name: 'Glitch Cape',
    cosmetic_acc_starter_name: 'Coin Pin',
    cosmetic_acc_charm_name: '1-Up Charm',
    cosmetic_acc_banner_name: 'Party Flag',
    cosmetic_acc_mythic_name: 'Power Star',
    achievement_earned_title: 'ACHIEVEMENT GET!',
    achievements_title: 'Trophies',
    ach_quests_250_name: 'Legend of the Party',
  },
  assets: {
    icons: { quest: iconQuest, loot: iconLoot, gold: iconGold, streak: iconStreak },
    avatarBases: [avatarA, avatarB, avatarC],
    cosmetics: {
      'head-starter': cosmeticHeadStarter,
      'head-guard': cosmeticHeadGuard,
      'head-crown': cosmeticHeadCrown,
      'head-mythic': cosmeticHeadMythic,
      'body-starter': cosmeticBodyStarter,
      'body-scout': cosmeticBodyScout,
      'body-knight': cosmeticBodyKnight,
      'body-mythic': cosmeticBodyMythic,
      'acc-starter': cosmeticAccStarter,
      'acc-charm': cosmeticAccCharm,
      'acc-banner': cosmeticAccBanner,
      'acc-mythic': cosmeticAccMythic,
    },
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
      avatarBases: [0, 2],
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
      avatarBases: [1, 2],
    },
  ],
};
