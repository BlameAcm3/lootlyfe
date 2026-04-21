import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { createJSONStorage, persist } from 'zustand/middleware';

import { supabase } from '@/shared/lib/supabase';
import { useSessionStore } from './sessionStore';

type AppMode = 'parent' | 'kid';

type ModeStore = {
  mode: AppMode;
  activeKidId: string | null;
  setMode: (mode: AppMode, familyPin?: string) => Promise<void>;
  setActiveKid: (kidId: string | null) => void;
};

const secureStorage = createJSONStorage<Pick<ModeStore, 'mode' | 'activeKidId'>>(() => ({
  getItem: async (name) => SecureStore.getItemAsync(name),
  setItem: async (name, value) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    await SecureStore.deleteItemAsync(name);
  },
}));

/**
 * Compares the entered PIN to the value stored on the family row (see createFamily).
 * The edge function is still a stub; this works without deploying it.
 */
const validateFamilyPin = async (pin?: string): Promise<boolean> => {
  const trimmed = pin?.trim() ?? '';
  if (trimmed.length < 4) return false;

  const familyId = useSessionStore.getState().familyId;
  if (!familyId) return false;

  const { data, error } = await supabase
    .from('families')
    .select('parent_pin_hash')
    .eq('id', familyId)
    .maybeSingle();

  if (error || data == null) return false;

  // Column stores the PIN as entered at family creation (hashing can be added server-side later).
  return data.parent_pin_hash === trimmed;
};

export const useModeStore = create<ModeStore>()(
  persist(
    (set, get) => ({
      mode: 'parent',
      activeKidId: null,
      setMode: async (mode, familyPin) => {
        const currentMode = get().mode;
        if (currentMode === 'kid' && mode === 'parent') {
          const validPin = await validateFamilyPin(familyPin);
          if (!validPin) {
            throw new Error('Family PIN is required to switch back to parent mode.');
          }
        }
        set({ mode });
      },
      setActiveKid: (activeKidId) => set({ activeKidId }),
    }),
    {
      name: 'lootlyfe-mode-store',
      storage: secureStorage,
      partialize: (state) => ({ mode: state.mode, activeKidId: state.activeKidId }),
    },
  ),
);
