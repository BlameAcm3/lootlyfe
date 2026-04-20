# Lootlyfe Architecture

## Folder Structure Rationale

Lootlyfe uses a feature-based structure under `src/features` so each domain can evolve independently.
Each feature owns API access, hooks, components, and types. This keeps changes localized, improves
code discoverability, and supports parallel team ownership as the app grows.

The `app/` directory exists only for route entry points and navigation structure via `expo-router`.
Route files should stay thin and delegate logic to feature hooks and shared modules.

## Data Flow

Primary data path:

1. Supabase query/mutation in `src/features/{feature}/api`.
2. TanStack Query wraps that function in a feature hook (query key + cache policy).
3. Route/component consumes the hook result and renders UI.

This pattern centralizes server state handling, keeps components declarative, and avoids ad hoc data
fetching in route files.

## Auth Flow (v1)

1. Parent signs up and authenticates with Supabase Auth.
2. Parent creates a family and configures kids.
3. Kids do not sign in separately in v1.
4. App switches between parent mode and kid mode at the device level via local state.

Server authorization remains enforced through RLS policies and family-scoped row ownership.

## Multi-Device Sync

Lootlyfe uses Supabase Realtime subscriptions scoped to family-owned tables (chores, points, rewards,
redemptions, approvals). Clients subscribe with family filters so updates propagate to all active
parent devices quickly while minimizing unrelated events.

TanStack Query integrates with realtime events by invalidating or patching relevant query keys.

## Theming System

Theme primitives live in `src/shared/theme` as design tokens:

- `colors.ts`
- `spacing.ts`
- `typography.ts`

A `useTheme` hook in `src/shared/hooks` exposes active tokens and keeps route/components from
hard-coding styles. This makes dark mode and future brand updates predictable.

## Why Feature Folders Beat Layer Folders Here

Layer-based structures (`components/`, `services/`, `hooks/`) become hard to navigate in apps with
many tightly related domains. Feature folders keep auth, chores, rewards, and points concerns
self-contained, lower cross-feature coupling, and reduce regressions during rapid product iteration.

## Database Types Regeneration

After changing SQL migrations in `supabase/migrations`, regenerate the TypeScript database types so
feature APIs stay aligned with schema and function signatures.

1. Run migrations against your Supabase project.
2. Run `npm run db:types`.
3. Commit the updated `src/shared/types/database.ts` with the migration changes.
