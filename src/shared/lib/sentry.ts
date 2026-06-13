import * as Sentry from '@sentry/react-native';

import { env } from '@/shared/lib/env';
import { supabase } from '@/shared/lib/supabase';

/**
 * Sentry error tracking. NPC sessions attach the (non-PII) auth user id so a
 * crash can be traced to an account; adventurer devices use anonymous Supabase
 * sessions and must NEVER carry user context (COPPA / Apple Kids Category), so
 * we strip it on every anonymous session and as a `beforeSend` backstop.
 *
 * No-ops entirely when EXPO_PUBLIC_SENTRY_DSN is unset (Expo Go, local dev).
 */
const isConfigured = env.sentryDsn.length > 0;

let anonymousSession = false;

export const navigationIntegration = Sentry.reactNavigationIntegration({
  enableTimeToInitialDisplay: true,
});

export function initSentry(): void {
  if (!isConfigured) return;

  Sentry.init({
    dsn: env.sentryDsn,
    environment: env.sentryEnvironment,
    // Never collect PII; kid devices especially must stay clean.
    sendDefaultPii: false,
    integrations: [navigationIntegration],
    // Tune sampling on the dashboard / via a later release; conservative default.
    tracesSampleRate: env.sentryEnvironment === 'production' ? 0.2 : 1.0,
    // Backstop: if an anonymous (adventurer) session ever slips through, drop
    // any user context before the event leaves the device.
    beforeSend(event) {
      if (anonymousSession) {
        delete event.user;
      }
      return event;
    },
  });

  // Keep Sentry's user context in lockstep with the auth session.
  void supabase.auth.getSession().then(({ data }) => {
    applySessionUser(data.session?.user ?? null);
  });
  supabase.auth.onAuthStateChange((_event, session) => {
    applySessionUser(session?.user ?? null);
  });
}

function applySessionUser(user: { id: string; is_anonymous?: boolean } | null): void {
  anonymousSession = Boolean(user?.is_anonymous);
  if (!user || anonymousSession) {
    Sentry.setUser(null);
    return;
  }
  Sentry.setUser({ id: user.id });
}

/** Wraps the root component for native crash + performance instrumentation. */
export const wrapWithSentry: typeof Sentry.wrap = (component) =>
  isConfigured ? Sentry.wrap(component) : component;
