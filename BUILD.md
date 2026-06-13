# BUILD.md — Lootlyfe release & deploy runbook

Everything needed to take Lootlyfe from this repo to TestFlight / the App Store
and Google Play, plus the backend config the build depends on.

> **Replace every `PLACEHOLDER` before a real submit.** Grep for it:
> `grep -rn PLACEHOLDER app.config.ts eas.json` — bundle id (`com.PLACEHOLDER.lootlyfe`),
> Sentry org, and the App Store Connect IDs in `eas.json` are intentionally fake.

---

## 0. Prerequisites

| Tool | Install |
| --- | --- |
| EAS CLI | `npm i -g eas-cli` (or `npx eas-cli`) |
| Expo account | `eas login` |
| Apple Developer account | Paid program, with an App Store Connect app record |
| Google Play account | Play Console + a service-account JSON for submits |
| Supabase CLI | already a dev dep (`npx supabase`) |

One-time per machine:

```bash
eas login
eas whoami            # confirm the right account
```

The EAS project id is pinned in `app.config.ts` (`EAS_PROJECT_ID`). Override
with `EXPO_PUBLIC_EAS_PROJECT_ID` if you point at a different project.

---

## 1. Environment variables & EAS secrets

Runtime config is read from `EXPO_PUBLIC_*` vars (see `.env.example` and
`src/shared/lib/env.ts`). For builds, set them as **EAS environment variables**
(dashboard → project → Environment variables) or inline in `eas.json` `env`.
The publishable/anon values are RLS-safe in the client; the Sentry auth token is
the only true secret.

| Name | Scope | Secret? | Notes |
| --- | --- | --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | runtime | no | Production project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | runtime | no | `sb_publishable_…` (RLS-protected) |
| `EXPO_PUBLIC_POSTHOG_API_KEY` | runtime | no | NPC-mode analytics only |
| `EXPO_PUBLIC_POSTHOG_HOST` | runtime | no | e.g. `https://us.i.posthog.com` |
| `EXPO_PUBLIC_REVENUECAT_IOS_KEY` | runtime | no | RevenueCat **public** SDK key (Apple) |
| `EXPO_PUBLIC_REVENUECAT_ANDROID_KEY` | runtime | no | RevenueCat **public** SDK key (Google) |
| `EXPO_PUBLIC_SENTRY_DSN` | runtime | no | Public DSN; empty disables Sentry |
| `EXPO_PUBLIC_ADVENTURER_ANALYTICS_ENABLED` | runtime | no | Keep `false` (Kids Category) |
| `EXPO_PUBLIC_PAYWALL_ENABLED` | runtime | no | `true` in prod; `false` only for QA |
| `EXPO_PUBLIC_PRIVACY_URL` / `EXPO_PUBLIC_TERMS_URL` | runtime | no | Live legal URLs before submit |
| `SENTRY_ORG` / `SENTRY_PROJECT` | build | no | In `eas.json` production `env` |
| `SENTRY_AUTH_TOKEN` | build | **yes** | EAS secret — uploads source maps |
| `APS_ENVIRONMENT` | build | no | Set per profile in `eas.json` |

Create the one real secret:

```bash
eas secret:create --scope project --name SENTRY_AUTH_TOKEN --value "<token>" --type string
eas secret:list
```

(The Sentry token needs `project:releases` + `org:read` scopes. Generate at
Sentry → Settings → Auth Tokens.)

---

## 2. Build

Profiles are defined in `eas.json` (`development`, `preview`, `production`).

```bash
# Local dev client (simulator/device, hot reload, dev menu)
eas build --profile development --platform ios
eas build --profile development --platform android

# Internal QA / TestFlight-style distribution (production APNs, not store-signed for stores)
eas build --profile preview --platform ios
eas build --profile preview --platform android

# Store builds (auto-increments build number; uploads Sentry source maps)
eas build --profile production --platform ios
eas build --profile production --platform android
eas build --profile production --platform all
```

`appVersionSource` is `remote`: EAS owns `buildNumber`/`versionCode` and
auto-increments on `preview`/`production`. Bump the marketing version in
`app.config.ts` (`version`) for each release train.

---

## 3. Submit

```bash
# iOS → App Store Connect / TestFlight
eas submit --profile production --platform ios --latest

# Android → Play Console (internal track per eas.json)
eas submit --profile production --platform android --latest
```

Fill in the `submit` block of `eas.json` first:
- iOS: `appleId`, `ascAppId` (App Store Connect app ID), `appleTeamId`.
- Android: place the Play service-account JSON at `./google-service-account.json`
  (git-ignored) or set `serviceAccountKeyPath`.

You can also build + submit in one step with `eas build … --auto-submit`.

---

## 4. Sentry source maps

Wiring (already in repo):
- `@sentry/react-native` installed; root wrapped via `wrapWithSentry` in
  `app/_layout.tsx`; init in `src/shared/lib/sentry.ts` (no-op without a DSN;
  **strips user context on adventurer/anonymous sessions** — COPPA).
