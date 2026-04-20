import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';

type AuthSession = Session | null;

type SessionStore = {
  session: AuthSession;
  familyId: string | null;
  setSession: (session: AuthSession) => void;
  setFamilyId: (familyId: string | null) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  session: null,
  familyId: null,
  setSession: (session) => set({ session }),
  setFamilyId: (familyId) => set({ familyId }),
  clearSession: () => set({ session: null, familyId: null }),
}));
