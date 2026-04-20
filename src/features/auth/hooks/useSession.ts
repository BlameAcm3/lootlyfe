import { useSessionStore } from '@/stores/sessionStore';

export const useSession = () => {
  return useSessionStore((state) => state.session);
};
