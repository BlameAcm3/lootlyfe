import { useQuery } from '@tanstack/react-query';

import { listChores } from '@/features/chores/api/chores';

export const useChores = (familyId: string | null | undefined) =>
  useQuery({
    enabled: Boolean(familyId),
    queryKey: ['chores', familyId],
    queryFn: async () => listChores(familyId ?? ''),
  });
