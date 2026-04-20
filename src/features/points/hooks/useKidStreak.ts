import { useQuery } from '@tanstack/react-query';

import { getKidStreak } from '@/features/points/api/points';

export const useKidStreak = (kidId: string | null | undefined) =>
  useQuery({
    enabled: Boolean(kidId),
    queryKey: ['kid-streak', kidId],
    queryFn: async () => getKidStreak(kidId ?? ''),
  });
