import { useQuery } from '@tanstack/react-query';

import { listStreaksByKidIds } from '@/features/points/api/points';

export const useStreaks = (kidIds: string[]) =>
  useQuery({
    enabled: kidIds.length > 0,
    queryKey: ['streaks', ...kidIds],
    queryFn: async () => listStreaksByKidIds(kidIds),
  });
