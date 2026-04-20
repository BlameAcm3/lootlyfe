import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/shared/lib/supabase';
import { useSession } from '@/features/auth';

type FamilyTier = 'free' | 'pro';

export const useEntitlements = () => {
  const { user } = useSession();

  const query = useQuery({
    enabled: Boolean(user?.id),
    queryKey: ['subscriptions', 'entitlements', user?.id],
    queryFn: async (): Promise<FamilyTier> => {
      if (!user?.id) return 'free';

      const { data } = await supabase
        .from('families')
        .select('subscription_tier')
        .eq('owner_user_id', user.id)
        .maybeSingle();

      return data?.subscription_tier === 'pro' ? 'pro' : 'free';
    },
  });

  const activeFamilyTier = query.data ?? 'free';
  return {
    isPro: activeFamilyTier === 'pro',
    activeFamilyTier,
  };
};
