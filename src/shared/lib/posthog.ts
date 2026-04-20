import { PostHog } from 'posthog-react-native';

import { env } from '@/shared/lib/env';

export const posthog = new PostHog(env.posthogApiKey, {
  host: env.posthogHost,
});

export type EventName =
  | 'family_created'
  | 'kid_added'
  | 'chore_created'
  | 'chore_completed'
  | 'chore_approved'
  | 'points_awarded'
  | 'reward_created'
  | 'reward_redeemed'
  | 'reward_approved'
  | 'paywall_viewed'
  | 'subscription_started'
  | 'ai_suggestion_shown'
  | 'ai_suggestion_accepted';

export type Properties = Record<string, string | number | boolean | null>;

export const track = (event: EventName, properties?: Properties) => {
  posthog.capture(event, properties);
};

export const identify = (userId: string, traits?: Properties) => {
  posthog.identify(userId, traits);
};

export const reset = () => {
  posthog.reset();
};
