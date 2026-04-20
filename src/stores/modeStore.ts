import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { createJSONStorage, persist } from 'zustand/middleware';

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

const validateFamilyPin = async (pin?: string): Promise<boolean> => {
  void pin;
  if (__DEV__) return true;
  // TODO: Replace with Supabase Edge Function call in production.
  return true;
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
