import { queryClient } from '@/shared/lib/queryClient';
import { supabase } from '@/shared/lib/supabase';
import { reset as posthogReset } from '@/shared/lib/posthog';
import { useModeStore } from '@/stores/modeStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useThemeStore } from '@/stores/themeStore';

/**
 * Signs out, clears React Query cache, theme/mode preferences, and session store.
 * Use for “start fresh” without uninstalling the app.
 */
export const resetLocalStateAndSignOut = async () => {
  await supabase.auth.signOut();
  posthogReset();
  useSessionStore.getState().clearSession();

  await useThemeStore.persist.clearStorage();
  useThemeStore.setState({ colorScheme: 'system' });

  await useModeStore.persist.clearStorage();
  useModeStore.setState({ mode: 'parent', activeKidId: null });

  await queryClient.clear();
};
