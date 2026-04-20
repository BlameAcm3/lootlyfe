import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';

import { ErrorBoundary } from '@/shared/components';
import { ModeSwitcher } from '@/features/auth';
import { useFamilyRealtime } from '@/shared/lib';
import { useModeStore } from '@/stores/modeStore';
import { useSessionStore } from '@/stores/sessionStore';

export default function KidLayout() {
  const familyId = useSessionStore((state) => state.familyId);
  const mode = useModeStore((state) => state.mode);
  const router = useRouter();
  useFamilyRealtime(familyId);

  useEffect(() => {
    if (mode !== 'kid') {
      router.replace('/(parent)/(tabs)');
    }
  }, [mode, router]);

  return (
    <ErrorBoundary>
      <>
        <Stack screenOptions={{ headerShown: false }} />
        <ModeSwitcher />
      </>
    </ErrorBoundary>
  );
}