- `@sentry/react-native/expo` config plugin in `app.config.ts` reads
  `SENTRY_ORG` / `SENTRY_PROJECT`.

On an EAS **production** build, the plugin uploads source maps automatically when
`SENTRY_AUTH_TOKEN` is present in the build environment (the EAS secret from §1).
Verify post-build under Sentry → Project → Releases → Artifacts. No manual
`sentry-cli` step is required.

---

## 5. RevenueCat product setup checklist (App Store Connect + RevenueCat)

Subscription is **per-guild**; entitlement id is **`premium`**
(`src/features/subscriptions/entitlement.ts`). The client never writes
entitlement — the `revenuecat-webhook` Edge Function does, on RevenueCat events.

**App Store Connect → Subscriptions:**
- [ ] Subscription group (e.g. "Legendary Guild").
- [ ] Monthly product — **$6.99/mo**, with a **7-day free trial** (intro offer).
- [ ] Annual product — **$49.99/yr**, with a **7-day free trial**.
- [ ] Localizations, review screenshot, and "Cleared for Sale".
- [ ] Paid Apps agreement active; banking/tax complete.

**Google Play → Monetize → Subscriptions** (for Android): mirror the two base
plans + 7-day free trial offers.

**RevenueCat dashboard:**
- [ ] Project apps created; paste the **public SDK keys** into
      `EXPO_PUBLIC_REVENUECAT_IOS_KEY` / `_ANDROID_KEY`.
- [ ] App Store Connect **shared secret** + Play service-account credentials added.
- [ ] **Entitlement `premium`** created; attach both products to it.
- [ ] **Offering** marked *current*, with a **monthly** and an **annual** package
      (the paywall reads `offerings.current.monthly` / `.annual`).
- [ ] **Webhook** → URL of the deployed function:
      `https://<project-ref>.supabase.co/functions/v1/revenuecat-webhook`
- [ ] Set a webhook **Authorization** value; store it as the
      `REVENUECAT_WEBHOOK_SECRET` Supabase function secret (§6). The function
      rejects mismatches.
- [ ] Sandbox-test a purchase → confirm `guilds.subscription_entitlement`
      flips to `premium`.

---

## 6. Supabase production config checklist

**Project (linked: `dlwjmrvljtxocpphyceu`):**
- [ ] `npx supabase db push` — apply all migrations to production
      (verified to apply clean from scratch).
- [ ] **Auth → enable Anonymous sign-ins** (kid devices use anon sessions —
      `config.toml` already has `enable_anonymous_sign_ins = true` locally).
- [ ] Auth providers: Email/password, **Sign in with Apple**, **Sign in with
      Google** configured with real client ids/secrets + redirect URLs.
- [ ] `site_url` + additional redirect URLs set to the production scheme
      (`lootlyfe://`) and any web callback.

**Edge Functions** — deploy and set secrets:
```bash
npx supabase functions deploy revenuecat-webhook send-push pair-device \
  export-guild-data validate-family-pin ai-suggest-chores ai-weekly-summary

npx supabase secrets set REVENUECAT_WEBHOOK_SECRET="<same value as RevenueCat webhook>"
# SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY / SUPABASE_ANON_KEY are injected by the platform.
```
- [ ] `REVENUECAT_WEBHOOK_SECRET` set (matches the RevenueCat webhook auth header).
- [ ] (Optional) `EXPO_PUSH_URL` override — defaults to Expo's push endpoint.

**Push delivery** — `private.push_config` must be populated or push is a silent
no-op (by design, so writes never fail). Run once per environment via the SQL editor:
```sql
update private.push_config
set function_url = 'https://<project-ref>.supabase.co/functions/v1/send-push',
    service_key  = '<service-role-key>'
where id = 1;
```
- [ ] `private.push_config` populated (URL + service-role key).
- [ ] Verify a real completion/redemption delivers a push to a paired device.

**Data & compliance:**
- [ ] Confirm `delete_guild()` + guild data export work in NPC settings.
- [ ] Confirm RLS is on for all guild/adventurer tables (it is, via migrations).

---

## 7. Pre-submit checklist

- [ ] Replace all `PLACEHOLDER`s (`grep -rn PLACEHOLDER app.config.ts eas.json`).
- [ ] Final brand icon/splash in place (`assets/icon.png`, `adaptive-icon.png`,
      `splash-icon.png`; regenerate placeholders with
      `node scripts/make-brand-assets.js`).
- [ ] `npm run typecheck && npm run lint && npm test` all green.
- [ ] `version` bumped in `app.config.ts`.
- [ ] Privacy/Terms URLs live; App Privacy questionnaire completed (Kids Category:
      no third-party analytics in adventurer mode).
- [ ] TestFlight smoke test of the golden path (signup → … → paywall).
