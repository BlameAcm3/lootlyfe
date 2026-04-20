import { useQuery } from '@tanstack/react-query';

import { listRedemptionRequests } from '@/features/rewards/api/rewards';

export const useRedemptions = (familyId: string | null | undefined) =>
  useQuery({
    enabled: Boolean(familyId),
    queryKey: ['redemptions', familyId],
    queryFn: async () => listRedemptionRequests(familyId ?? ''),
  });
