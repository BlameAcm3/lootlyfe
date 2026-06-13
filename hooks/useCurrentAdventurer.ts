import { useSession } from '@/features/auth';
import { useModeStore } from '@/stores/modeStore';
import { useBoundAdventurer, useOwnBinding, type AdventurerRow } from '../queries/pairingQueries';

/**
 * The adventurer this device is acting as: the bound adventurer on a paired
 * kid device (anonymous session), or the mode-toggle pick on a single-device
 * NPC session. Null while loading or outside adventurer mode.
 */
export const useCurrentAdventurer = (): {
  adventurerId: string | null;
  adventurer: AdventurerRow | null;
} => {
  const { user } = useSession();
  const isAnon = Boolean(user?.is_anonymous);
  const activeAdventurerId = useModeStore((state) => state.activeAdventurerId);
  const bindingQuery = useOwnBinding();
  const adventurerId = (isAnon ? bindingQuery.data?.adventurer_id : activeAdventurerId) ?? null;
  const adventurer = useBoundAdventurer(adventurerId).data ?? null;
  return { adventurerId, adventurer };
};
