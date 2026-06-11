import type { ErrorInfo, PropsWithChildren } from 'react';
import { Component } from 'react';
import { Text, View } from 'react-native';

import { capture } from '@/shared/lib/analytics';
import { baseLexicon } from '../../themes';

type State = {
  hasError: boolean;
};

/**
 * Class component (componentDidCatch), so lexicon resolution uses the base
 * lexicon directly instead of the hook.
 */
export class ErrorBoundary extends Component<PropsWithChildren, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    capture('unhandled_error', {
      componentStack: info.componentStack ?? '',
      source: 'error_boundary',
      message: error.message,
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <View className="bg-bg-base flex-1 items-center justify-center gap-2 p-8">
          <Text className="text-5xl">🛠️</Text>
          <Text className="text-text-primary text-center text-lg font-extrabold">
            {baseLexicon.error_boundary_title}
          </Text>
          <Text className="text-text-muted text-center text-sm">
            {baseLexicon.error_boundary_body}
          </Text>
        </View>
      );
    }
    return this.props.children;
  }
}
