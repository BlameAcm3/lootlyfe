import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

type AuthSession = Session | null;

type SessionStore = {
  session: AuthSession;
  setSession: (session: AuthSession) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
}));
