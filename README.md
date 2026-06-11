# Lootlyfe

Lootlyfe is a gamified chore tracking and reward app: the family is a guild, parents are NPCs,
kids are adventurers, chores are quests, and rewards are loot — synced in real time across
co-parent and kid devices.

## Tech Stack

- Expo + React Native + expo-router
- NativeWind v4 (CSS-variable theme tokens; see `constants/theme.ts` and `themes/`)
- Supabase (Postgres, Auth, RLS, Realtime, Edge Functions)
- TanStack Query + Zustand
- react-hook-form + zod
- lottie-react-native (celebration animations)
- PostHog (parent/NPC mode only)
- expo-secure-store + expo-notifications

## Setup

1. Install dependencies:
   - `npm install`
2. Copy environment template:
   - `cp .env.example .env`
3. Fill values in `.env`:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_ANON_KEY`
   - `EXPO_PUBLIC_POSTHOG_API_KEY`
   - `EXPO_PUBLIC_POSTHOG_HOST`
   - `EXPO_PUBLIC_ADVENTURER_ANALYTICS_ENABLED` (leave `false`; kid-mode analytics is disabled for Apple Kids Category compliance)
4. Start development server:
   - `npm run start`

## Architecture

See `docs/architecture.md`.
