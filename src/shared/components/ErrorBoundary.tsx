import type { ErrorInfo, PropsWithChildren } from 'react';
import { Component } from 'react';

import { posthog } from '@/shared/lib/posthog';
import { Screen } from '@/shared/components/Screen';
import { Stack } from '@/shared/components/Stack';
import { Text } from '@/shared/components/Text';

type State = {
  hasError: boolean;
};

export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    posthog.capture('unhandled_error', {
      componentStack: info.componentStack ?? '',
      source: 'error_boundary',
      message: error.message,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <Screen>
          <Stack gap="sm">
            <Text variant="h2">Something went wrong</Text>
            <Text color="muted">Please restart the app and try again.</Text>
          </Stack>
        </Screen>
      );
    }
    return this.props.children;
  }
}
