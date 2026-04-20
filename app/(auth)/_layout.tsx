import { Stack } from 'expo-router';

import { ErrorBoundary } from '@/shared/components';

export default function AuthLayout() {
  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
