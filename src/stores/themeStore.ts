import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as SecureStore from 'expo-secure-store';

export type ThemeMode = 'light' | 'dark' | 'system';

type ThemeStore = {
  colorScheme: ThemeMode;
  setColorScheme: (colorScheme: ThemeMode) => void;
};

const secureStorage = createJSONStorage<ThemeStore>(() => ({
  getItem: async (name) => SecureStore.getItemAsync(name),
  setItem: async (name, value) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    await SecureStore.deleteItemAsync(name);
  },
}));

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      /** Default dark matches Lootlyfe RPG UI; users can switch in settings. */
      colorScheme: 'dark',
      setColorScheme: (colorScheme) => set({ colorScheme }),
    }),
    {
      name: 'lootlyfe-theme-store',
      storage: secureStorage,
    },
  ),
);
