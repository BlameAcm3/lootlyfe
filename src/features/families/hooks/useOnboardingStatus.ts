import { useMemo } from 'react';

import { useFamily } from '@/features/families';
import { useKids } from '@/features/kids';
import { useChores } from '@/features/chores';

export const useOnboardingStatus = () => {
  const familyQuery = useFamily();
  const kidsQuery = useKids(familyQuery.data?.id);
  const choresQuery = useChores(familyQuery.data?.id);

  const nextStep = useMemo(() => {
    if (!familyQuery.data) return '/(parent)/onboarding/create-family';
    if ((kidsQuery.data?.length ?? 0) < 1) return '/(parent)/onboarding/add-kid';
    if ((choresQuery.data?.length ?? 0) < 1) return '/(parent)/onboarding/starter-chores';
    return '/(parent)/(tabs)';
  }, [choresQuery.data, familyQuery.data, kidsQuery.data]);

  return {
    isLoading: familyQuery.isLoading || kidsQuery.isLoading || choresQuery.isLoading,
    family: familyQuery.data,
    kids: kidsQuery.data ?? [],
    chores: choresQuery.data ?? [],
    nextStep,
    completed: nextStep === '/(parent)/(tabs)',
  };
};
