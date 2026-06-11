import { Text, View } from 'react-native';

import { useLexicon } from '../../hooks/useLexicon';

type LootCardProps = {
  emoji: string;
  name: string;
  description?: string;
  goldCost: number;
  /** null/undefined = unlimited */
  stock?: number | null;
};

/**
 * Grid tile for the loot shop: big emoji, name, gold price pill. Width is set
 * by the parent grid (e.g. basis-[48%]).
 */
export const LootCard = ({ emoji, name, description, goldCost, stock }: LootCardProps) => {
  const { t } = useLexicon();

  return (
    <View className="bg-surface-raised border-border items-center gap-2 rounded-3xl border p-4">
      {stock != null ? (
        <View className="bg-accent-loot absolute right-2.5 top-2.5 rounded-full px-2 py-0.5">
          <Text className="text-text-inverse text-[9px] font-black uppercase">
            {t('stock_left', { count: stock })}
          </Text>
        </View>
      ) : null}
      <View className="bg-bg-base border-border h-16 w-16 items-center justify-center rounded-2xl border">
        <Text className="text-3xl">{emoji}</Text>
      </View>
      <Text className="text-text-primary text-center text-sm font-extrabold" numberOfLines={2}>
        {name}
      </Text>
      {description ? (
        <Text className="text-text-muted text-center text-[11px] leading-4" numberOfLines={2}>
          {description}
        </Text>
      ) : null}
      <View className="bg-bg-base mt-auto flex-row items-center gap-1 rounded-full px-3 py-1">
        <Text className="text-accent-loot text-sm font-black">🪙 {goldCost}</Text>
        <Text className="text-text-muted text-[10px] font-semibold">{t('gold')}</Text>
      </View>
    </View>
  );
};
