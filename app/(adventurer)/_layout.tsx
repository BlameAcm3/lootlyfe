import { ROUTES } from '../../lib/routes';
import { useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { AppState } from 'react-native';

import { ErrorBoundary } from '../../components/ui';
import { ModeSwitcher, useSession } from '@/features/auth';
import { useModeStore } from '@/stores/modeStore';
import { ThemeScope } from '../../themes/ThemeProvider';
import {
  touchDeviceBinding,
  useBoundAdventurer,
  useOwnBinding,
} from '../../queries/pairingQueries';

/**
 * Adventurer mode shell. Two ways in:
 *   * paired kid device: anonymous session + unrevoked device_binding (locked
 *     to that adventurer — revocation kicks the device to /pair/revoked);
 *   * single-device toggle: NPC session with modeStore in 'kid' mode.
 * The subtree is themed to the adventurer's theme pack + variant.
 */
export default function AdventurerLayout() {
  const router = useRouter();
  const { user, isLoading: sessionLoading } = useSession();
  const isAnon = Boolean(user?.is_anonymous);
  const mode = useModeStore((state) => state.mode);
  const activeAdventurerId = useModeStore((state) => state.activeAdventurerId);

  const bindingQuery = useOwnBinding();
  const binding = bindingQuery.data ?? null;
  const bindingActive = Boolean(binding && !binding.revoked_at);

  const adventurerId = isAnon ? (bindingActive ? binding?.adventurer_id : null) : activeAdventurerId;
  const adventurerQuery = useBoundAdventurer(adventurerId);
  const adventurer = adventurerQuery.data ?? null;

  // Heartbeat: update last_seen_at on launch and every foreground; a false
  // result means the binding was revoked while we were running.
  useEffect(() => {
    if (!isAnon || !bindingActive) return;
    const beat = async () => {
      const alive = await touchDeviceBinding();
      if (!alive) router.replace('/pair/revoked');
    };
    void beat();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void beat();
    });
    return () => subscription.remove();
  }, [bindingActive, isAnon, router]);

  // Routing guards.
  useEffect(() => {
    if (sessionLoading) return;
    if (!user) {
      router.replace('/(auth)/welcome');
      return;
    }
    if (isAnon) {
      if (bindingQuery.isLoading) return;
      if (!binding) {
        router.replace(ROUTES.pair);
        return;
      }
      if (binding.revoked_at) {
        router.replace('/pair/revoked');
        return;
      }
      // Revoked mid-session: RLS hides the profile, so a resolved-but-null
      // adventurer is the failure signal.
      if (adventurerQuery.isFetched && !adventurer) {
        router.replace('/pair/revoked');
      }
      return;
    }
    // NPC session: only the mode toggle puts us here.
    if (mode !== 'kid' || !activeAdventurerId) {
      router.replace('/(parent)/(tabs)');
    }
  }, [
    activeAdventurerId,
    adventurer,
    adventurerQuery.isFetched,
    binding,
    bindingQuery.isLoading,
    isAnon,
    mode,
    router,
    sessionLoading,
    user,
  ]);

  if (!adventurer) return null;

  return (
    <ErrorBoundary>
      <ThemeScope
        themeId={adventurer.theme_id}
        variantId={adventurer.variant_id === 'default' ? null : adventurer.variant_id}
      >
        <Stack screenOptions={{ headerShown: false }} />
        {!isAnon ? <ModeSwitcher /> : null}
      </ThemeScope>
    </ErrorBoundary>
  );
}
