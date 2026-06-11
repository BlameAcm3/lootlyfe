import { Image, Text, View } from 'react-native';

import { useLexicon } from '../../hooks/useLexicon';
import { useTheme } from '../../hooks/useTheme';

type StreakFlameProps = {
  days: number;
};

/** Static placeholder visual — the flame animation ships in a later pass. */
export const StreakFlame = ({ days }: StreakFlameProps) => {
  const { pack } = useTheme();
  const { t } = useLexicon();

  return (
    <View
      accessibilityLabel={`${days} ${t('streak')}`}
      className="bg-surface flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5"
    >
      <Image source={pack.assets.icons.streak} className="h-4 w-4 rounded-full" />
      <Text className="text-danger text-sm font-extrabold">{days}</Text>
      <Text className="text-text-muted text-xs font-semibold">{t('streak')}</Text>
    </View>
  );
};
