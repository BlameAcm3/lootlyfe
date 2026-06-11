import { useQuery } from '@tanstack/react-query';

import { supabase } from '@/shared/lib/supabase';
import { useSession } from '@/features/auth';

import { isPremium, PREMIUM_ENTITLEMENT, type Entitlement } from '../entitlement';

export const useEntitlements = () => {
  const { user } = useSession();

  const query = useQuery({
    enabled: Boolean(user?.id),
    queryKey: ['subscriptions', 'entitlements', user?.id],
    queryFn: async (): Promise<Entitlement> => {
      if (!user?.id) return 'free';

      const { data } = await supabase
        .from('npc_profiles')
        .select('guilds!npc_profiles_guild_id_fkey(subscription_entitlement)')
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle();

      return data?.guilds?.subscription_entitlement === PREMIUM_ENTITLEMENT
        ? PREMIUM_ENTITLEMENT
        : 'free';
    },
  });

  const entitlement = query.data ?? 'free';
  return {
    isPremium: isPremium(entitlement),
    entitlement,
  };
};
