import { PostHog } from 'posthog-react-native';

import { env } from '@/shared/lib/env';

export const posthog = new PostHog(env.posthogApiKey, {
  host: env.posthogHost,
});
