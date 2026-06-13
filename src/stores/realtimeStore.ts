import { create } from 'zustand';

/**
 * Connection state of the guild Realtime channel. Client/UI state only — the
 * actual realtime data flows straight into the TanStack Query cache, never
 * into Zustand (per CLAUDE.md: server data never lives in a store).
 *
 *   connecting — initial subscribe or a backoff retry in flight
 *   connected  — channel SUBSCRIBED, live updates arriving
 *   offline    — channel errored/closed; the OfflineIndicator shows
 */
export type RealtimeStatus = 'connecting' | 'connected' | 'offline';

type RealtimeStore = {
  status: RealtimeStatus;
  setStatus: (status: RealtimeStatus) => void;
};

export const useRealtimeStore = create<RealtimeStore>((set) => ({
  status: 'connecting',
  setStatus: (status) => set({ status }),
}));
