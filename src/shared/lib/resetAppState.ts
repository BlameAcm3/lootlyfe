import { queryClient } from '@/shared/lib/queryClient';
import { supabase } from '@/shared/lib/supabase';
import { reset as posthogReset } from '@/shared/lib/analytics';
import { useModeStore } from '@/stores/modeStore';
import { useSessionStore } from '@/stores/sessionStore';

/**
 * Signs out, clears React Query cache, mode preferences, and session store.
 * Use for "start fresh" without uninstalling the app.
 */
export const resetLocalStateAndSignOut = async () => {
  await supabase.auth.signOut();
  posthogReset();
  useSessionStore.getState().clearSession();

  await useModeStore.persist.clearStorage();
  useModeStore.setState({ mode: 'parent', activeAdventurerId: null });

  await queryClient.clear();
};
