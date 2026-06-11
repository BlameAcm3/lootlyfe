import * as SecureStore from 'expo-secure-store';
import type { StateStorage } from 'zustand/middleware';

/**
 * App key-value storage: MMKV (AGENTS.md stack) with a SecureStore fallback
 * for Expo Go, where MMKV's native module is unavailable. Development builds
 * and production always get MMKV.
 */
const createMmkvStorage = (): StateStorage | null => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { createMMKV } = require('react-native-mmkv') as typeof import('react-native-mmkv');
    const mmkv = createMMKV({ id: 'lootlyfe' });
    return {
      getItem: (name) => mmkv.getString(name) ?? null,
      setItem: (name, value) => {
        mmkv.set(name, value);
      },
      removeItem: (name) => {
        mmkv.remove(name);
      },
    };
  } catch {
    return null;
  }
};

const secureStoreFallback: StateStorage = {
  getItem: (name) => SecureStore.getItemAsync(name),
  setItem: async (name, value) => {
    await SecureStore.setItemAsync(name, value);
  },
  removeItem: async (name) => {
    await SecureStore.deleteItemAsync(name);
  },
};

export const appStorage: StateStorage = createMmkvStorage() ?? secureStoreFallback;
