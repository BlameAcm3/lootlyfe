import { useEffect } from 'react';
import { Stack, useNavigationContainerRef, useRouter } from 'expo-router';

import { ErrorBoundary } from '@/shared/components';
import { ModeSwitcher } from '@/features/auth';
import { useFamilyRealtime } from '@/shared/lib';
import { useModeStore } from '@/stores/modeStore';
import { useSessionStore } from '@/stores/sessionStore';

export default function KidLayout() {
  const familyId = useSessionStore((state) => state.familyId);
  const mode = useModeStore((state) => state.mode);
  const router = useRouter();
  const navigationRef = useNavigationContainerRef();
  useFamilyRealtime(familyId);

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      if (!navigationRef.isReady()) {
        requestAnimationFrame(run);
        return;
      }
      if (mode !== 'kid') {
        router.replace('/(parent)/(tabs)');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [mode, navigationRef, router]);

  return (
    <ErrorBoundary>
      <>
        <Stack screenOptions={{ headerShown: false }} />
        <ModeSwitcher />
      </>
    </ErrorBoundary>
  );
}
