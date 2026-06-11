/**
 * Lexicon: the user-facing terminology map for theme packs.
 *
 * Internal domain language (DB tables, types, variables) remains
 * guild/quest/loot/adventurer/NPC permanently — the lexicon translates ONLY
 * user-facing strings. Example: key `quest` renders "Quest" (high-fantasy),
 * "Mission" (sci-fi), "Level" (retro-gaming).
 *
 * HARD RULE: no hardcoded user-facing strings in screens or components — all
 * copy resolves through these keys via the `useLexicon` hook (t(key)).
 *
 * Strings may contain `{placeholders}` filled by t(key, vars).
 * Resolution fallback chain: active variant → active pack → high-fantasy base.
 */

export const lexiconKeys = [
  // Core domain terms
  'guild',
  'npc',
  'adventurer',
  'quest',
  'quest_plural',
  'complete_action',
  'gold',
  'xp',
  'level',
  'loot',
  'loot_list',
  'streak',
  'store',
  'achievement_points',
  // Moments
  'level_up_title',
  'level_up_body',
  'pairing_title',
  'greeting_morning',
  'greeting_afternoon',
  'greeting_evening',
  // Dashboard / quest log
  'rank_title',
  'xp_to_next',
  'xp_earned',
  'quests_today_label',
  'daily_progress_label',
  'today_label',
  'done_label',
  'all_done_title',
  'all_done_body',
  'empty_quests_body',
  // Store / loot
  'store_subtitle',
  'empty_loot_title',
  'empty_loot_body',
  'requested_label',
  'owned_label',
  'stock_left',
  'xp_unlocks_title',
  'xp_unlocks_body',
  'filter_all',
  'filter_experiences',
  'filter_stuff',
  'filter_special',
  // Profile
  'badge_collection_title',
  'quests_done_label',
  'badges_label',
  'preview_level_up',
  // --- NPC-side keys below: defined in the base lexicon only (NPC mode uses
  // --- the neutral skin + base terms; packs fall back via the chain).
  // Auth
  'auth_signup_title',
  'auth_signup_subtitle',
  'auth_signin_title',
  'auth_signin_subtitle',
  'auth_email_label',
  'auth_password_label',
  'auth_confirm_password_label',
  'auth_create_account_action',
  'auth_sign_in_action',
  'auth_have_account',
  'auth_need_account',
  'auth_consent_label',
  'auth_consent_required',
  'auth_invalid_email',
  'auth_password_min',
  'auth_passwords_match',
  'auth_confirm_email_title',
  'auth_confirm_email_body',
  'auth_callback_verifying',
  'auth_callback_failed',
  // Walkthrough
  'walkthrough_skip',
  'walkthrough_next',
  'walkthrough_done',
  'walkthrough_step1_title',
  'walkthrough_step1_body',
  'walkthrough_step2_title',
  'walkthrough_step2_body',
  'walkthrough_step3_title',
  'walkthrough_step3_body',
  'walkthrough_notify_title',
  'walkthrough_notify_body',
  'walkthrough_notify_note',
  // Guild creation
  'guild_create_title',
  'guild_create_subtitle',
  'guild_name_label',
  'guild_name_placeholder',
  'guild_crest_label',
  'guild_create_action',
  // Adventurer management
  'adventurers_empty_title',
  'adventurers_empty_body',
  'adventurer_add_action',
  'adventurer_new_title',
  'adventurer_edit_title',
  'adventurer_nickname_label',
  'adventurer_nickname_required',
  'adventurer_age_label',
  'adventurer_theme_label',
  'adventurer_variant_label',
  'variant_default_label',
  'adventurer_save_action',
  'adventurer_archive_action',
  'adventurer_restore_action',
  'archived_section_label',
  'premium_lock_label',
  // Limits / paywall
  'limit_title',
  'limit_body',
  'upgrade_action',
  'not_now_action',
  'paywall_title',
  'paywall_subtitle',
  'paywall_benefit_npcs',
  'paywall_benefit_adventurers',
  'paywall_benefit_quests',
  'paywall_benefit_themes',
  'paywall_price_line',
  // Device pairing (NPC side)
  'pair_device_action',
  'pairing_code_hint',
  'pairing_code_expires_in',
  'pairing_code_expired',
  'regenerate_code_action',
  'devices_section_label',
  'no_devices_label',
  'device_default_label',
  'device_revoke_action',
  'device_revoked_label',
  'device_last_seen',
  // Device pairing (kid side)
  'pair_enter_code_hint',
  'pair_submit_action',
  'pair_error_wrong_code',
  'pair_error_expired',
  'pair_error_used',
  'pair_error_generic',
  'pair_revoked_title',
  'pair_revoked_body',
  'pair_again_action',
  'pair_welcome_link',
  // Mode toggle
  'mode_enter_adventurer_action',
  'mode_back_to_npc_action',
  'mode_choose_adventurer_title',
  'mode_no_adventurers_body',
  'mode_pin_title',
  'mode_pin_body',
  'mode_pin_set_title',
  'mode_pin_set_body',
  'mode_pin_label',
  'mode_pin_save_action',
  'mode_pin_error',
  // NPC dashboard / tabs
  'tab_home',
  'home_roster_label',
  'quests_coming_title',
  'quests_coming_body',
  'loot_coming_title',
  'loot_coming_body',
  'preset_library_label',
  'recurrence_daily',
  'recurrence_weekly',
  'recurrence_once',
  // Welcome / settings / errors
  'welcome_intro_label',
  'welcome_tagline',
  'welcome_cta',
  'settings_title',
  'settings_subtitle',
  'settings_session_label',
  'sign_out_action',
  'settings_reset_title',
  'settings_reset_body',
  'settings_reset_action',
  'settings_reset_confirm_body',
  'cancel_action',
  'error_boundary_title',
  'error_boundary_body',
  // Misc
  'error_generic',
] as const;

export type LexiconKey = (typeof lexiconKeys)[number];

/** A complete lexicon (the high-fantasy base must satisfy this). */
export type Lexicon = Record<LexiconKey, string>;

/** Packs and variants may override any subset; the chain fills the rest. */
export type PartialLexicon = Partial<Lexicon>;

export type LexiconVars = Record<string, string | number>;

const interpolate = (template: string, vars?: LexiconVars): string =>
  vars
    ? template.replace(/\{(\w+)\}/g, (match, name: string) =>
        name in vars ? String(vars[name]) : match,
      )
    : template;

/**
 * Builds a typed t() over the fallback chain: variant → pack → base.
 * The base lexicon is complete, so t() always returns a string.
 */
export const makeTranslator =
  (base: Lexicon, pack?: PartialLexicon, variant?: PartialLexicon) =>
  (key: LexiconKey, vars?: LexiconVars): string =>
    interpolate(variant?.[key] ?? pack?.[key] ?? base[key], vars);
