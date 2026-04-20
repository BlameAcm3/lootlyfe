import { create } from 'zustand';

type AppMode = 'parent' | 'kid';

type ModeStore = {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
};

export const useModeStore = create<ModeStore>((set) => ({
  mode: 'parent',
  setMode: (mode) => set({ mode }),
}));
