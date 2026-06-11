You are an expert React Native and Expo engineer helping me build Lootlyfe.

Write clean, simple, maintainable code. Prioritize clarity over unnecessary abstraction.

Think like a senior mobile developer.

---

## Project Overview

We are building Lootlyfe, a gamified chore tracking and reward app that syncs in real time between co-parents and child devices using RPG metaphors (guild = family, adventurer = child, NPC = parent, quests = chores, loot = rewards, gold = redeemable currency, XP = leveling, achievement points = cosmetic unlocks).

The app includes:

- NPC (parent) onboarding, guild creation, and adventurer (child) profile management
- Co-parent invite and shared guild management (multiple NPC accounts per guild)
- Quest library: preset and custom chores, recurring schedules, required vs optional, gold/XP rewards
- Quest log views (today, week, month, calendar) for both NPC and adventurer
- Adventurer experience: avatar customization, dashboard, streaks, XP/levels, achievement points, gold balance
- Loot system: NPC-created real-world rewards purchasable with gold; adventurer-curated Loot List wish list
- Cosmetic store: avatar items unlocked with achievement points (no real money for cosmetics in v1)
- Realtime sync: actions on one device propagate instantly to all guild devices
- Mode toggle: single-device families switch between NPC and Adventurer modes
- Subscription tier: free Apprentice Guild + paid Legendary Guild unlock

Keep the implementation simple and readable.

---

## Tech Stack

