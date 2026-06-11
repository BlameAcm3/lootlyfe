import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { appStorage } from '../lib/storage';

type OnboardingStore = {
  /** Walkthrough shown once per install (skip counts as seen). */
  hasSeenWalkthrough: boolean;
  /**
   * When the parental-consent checkbox was accepted at sign-up (ISO). Logged
   * to consent_events (method 'signup_checkbox') by the create_guild RPC.
   */
  consentAcceptedAt: string | null;
  /** True once persisted state has rehydrated; gate redirects on this. */
  hydrated: boolean;
  markWalkthroughSeen: () => void;
  acceptConsent: () => void;
  setHydrated: () => void;
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      hasSeenWalkthrough: false,
      consentAcceptedAt: null,
      hydrated: false,
      markWalkthroughSeen: () => set({ hasSeenWalkthrough: true }),
      acceptConsent: () => set({ consentAcceptedAt: new Date().toISOString() }),
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'lootlyfe-onboarding',
      storage: createJSONStorage(() => appStorage),
      partialize: (state) => ({
        hasSeenWalkthrough: state.hasSeenWalkthrough,
        consentAcceptedAt: state.consentAcceptedAt,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
