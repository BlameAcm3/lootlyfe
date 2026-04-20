import { useQuery } from '@tanstack/react-query';

import { listTodaysKidInstances } from '@/features/chore-instances/api/choreInstances';

export const useTodaysKidInstances = (
  familyId: string | null | undefined,
  kidId: string | null | undefined,
) =>
  useQuery({
    enabled: Boolean(familyId && kidId),
    queryKey: ['chore-instances', familyId, kidId, 'today'],
    queryFn: async () => listTodaysKidInstances(familyId ?? '', kidId ?? ''),
  });