- Expo (SDK 54+) with React Native and Expo Router (file-based)
- TypeScript (strict)
- NativeWind v4 for styling
- Reanimated 3 and Moti for animations
- lottie-react-native for celebration animations
- Zustand for client-side UI state
- TanStack Query for all server state
- MMKV for persistence (Zustand persist storage and TanStack Query offline cache)
- Supabase for backend (Auth, Postgres, Realtime, Storage, Edge Functions)
- Expo Notifications for push (APNs + FCM via Expo's unified API)
- RevenueCat (react-native-purchases and react-native-purchases-ui) for subscriptions
- PostHog for analytics (NPC mode only — fully disabled in adventurer mode; see COPPA and Privacy)
- Sentry for error tracking

Do not introduce new major libraries unless there is a strong reason. Ask before installing anything new.

---

## Development Philosophy

Build feature by feature.

For every feature:

1. Read this file first.
2. Keep the implementation simple.
3. Avoid overengineering.
4. Prefer readable code over clever code.
5. Build the smallest useful version first.
6. Refactor only when repetition appears.

---

## Decision Making

If something is unclear or could be improved, suggest a better approach. If a new library would significantly help, recommend it, explain why, and ask before adding it.

Do not install new libraries without approval.

---

## Architecture

Use this folder structure:

```
app/
  (auth)/              # sign-in, sign-up, NPC onboarding, invite acceptance
  (parent)/            # NPC mode: dashboard, quest library, adventurer mgmt, loot mgmt, settings
  (adventurer)/        # Adventurer mode: dashboard, quest log, avatar, inventory, loot list
  pair/                # kid device pairing flow
  paywall/             # RevenueCat paywall screens
components/
  ui/                  # primitive design system: Button, Card, Badge, ProgressBar
  game/                # QuestCard, LootCard, AvatarRenderer, XPBar, LevelUpModal, StreakFlame, GoldCounter
  forms/               # QuestForm, LootForm, AdventurerForm, InviteForm
constants/
  images.ts            # centralized image imports
  theme.ts             # colors, spacing, typography tokens
  game.ts              # XP curves, streak multipliers, level thresholds, free-tier limits
data/                  # preset quests, preset loot, preset achievements (typed)
hooks/                 # useCurrentAdventurer, useGuildRealtime, useSubscription, useCurrentNpc, useLexicon
lib/
  supabase.ts          # Supabase client init
  revenuecat.ts        # RevenueCat init and entitlement helpers
  notifications.ts     # Expo Notifications setup
  analytics.ts         # PostHog wrapper (NPC mode only; disabled in adventurer mode)
  cn.ts                # NativeWind className helper
  game-math.ts         # XP/level/streak calculations (pure functions)
store/                 # Zustand stores: useUiStore, useDraftQuestStore, useModeStore
queries/               # TanStack Query keys and query/mutation hooks per domain
types/                 # shared TypeScript types: Quest, Loot, Adventurer, Guild, Npc, Completion
assets/
  images/
  fonts/
  sounds/              # quest complete, level up, gold pickup, loot redeem
```

**app/** is for routes and screens only. Screens compose components and call hooks or stores. They should not contain large reusable UI blocks or business logic.

**components/** is for reusable UI. Examples: QuestCard, LootCard, AvatarRenderer, XPBar, LevelUpModal, StreakFlame, GoldCounter. Do not create components too early.

**data/** holds hardcoded content (preset quests, preset loot, achievement definitions). Keep it typed.

**store/** holds Zustand stores. Examples: active mode (NPC vs Adventurer), draft quest form state, UI flags. Server data (quests, completions, adventurers, loot, gold, XP, subscription state) lives in TanStack Query, NEVER in Zustand. Persist Zustand stores with MMKV when needed.

**queries/** holds TanStack Query hooks. One file per domain (questsQueries.ts, lootQueries.ts, guildQueries.ts, subscriptionQueries.ts). Query keys are exported constants.

**lib/** holds external service helpers. Never expose secret keys here.

---

## Data Model (high level)

- `guilds`: id, name, crest, owner_npc_id, subscription_entitlement, created_at
- `npc_profiles`: id, user_id (FK to auth.users), guild_id, role (owner/admin), display_name, avatar
- `adventurer_profiles`: id, guild_id, nickname, age_bucket, avatar_config (jsonb), theme_id, variant_id, gold_balance, xp_total, level, achievement_points, current_streak_days, longest_streak_days
- `device_bindings`: id, user_id (FK to auth.users, anonymous), adventurer_id, guild_id, label, revoked_at
- `quests`: id, guild_id, title, description, category, xp_reward, gold_reward, is_required, requires_approval, recurrence (jsonb), assigned_adventurer_ids
- `quest_completions`: id, quest_id, adventurer_id, completed_at, approved_at, approved_by_npc_id, status (pending/approved/rejected), proof_url (nullable)
- `loot_items`: id, guild_id, name, description, gold_cost, stock, created_by_npc_id
- `loot_redemptions`: id, loot_id, adventurer_id, requested_at, approved_at, approved_by_npc_id, status, gold_spent
- `loot_wishlist`: id, adventurer_id, name, description, proposed_gold_cost, status (proposed/accepted/declined)
- `cosmetic_items`: id, name, slot, achievement_point_cost, premium_only, season
- `adventurer_cosmetics`: id, adventurer_id, cosmetic_id, equipped, unlocked_at
- `gold_xp_ledger`: id, adventurer_id, delta_gold, delta_xp, delta_achievement_points, source_type, source_id, created_at
- `consent_events`: id, guild_id, npc_id, type, method, created_at
- `notification_preferences`: id, npc_id, channel, scope_type, scope_id, enabled

All tables have RLS policies. Every read and write is guild-scoped.

---

## Data and Realtime

- Supabase Postgres is the source of truth.
- TanStack Query manages all reads, writes, and cache invalidation.
- Supabase Realtime subscriptions update TanStack Query cache directly (do not store realtime data in Zustand).
- RLS policies: NPC users can only access rows where they are members of the guild; adventurer devices (anonymous auth sessions) can only access rows for their bound adventurer profile and the shared guild resources they need, authorized through an unrevoked `device_bindings` row.
- Optimistic updates for quest completion and loot redemption (instant UI feedback, rollback on server error).

---

## UI Rules

For any UI task:

- Replicate the provided design exactly.
- Match layout, spacing, padding, font sizes, font hierarchy, colors, border radius, shadows, alignment, and proportions.
- Do not approximate. Do not simplify unless explicitly asked.
- The app uses an RPG aesthetic. Default to placeholder assets matching that style. Do not ship generic flat icons in screens that should feel like a game.

---

## Styling Rules

Use NativeWind classes. Do not use StyleSheet unless it is not possible to style with className.

Use the NativeWind version installed in this project. Check package.json. Do not upgrade without approval.

Reuse class patterns through utilities in global.css. Theme tokens (colors, spacing) live in constants/theme.ts and tailwind.config.js — never hardcode hex values in components.

### Style Exception List

Use StyleSheet or inline styles for:

- SafeAreaView (className not supported)
- KeyboardAvoidingView (behavior props)
- Modal (visible, transparent props)
- Animated.View / Reanimated Animated styles
- Dynamic styles calculated at runtime
- Platform specific styles
- Pressable or TouchableOpacity pressed states
- Shadows (different per platform)

Everywhere else, use NativeWind.

---

## Theme System

The app ships multiple theme packs: high-fantasy (free), sci-fi (premium), retro-gaming (premium). More packs will follow seasonally.

A ThemePack defines:

- id
- display name
- premium flag
- color palette (same token names across all packs)
- typography accents
- lexicon (user-facing terminology map)
- asset manifest (icons, avatar bases, sounds)
- 2-3 style variants (alternate palettes + avatar sets within the theme)

**Domain language vs. lexicon:** Internal domain language (DB tables, types, variables) remains guild/quest/loot/adventurer/NPC permanently. The lexicon layer translates ONLY user-facing strings. Example: lexicon key `quest` renders "Quest" (high-fantasy), "Mission" (sci-fi), "Level" (retro-gaming).

**HARD RULE: no hardcoded user-facing strings in screens or components.** All copy goes through the copy/lexicon system (`useLexicon` hook). This rule has the same weight as "never put server data in Zustand."

Each adventurer profile stores `theme_id` + `variant_id` (the kid's choice; theme availability is gated by the guild's entitlement). NPC mode uses its own fixed skin: a dark RPG-neutral palette (deep indigo with purple/cyan/gold accents, `npcNeutralPalette` in constants/theme.ts) consistent with the app's RPG aesthetic — adult in tone, never the kid's chosen theme pack.

There are no gender modes. Style variants within themes serve all kids.

---

## Image Rule

Use centralized image imports.

1. Check if constants/images.ts exists.
2. If not, create it.
3. Import all app images there.
4. Use them through the centralized object.

```tsx
import mascot from "@/assets/images/mascot.png";
export const images = {
  mascot,
};
```

```tsx
<Image source={images.mascot} />
```

Do not import image assets directly inside screens or components.

---

## State Management

- Zustand for global client state (UI, drafts, mode).
- TanStack Query for all server state.
- Never duplicate server data in Zustand.
- Local component state for transient UI.
- MMKV for Zustand persist and TanStack Query offline cache.

---

## TypeScript

- Strict mode.
- No `any`.
- Keep types simple and readable.
- Shared types in `types/`. Domain types match Supabase generated types where possible (use `supabase gen types typescript`).

---

## Game Math Rules

All XP curves, level thresholds, streak multipliers, and reward calculations live in `lib/game-math.ts` as pure functions. Constants live in `constants/game.ts`. Never inline these calculations in components or screens.

---

## Realtime and Notifications

- Subscribe to Supabase Realtime channels at the guild level (`guild:${guildId}`).
- Unsubscribe on unmount and on auth state change.
- Push notifications are server-triggered via Supabase Edge Functions, never client-triggered.
- Critical events that notify: quest completed, quest approved/rejected, loot redeemed, redemption approved/rejected, streak milestone, level up, co-parent invite accepted, wishlist item proposed.
- Each NPC has their own notification preferences (mute by adventurer, by event type, or quiet hours).

---

## Subscriptions (RevenueCat)

Entitlement: `premium`. (Renamed from `legendary_guild` — the entitlement key, the `guilds.subscription_entitlement` values, and the helper `isPremium` in `lib/revenuecat.ts`, formerly `isLegendaryGuild`, all use `premium`.)

**Free tier (Apprentice Guild):**

- 1 NPC account per guild (owner only)
- 2 adventurer profiles max
- 10 active custom quests
- 5 custom loot items
- 7-day quest history
- High-fantasy theme pack only
- Basic preset avatars only
- All core gameplay (gold, XP, levels, streaks, real-reward redemption)

The `FREE_TIER_LIMITS` values in this file are the single source of truth: `adventurers: 2`, `custom_quests: 10`, `custom_loot: 5`, `history_days: 7`, `npc_accounts: 1`. Any other document stating different limits is superseded by this file.

**Legendary Guild — $6.99/mo or $49.99/yr (7-day free trial):**

- Up to 4 NPC accounts per guild (co-parent invites)
- Unlimited adventurers
- Unlimited custom quests and loot
- All theme packs + seasonal theme drops
- Full cosmetic store + premium seasonal drops
- Advanced quest scheduling (time windows, photo proof, quest dependencies)
- Full quest history and parent analytics
- Custom guild themes, crests, mascot voice
- Priority push delivery
- All future expansions included

Subscription is per-guild, not per-user. When any NPC purchases, the guild's `subscription_entitlement` is set to `premium` via a Supabase Edge Function webhook listening to RevenueCat events. All NPCs on that guild see Premium features. Always cache entitlement status locally so premium features work offline.

Free-tier limits are enforced in `constants/game.ts` and checked client-side via a `useSubscription` hook, with server-side enforcement via RLS-aware Edge Functions for any state-changing premium operation.

---

## COPPA and Privacy

- NPCs (parents) are the only fully authenticated users. Children are profiles, not accounts.
- Adventurer devices authenticate via Supabase anonymous auth sessions. Pairing starts with a parent-generated 6-digit code, valid for 10 minutes. The pairing Edge Function validates the code and writes a `device_bindings` row (anon user_id, adventurer_id, guild_id, label, revoked_at). All adventurer-scope RLS policies authorize through an unrevoked binding.
- Once paired, the binding does not expire on its own. An NPC may revoke from the dashboard (sets `revoked_at`).
- Pairing is logged as a verifiable parental consent event in `consent_events`.
- Never collect PII from adventurers: no email, no real name, no birthdate, no location, no contacts. Nickname and age bucket (5-8, 9-12, 13+) only.
- Analytics (PostHog) runs in NPC mode only. In adventurer mode, analytics is fully disabled by default behind `ADVENTURER_ANALYTICS_ENABLED=false`. Rationale: Apple Kids Category prohibits third-party analytics transmitting device/identifiable data; we do not gamble app review on this.
- Sentry strips user context on adventurer sessions.
- All consent events (pairing, subscription, marketing opt-in, co-parent invite acceptance) are logged with timestamp and method.
- Provide data export and guild deletion in NPC settings.

---

## Feature Implementation

When building a feature:

1. Read this file first.
2. Identify the files to change.
3. Keep changes focused.
4. Do not rewrite unrelated code.
5. Follow existing patterns.
6. Make sure the feature works end to end.
7. Fix lint and type errors before finishing.

---

## Secrets

- Never expose secret keys in client code.
- Supabase publishable key (sb_publishable_*) is safe in the client because RLS protects data.
- Supabase secret key (sb_secret_*), RevenueCat secret keys, push credentials, and the RevenueCat webhook secret live in Edge Functions or EAS Secrets only.
- Use Supabase Edge Functions for any logic that requires elevated privileges.

---

## Authentication

Use Supabase Auth for NPC accounts (email/password, Sign in with Apple, Sign in with Google). Do not build custom auth. Adventurers are profiles under a guild, not full accounts — their devices authenticate via Supabase anonymous auth sessions bound to an adventurer profile through `device_bindings` (see COPPA and Privacy).

---

## Co-Parent Model

- A guild has one Owner NPC and may have additional Admin NPCs (up to 4 total NPCs on Legendary Guild).
- The Owner created the guild and owns billing. Owner role cannot be deleted from the guild without first transferring ownership.
- Admins have full management rights (create/edit quests, loot, adventurers; approve completions; approve redemptions) but cannot delete the guild or transfer ownership.
- Co-parent invites go out from any existing NPC via a unique invite link or 8-character code, valid for 7 days.
- Invitee creates their own NPC account (Supabase Auth), then accepts the invite, which attaches their user to the existing guild.
- Conflict resolution on edits: last-write-wins on the Postgres row. Realtime keeps everyone in sync, so conflicts are rare in practice.

---

## Copy & Tone

- Kid-facing copy is short, playful, and reading-level appropriate to the adventurer's age bucket.
- NPC-facing copy is clear and adult.
- Never use shame language for missed quests — streak loss copy stays encouraging.

---

## Communication

Be concise. Explain what changed and how to test it.

---

## Final Reminder

Before every feature:

- Read this file.
- Follow it strictly.
- Build clean, simple code.
- Replicate UI exactly when designs are provided.
- Never put server data in Zustand.
- Never hardcode user-facing strings — all copy goes through the lexicon system.
- Never collect PII from children.
- Enforce free-tier limits both client-side and server-side.