import { useEffect } from 'react';
import type { Href } from 'expo-router';
import { Stack, useNavigationContainerRef, usePathname, useRouter, useSegments } from 'expo-router';

import { ErrorBoundary } from '@/shared/components';
import { ModeSwitcher, useSession } from '@/features/auth';
import { useOnboardingStatus } from '@/features/families';
import { useFamilyRealtime } from '@/shared/lib';
import { useModeStore } from '@/stores/modeStore';
import { useSessionStore } from '@/stores/sessionStore';

export default function ParentLayout() {
  const familyId = useSessionStore((state) => state.familyId);
  const mode = useModeStore((state) => state.mode);
  const router = useRouter();
  const navigationRef = useNavigationContainerRef();
  const pathname = usePathname();
  const segments = useSegments() as string[];
  const { user, isLoading: sessionLoading } = useSession();
  const { isLoading: onboardingLoading, completed, nextStep } = useOnboardingStatus();

  useFamilyRealtime(familyId);

  const inOnboarding =
    segments.some((s) => String(s).includes('onboarding')) || pathname.includes('onboarding');
  const inParentTabs = segments.includes('(tabs)');

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      if (!navigationRef.isReady()) {
        requestAnimationFrame(run);
        return;
      }

      if (mode === 'kid') {
        router.replace('/(kid)/(tabs)');
        return;
      }

      if (sessionLoading || onboardingLoading || !user) return;
      if (completed || inOnboarding) return;
      if (inParentTabs) {
        router.replace(nextStep as Href);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [
    completed,
    inOnboarding,
    inParentTabs,
    mode,
    navigationRef,
    nextStep,
    onboardingLoading,
    router,
    sessionLoading,
    user,
  ]);

  return (
    <ErrorBoundary>
      <>
        <Stack screenOptions={{ headerShown: false }} />
        <ModeSwitcher />
      </>
    </ErrorBoundary>
  );
}
