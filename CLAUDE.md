# Lootlyfe Architecture Overview

## Product Context

Lootlyfe is a family chore management platform with two primary experiences: parent mode and kid mode.
Parent accounts manage family setup, chores, rewards, and approvals, while kid mode focuses on task
completion and reward redemption.

## Architecture Pillars

- Feature-first structure under `src/features` for ownership and scalability.
- Thin route screens under `app/` that compose hooks and present feature components.
- Supabase-backed data with strict RLS and realtime updates scoped by family.
- TanStack Query for all server state and caching orchestration.
- Zustand stores for local client UI/session concerns.
- Type-safe contracts and strict TypeScript to reduce runtime regressions.

## Data Boundaries

- Data access lives in `src/features/*/api`.
- Reusable clients and platform wrappers live in `src/shared/lib`.
- Shared primitives and tokens live in `src/shared/components` and `src/shared/theme`.

## This Phase

Phase 1 scaffolds folder structure, configuration, linting, theming tokens, and placeholder modules.
It intentionally avoids screen UI implementation and business rules.
