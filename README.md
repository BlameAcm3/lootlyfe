# Lootlyfe

Lootlyfe is a production-grade family chore management app where parents create chores and rewards,
kids complete tasks for points, and families stay synced in real time across devices.

## Tech Stack

- Expo + React Native + expo-router
- Supabase (Postgres, Auth, RLS, Realtime, Edge Functions)
- TanStack Query + Zustand
- react-hook-form + zod
- PostHog
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
4. Start development server:
   - `npm run start`

## Architecture

See `docs/architecture.md`.
