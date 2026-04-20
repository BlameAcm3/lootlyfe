import { useQuery } from '@tanstack/react-query';

import { listTodaysFamilyInstances } from '@/features/chore-instances/api/choreInstances';

export const useTodaysFamilyInstances = (familyId: string | null | undefined) =>
  useQuery({
    enabled: Boolean(familyId),
    queryKey: ['chore-instances', familyId, 'today'],
    queryFn: async () => listTodaysFamilyInstances(familyId ?? ''),
  });
