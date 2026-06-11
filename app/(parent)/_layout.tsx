import { ROUTES } from '../../lib/routes';
import { useEffect } from 'react';
import { Stack, useNavigationContainerRef, usePathname, useRouter, useSegments } from 'expo-router';

import { ErrorBoundary } from '../../components/ui';
import { ModeSwitcher, useSession } from '@/features/auth';
import { useModeStore } from '@/stores/modeStore';
import { useCurrentGuild } from '../../queries/guildQueries';

export default function ParentLayout() {
  const mode = useModeStore((state) => state.mode);
  const router = useRouter();
  const navigationRef = useNavigationContainerRef();
  const pathname = usePathname();
  const segments = useSegments() as string[];
  const { user, isLoading: sessionLoading } = useSession();
  const { guild, isLoading: guildLoading } = useCurrentGuild();

  const onCreateGuild =
    segments.some((segment) => segment.includes('create-guild')) || pathname.includes('create-guild');

  useEffect(() => {
    let cancelled = false;

    const run = () => {
      if (cancelled) return;
      if (!navigationRef.isReady()) {
        requestAnimationFrame(run);
        return;
      }

      if (mode === 'kid') {
        router.replace(ROUTES.adventurerHome);
        return;
      }

      if (sessionLoading || guildLoading || !user) return;

      // Signed in without a guild → guild creation is the only destination.
      if (!guild && !onCreateGuild) {
        router.replace('/(parent)/create-guild');
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [guild, guildLoading, mode, navigationRef, onCreateGuild, router, sessionLoading, user]);

  return (
    <ErrorBoundary>
      <>
        <Stack screenOptions={{ headerShown: false }} />
        <ModeSwitcher />
      </>
    </ErrorBoundary>
  );
}
