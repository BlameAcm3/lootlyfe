import * as Haptics from 'expo-haptics';

export const useHaptics = () => {
  const triggerSelection = async (): Promise<void> => {
    await Haptics.selectionAsync();
  };

  return { triggerSelection };
};
