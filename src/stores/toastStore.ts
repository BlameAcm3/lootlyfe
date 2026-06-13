import { create } from 'zustand';

/**
 * In-app toast queue. Used to surface a foreground push as a subtle in-app
 * banner instead of the OS notification when the relevant screen is already
 * open (see src/shared/lib/notifications.ts). Pure UI state.
 */
export type Toast = {
  id: string;
  title: string;
  body: string;
  /** Optional deep-link followed when the toast is tapped. */
  route?: string;
};

type ToastStore = {
  current: Toast | null;
  show: (toast: Omit<Toast, 'id'>) => void;
  dismiss: () => void;
};

export const useToastStore = create<ToastStore>((set) => ({
  current: null,
  show: (toast) => set({ current: { ...toast, id: `${Date.now()}-${Math.random()}` } }),
  dismiss: () => set({ current: null }),
}));
