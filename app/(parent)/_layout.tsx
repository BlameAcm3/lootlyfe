import { useEffect } from 'react';
import { Stack, usePathname, useRouter } from 'expo-router';

import { ErrorBoundary } from '@/shared/components';
import { ModeSwitcher } from '@/features/auth';
import { useOnboardingStatus } from '@/features/families';
import { useFamilyRealtime } from '@/shared/lib';
import { useModeStore } from '@/stores/modeStore';
import { useSessionStore } from '@/stores/sessionStore';

export default function ParentLayout() {
  const familyId = useSessionStore((state) => state.familyId);
  const mode = useModeStore((state) => state.mode);
  const pathname = usePathname();
  const router = useRouter();
  const onboarding = useOnboardingStatus();

  useFamilyRealtime(familyId);

  useEffect(() => {
    if (mode === 'kid') {
      router.replace('/(kid)/(tabs)');
      return;
    }
    if (onboarding.isLoading) return;
    if (!onboarding.completed && !pathname.startsWith('/(parent)/onboarding')) {
      router.replace(onboarding.nextStep as '/(parent)/onboarding/create-family');
      return;
    }
    if (onboarding.completed && pathname.startsWith('/(parent)/onboarding')) {
      router.replace('/(parent)/(tabs)');
    }
  }, [mode, onboarding.completed, onboarding.isLoading, onboarding.nextStep, pathname, router]);

  return (
    <ErrorBoundary>
      <>
        <Stack screenOptions={{ headerShown: false }} />
        <ModeSwitcher />
      </>
    </ErrorBoundary>
  );
}
