import { useQuery } from '@tanstack/react-query';

import { listRewards } from '@/features/rewards/api/rewards';

export const useRewards = (familyId: string | null | undefined) =>
  useQuery({
    enabled: Boolean(familyId),
    queryKey: ['rewards', familyId],
    queryFn: async () => listRewards(familyId ?? ''),
  });
