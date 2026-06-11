import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Card } from '../../../components/ui';
import { LootCard } from '../../../components/game';
import { PRESET_LOOT } from '../../../data/presetLoot';
import { useLexicon } from '../../../hooks/useLexicon';

/**
 * Loot tab: browsable preset reward library (client-side content from
 * data/). Stocking the guild's own treasury (loot_items) lands with the
 * loot pass.
 */
export default function LootTabScreen() {
  const { t } = useLexicon();

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="flex-row items-center justify-between pt-2">
          <Text className="text-text-primary text-3xl font-black">{t('loot')}</Text>
          <Badge label={t('preset_library_label')} tone="achievement" />
        </View>

        <Card raised className="flex-row items-center gap-3">
          <Text className="text-3xl">⚒️</Text>
          <View className="flex-1">
            <Text className="text-text-primary text-sm font-extrabold">
              {t('loot_coming_title')}
            </Text>
            <Text className="text-text-muted text-xs leading-4">{t('loot_coming_body')}</Text>
          </View>
        </Card>

        <View className="flex-row flex-wrap justify-between">
          {PRESET_LOOT.map((loot) => (
            <View key={loot.id} className="mb-3 w-[48.5%]">
              <LootCard
                emoji={loot.emoji}
                name={loot.name}
                description={loot.description}
                goldCost={loot.goldCost}
                stock={loot.stock}
              />
            </View>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
