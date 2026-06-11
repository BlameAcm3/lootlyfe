import { Image, Text, View } from 'react-native';

import { useLexicon } from '../../hooks/useLexicon';
import { useTheme } from '../../hooks/useTheme';

type GoldCounterProps = {
  amount: number;
};

export const GoldCounter = ({ amount }: GoldCounterProps) => {
  const { pack } = useTheme();
  const { t } = useLexicon();

  return (
    <View
      accessibilityLabel={`${amount} ${t('gold')}`}
      className="bg-surface flex-row items-center gap-1.5 self-start rounded-full px-3 py-1.5"
    >
      <Image source={pack.assets.icons.gold} className="h-4 w-4 rounded-full" />
      <Text className="text-accent-loot text-sm font-extrabold">{amount.toLocaleString()}</Text>
      <Text className="text-text-muted text-xs font-semibold">{t('gold')}</Text>
    </View>
  );
};
