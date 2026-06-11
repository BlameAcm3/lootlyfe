# Lootlyfe Architecture

The authoritative spec is `CLAUDE.md` at the repo root. This file is a short
orientation for the current codebase layout.

## Domain

Guild domain throughout (guild = family, NPC = parent, adventurer = child,
quest = chore, loot = reward). Internal names (DB tables, types, variables)
never change; user-facing terminology is translated per theme pack by the
lexicon system (`lib/lexicon.ts`, `useLexicon`).

## Layout (root folders per CLAUDE.md > Architecture)

- `app/` — expo-router routes only: `(auth)`, `(parent)`, `(adventurer)`,
  `pair/`, `paywall/`, `walkthrough`, `dev/theme-lab` (hidden visual
  regression surface).
- `components/` — `ui/` primitives (token-only colors) and `game/` pieces.
- `constants/` — theme tokens (NativeWind CSS variables), game constants
  (FREE_TIER_LIMITS, age buckets).
- `themes/` — theme packs (high-fantasy free; sci-fi & retro-gaming premium)
  + `ThemeProvider` (runtime palette switching via CSS variables).
- `queries/` — TanStack Query hooks per domain (guild, adventurers, pairing)
  with exported key constants.
- `lib/`, `hooks/`, `store/`, `types/`, `data/` — helpers, hook re-exports,
  Zustand stores, generated DB types, preset content.
- `src/features/auth`, `src/features/subscriptions`, `src/shared/lib`,
  `src/stores` — the surviving service layer (Supabase client, analytics,
  notifications, session/mode stores). New code should follow the root-folder
  layout; the `src/` remnants migrate opportunistically.

## Backend

Supabase. Migrations 006-011 define the guild schema, RLS, RPCs
(`create_guild`, `create_pairing_code`, `set_mode_pin`/`verify_mode_pin`,
`touch_device_binding`), the gold/XP ledger trigger, and drop the pre-guild
legacy schema. Edge Functions: `pair-device` (full), `revenuecat-webhook`
(entitlement mapping), `send-push` (skeleton).

- Local: `npx supabase start`, `npx supabase db reset`, `npm run typegen`.
- Hosted: `npx supabase db push`, `npx supabase functions deploy`.

## Identity model

- NPCs: full Supabase Auth users with `npc_profiles` rows.
- Adventurer devices: anonymous auth sessions bound via `device_bindings`
  (pair-device Edge Function); revocation via `revoked_at`.
- Single-device families: mode toggle in `useModeStore` (instant into
  adventurer mode; 4-digit bcrypt PIN to return).

## Status

Auth, onboarding walkthrough, guild creation, adventurer management
(free-tier limits + paywall stub), device pairing, and mode toggle are live
end to end. Quest library, loot shop, completions/approvals, and the ledger
UI are the next feature passes (tabs show placeholders).
