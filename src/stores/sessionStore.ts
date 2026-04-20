import { create } from 'zustand';

type Session = {
  userId: string;
  email: string | null;
} | null;

type SessionStore = {
  session: Session;
  setSession: (session: Session) => void;
  clearSession: () => void;
};

export const useSessionStore = create<SessionStore>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
}));
