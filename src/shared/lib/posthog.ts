import { PostHog } from 'posthog-react-native';
import { create } from 'zustand';

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

type DebugEvent = {
  name: string;
  properties?: Properties;
  timestamp: number;
};

type AnalyticsDebugStore = {
  enabled: boolean;
  events: DebugEvent[];
  toggleEnabled: () => void;
  pushEvent: (event: DebugEvent) => void;
};

export const useAnalyticsDebugStore = create<AnalyticsDebugStore>((set) => ({
  enabled: false,
  events: [],
  toggleEnabled: () => set((state) => ({ enabled: !state.enabled })),
  pushEvent: (event) =>
    set((state) => ({
      events: [event, ...state.events].slice(0, 10),
    })),
}));

export const track = (event: EventName, properties?: Properties) => {
  posthog.capture(event, properties);
  if (__DEV__) {
    useAnalyticsDebugStore.getState().pushEvent({ name: event, properties, timestamp: Date.now() });
  }
};

export const capture = (event: string, properties?: Properties) => {
  posthog.capture(event, properties);
  if (__DEV__) {
    useAnalyticsDebugStore.getState().pushEvent({ name: event, properties, timestamp: Date.now() });
  }
};

export const identify = (userId: string, traits?: Properties) => {
  posthog.identify(userId, traits);
};

export const reset = () => {
  posthog.reset();
};
