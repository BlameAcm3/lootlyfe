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
   - `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` (RevenueCat public SDK keys; leave blank in Expo Go)
   - `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_TERMS_URL` (legal links shown in NPC settings)
4. Start development server:
   - `npm run start`

## Subscriptions (RevenueCat)

Premium (`premium` entitlement) is **per-guild**: RevenueCat is configured with
`appUserID = guild.id`, and the `revenuecat-webhook` Edge Function maps purchase
events onto `guilds.subscription_entitlement`. The client never writes
entitlement — it reads it (cached in MMKV for offline) through the
`useSubscription` hook, which is the single source of truth for entitlement,
free-tier limit checks, and downgrade lock computation. Free-tier limits are
also enforced server-side by BEFORE INSERT triggers (migration 017) — client
checks are UX, the triggers are law.

RevenueCat needs a custom dev build (not Expo Go); `lib/revenuecat.ts` no-ops
gracefully when the native module or keys are absent.

### Disabling the paywall for testing

Set `EXPO_PUBLIC_PAYWALL_ENABLED=false` to unlock every premium feature without a
purchase (useful on TestFlight before sandbox products exist). Any value other
than the literal `false` keeps gating ON. When disabled, `useSubscription`
reports premium unlocked and limit nudges never fire — but the server triggers
still apply, so this is for exercising premium UI, not for creating over-limit
rows against a `free` guild.

## Realtime & Push

Realtime works out of the box: each signed-in session opens one channel
(`guild:${guildId}`) and Postgres changes flow into the TanStack Query cache
(`hooks/useGuildRealtime.ts`). RLS scopes delivery per subscriber.

Push delivery is **server-triggered** (migration 016): AFTER triggers call the
`send-push` Edge Function via pg_net. To enable it in an environment:

1. Deploy the function: `npx supabase functions deploy send-push`
   (it is registered with `verify_jwt = false` in `config.toml`).
2. Tell the database where to send and how to authenticate (service-role key):

   ```sql
   update private.push_config set
     function_url = 'https://<project-ref>.supabase.co/functions/v1/send-push',
     service_key  = '<SUPABASE_SERVICE_ROLE_KEY>'
   where id = 1;
   ```

   Until this row is populated, `enqueue_push` is a no-op — triggers run, app
   writes succeed, but no push is sent. (Locally, point `function_url` at the
   edge runtime, e.g. `http://host.docker.internal:54321/functions/v1/send-push`.)
3. Set `EXPO_PUBLIC_EAS_PROJECT_ID` (or link the expo.dev project) so devices can
   mint Expo push tokens. The permission prompt fires at the first meaningful
   moment (NPC: after creating their first quest; kid: after first completion) —
   never on launch.
4. Optional: override `EXPO_PUSH_URL` (Edge Function env) to a mock for testing.

DB-side behavior (trigger payloads, preference/quiet-hours suppression, invite
gating, RLS scope) is verified by
`supabase/snippets/acceptance_realtime_push_invites.sql` (rollback-wrapped).

## Architecture

See `docs/architecture.md`.
