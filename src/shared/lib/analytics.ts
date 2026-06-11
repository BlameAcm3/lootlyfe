import { PostHog } from 'posthog-react-native';

import { env } from '@/shared/lib/env';
import { supabase } from '@/shared/lib/supabase';
import { useModeStore } from '@/stores/modeStore';

export const posthog = new PostHog(env.posthogApiKey, {
  host: env.posthogHost,
});

// Paired kid devices use anonymous Supabase sessions and keep modeStore at
// its 'parent' default, so the mode check alone is not enough: anonymous
// sessions are always adventurer devices and must never transmit analytics.
let anonymousSession = false;
void supabase.auth.getSession().then(({ data }) => {
  anonymousSession = Boolean(data.session?.user?.is_anonymous);
});
supabase.auth.onAuthStateChange((_event, session) => {
  anonymousSession = Boolean(session?.user?.is_anonymous);
});

/**
 * Analytics runs in NPC (parent) mode only. In adventurer (kid) mode every
 * tracking call below is a no-op unless EXPO_PUBLIC_ADVENTURER_ANALYTICS_ENABLED
 * is true. Rationale: the Apple Kids Category prohibits third-party analytics
 * transmitting device/identifiable data — we do not gamble app review on it.
 *
 * If adventurer-mode analytics is ever enabled, a COPPA-safe identity strategy
 * (e.g. a daily-rotating hashed session id) must be designed and implemented
 * first. That design is intentionally NOT implemented now — it would be dead
 * code behind a flag that ships as false.
 */
const canTrack = () =>
  env.adventurerAnalyticsEnabled ||
  (useModeStore.getState().mode === 'parent' && !anonymousSession);

// Guild-domain approved events (see docs/analytics-events.md). NPC mode only.
export type EventName =
  | 'guild_created'
  | 'adventurer_added'
  | 'quest_created'
  | 'quest_completed'
  | 'quest_approved'
  | 'gold_awarded'
  | 'loot_created'
  | 'loot_redeemed'
  | 'redemption_approved'
  | 'device_paired'
  | 'paywall_viewed'
  | 'subscription_started'
  | 'ai_suggestion_shown'
  | 'ai_suggestion_accepted';

export type Properties = Record<string, string | number | boolean | null>;

export const track = (event: EventName, properties?: Properties) => {
  if (!canTrack()) return;
  posthog.capture(event, properties);
};

export const capture = (event: string, properties?: Properties) => {
  if (!canTrack()) return;
  posthog.capture(event, properties);
};

export const identify = (userId: string, traits?: Properties) => {
  if (!canTrack()) return;
  posthog.identify(userId, traits);
};

/** Always allowed — clearing analytics state is safe in any mode. */
export const reset = () => {
  posthog.reset();
};
