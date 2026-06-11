import { Stack } from 'expo-router';

import { ErrorBoundary } from '../../components/ui';

export default function AuthLayout() {
  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
