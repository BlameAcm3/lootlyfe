import { useMemo } from 'react';

import { useFamily } from '@/features/families';
import { useKids } from '@/features/kids';
import { useChores } from '@/features/chores';
import { MINIMAL_ONBOARDING } from '@/shared/lib/featureFlags';

export const useOnboardingStatus = () => {
  const familyQuery = useFamily();
  const kidsQuery = useKids(familyQuery.data?.id);
  const choresQuery = useChores(familyQuery.data?.id);

  const nextStep = useMemo(() => {
    if (!familyQuery.data) return '/(parent)/onboarding/create-family';
    if (MINIMAL_ONBOARDING) return '/(parent)/(tabs)';
    if ((kidsQuery.data?.length ?? 0) < 1) return '/(parent)/onboarding/add-kid';
    if ((choresQuery.data?.length ?? 0) < 1) return '/(parent)/onboarding/starter-chores';
    return '/(parent)/(tabs)';
  }, [choresQuery.data, familyQuery.data, kidsQuery.data]);

  const isLoading = MINIMAL_ONBOARDING
    ? familyQuery.isLoading
    : familyQuery.isLoading || kidsQuery.isLoading || choresQuery.isLoading;

  return {
    isLoading,
    family: familyQuery.data,
    kids: kidsQuery.data ?? [],
    chores: choresQuery.data ?? [],
    nextStep,
    completed: nextStep === '/(parent)/(tabs)',
  };
};
