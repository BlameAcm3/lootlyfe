import { useQuery } from '@tanstack/react-query';

import { listKids } from '@/features/kids/api/kids';

export const useKids = (familyId: string | null | undefined) => {
  return useQuery({
    enabled: Boolean(familyId),
    queryKey: ['kids', familyId],
    queryFn: async () => listKids(familyId ?? ''),
  });
};
