import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { createJSONStorage, persist } from 'zustand/middleware';

import { supabase } from '@/shared/lib/supabase';

/**
 * 'parent' = NPC mode, 'kid' = adventurer mode (single-device toggle).
 * Paired kid devices (anonymous sessions) never use this store for routing —
 * their device_binding locks them to (adventurer).
 */
type AppMode = 'parent' | 'kid';

type ModeStore = {
  mode: AppMode;
  /** Adventurer the single-device toggle is impersonating (guild schema). */
  activeAdventurerId: string | null;
  /** NPC → adventurer is instant. */
  enterAdventurerMode: (adventurerId: string) => void;
  /** Adventurer → NPC requires the 4-digit PIN (verified server-side). */
  exitToNpcMode: (pin: string) => Promise<void>;
};

const secureStorage = createJSONStorage<
  Pick<ModeStore, 'mode' | 'activeAdventurerId'>
>(() => ({
  getItem: async (name) => SecureStore.getItemAsync(name),
  setItem: async (name, value) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    await SecureStore.deleteItemAsync(name);
  },
}));

export const useModeStore = create<ModeStore>()(
  persist(
    (set) => ({
      mode: 'parent',
      activeAdventurerId: null,
      enterAdventurerMode: (adventurerId) =>
        set({ mode: 'kid', activeAdventurerId: adventurerId }),
      exitToNpcMode: async (pin) => {
        const { data, error } = await supabase.rpc('verify_mode_pin', { p_pin: pin });
        if (error || !data) {
          throw new Error('pin_mismatch');
        }
        set({ mode: 'parent' });
      },
    }),
    {
      name: 'lootlyfe-mode-store',
      storage: secureStorage,
      partialize: (state) => ({
        mode: state.mode,
        activeAdventurerId: state.activeAdventurerId,
      }),
    },
  ),
);
