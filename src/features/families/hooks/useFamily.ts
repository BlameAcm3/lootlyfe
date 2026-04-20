import { useQuery } from '@tanstack/react-query';

import { getCurrentFamily } from '@/features/families/api/families';
import { useSession } from '@/features/auth';

export const useFamily = () => {
  const { user } = useSession();

  return useQuery({
    enabled: Boolean(user?.id),
    queryKey: ['family', user?.id],
    queryFn: async () => getCurrentFamily(user?.id ?? ''),
  });
};
