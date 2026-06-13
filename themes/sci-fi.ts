import iconQuest from '../assets/images/themes/sci-fi/icon-quest.png';
import iconLoot from '../assets/images/themes/sci-fi/icon-loot.png';
import iconGold from '../assets/images/themes/sci-fi/icon-gold.png';
import iconStreak from '../assets/images/themes/sci-fi/icon-streak.png';
import avatarA from '../assets/images/themes/sci-fi/avatar-a.png';
import avatarB from '../assets/images/themes/sci-fi/avatar-b.png';
import avatarC from '../assets/images/themes/sci-fi/avatar-c.png';
import cosmeticHeadStarter from '../assets/images/themes/sci-fi/cosmetic-head-starter.png';
import cosmeticHeadGuard from '../assets/images/themes/sci-fi/cosmetic-head-guard.png';
import cosmeticHeadCrown from '../assets/images/themes/sci-fi/cosmetic-head-crown.png';
import cosmeticHeadMythic from '../assets/images/themes/sci-fi/cosmetic-head-mythic.png';
import cosmeticBodyStarter from '../assets/images/themes/sci-fi/cosmetic-body-starter.png';
import cosmeticBodyScout from '../assets/images/themes/sci-fi/cosmetic-body-scout.png';
import cosmeticBodyKnight from '../assets/images/themes/sci-fi/cosmetic-body-knight.png';
import cosmeticBodyMythic from '../assets/images/themes/sci-fi/cosmetic-body-mythic.png';
import cosmeticAccStarter from '../assets/images/themes/sci-fi/cosmetic-acc-starter.png';
import cosmeticAccCharm from '../assets/images/themes/sci-fi/cosmetic-acc-charm.png';
import cosmeticAccBanner from '../assets/images/themes/sci-fi/cosmetic-acc-banner.png';
import cosmeticAccMythic from '../assets/images/themes/sci-fi/cosmetic-acc-mythic.png';
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
    // Mission categories + flavor — titles stay literal across themes.
    category_chores: 'Ship Chores',
    category_hygiene: 'Decon Protocol',
    category_school: 'Academy Studies',
    category_kindness: 'Crew Kindness',
    category_exercise: 'Physical Training',
    preset_flavor_make_bed: 'Bunk squared away to fleet standard.',
    preset_flavor_tidy_room: 'Stow all gear in the cargo lockers — deck clear.',
    preset_flavor_feed_pet: "Ration the ship's creature and top up its water.",
    preset_flavor_brush_teeth: 'Two-minute polish cycle, morning and night.',
    preset_flavor_take_shower: 'Full decon cycle — emerge sparkling.',
    preset_flavor_read_20: 'Download 20 minutes of knowledge. Comics count.',
    preset_flavor_pack_bag: 'Homework, water, lunch — pre-flight checklist complete.',
    preset_flavor_walk_dog: 'Patrol the perimeter with your four-legged crewmate.',
    preset_flavor_play_outside: 'EVA time: 30 minutes outside the airlock.',
    preset_flavor_stretch: 'Zero-g flexibility drills, 10 minutes.',
    quest_awaiting_approval: 'Transmitted to your Commander — rewards arrive on confirmation!',
    quest_rejected_kind: 'Mission debrief: {reason}. Recalibrate and relaunch, Cadet!',
    quest_try_again_action: 'Relaunch',
    complete_error_body: 'Transmission glitch — fire it off again!',
    streak_bonus_label: '×{multiplier} warp bonus',
    level_up_spoils_label: 'Mission rewards',
    level_up_points_line: '+{points} Commendations',
    level_up_continue_action: 'Back to the bridge!',
    // Profile, store, achievements.
    profile_title: 'Cadet Profile',
    equipped_section_label: 'Equipped Gear',
    avatar_base_label: 'Choose your cadet',
    cosmetic_store_title: 'Gear Fabricator',
    cosmetic_store_subtitle: 'Spend your Commendations on elite gear',
    slot_head: 'Helmet',
    slot_body: 'Suit',
    slot_accessory: 'Gadget',
    cosmetic_cost_label: '{points} Commendations',
    cosmetic_need_more: 'Earn {points} more Commendations to fabricate this!',
    cosmetic_premium_locked_label: 'Elite Colony',
    cosmetic_premium_nudge: 'This gear is for Elite Colonies. Ask your Commander about upgrading!',
    cosmetic_head_starter_name: 'Cadet Visor',
    cosmetic_head_guard_name: 'Pilot Helmet',
    cosmetic_head_crown_name: 'Command Crest',
    cosmetic_head_mythic_name: 'Singularity Halo',
    cosmetic_body_starter_name: 'Flight Suit',
    cosmetic_body_scout_name: 'Recon Rig',
    cosmetic_body_knight_name: 'Power Armor',
    cosmetic_body_mythic_name: 'Nebula Cloak',
    cosmetic_acc_starter_name: 'Comm Badge',
    cosmetic_acc_charm_name: 'Plasma Cell',
    cosmetic_acc_banner_name: 'Colony Pennant',
    cosmetic_acc_mythic_name: 'Pulsar Core',
    achievement_earned_title: 'Medal Earned!',
    achievements_title: 'Medals',
    ach_quests_250_name: 'Legend of the Colony',
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
      id: 'nebula',
      name: 'Nebula',
      palette: {
        'bg-base': '#160b2e',
        surface: '#241544',
        'accent-loot': '#ff8de1',
        'accent-info': '#9a6bff',
      },
      avatarBases: [0, 2],
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
      avatarBases: [1, 2],
    },
  ],
};
