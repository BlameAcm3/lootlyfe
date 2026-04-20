import { Stack } from 'expo-router';

import { ErrorBoundary } from '@/shared/components';
import { useFamilyRealtime } from '@/shared/lib';
import { useSessionStore } from '@/stores/sessionStore';

export default function ParentLayout() {
  const familyId = useSessionStore((state) => state.familyId);
  useFamilyRealtime(familyId);

  return (
    <ErrorBoundary>
      <Stack screenOptions={{ headerShown: false }} />
    </ErrorBoundary>
  );
}
