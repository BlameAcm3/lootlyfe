import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuestCard } from '../../../components/game';
import { Badge, SectionHeader } from '../../../components/ui';
import { QUEST_CATEGORIES, questsByCategory } from '../../../data/presetQuests';
import { useLexicon } from '../../../hooks/useLexicon';

/**
 * Preset quest library. Tapping a preset opens the quest builder prefilled
 * from it; the created row carries source_preset_id, so preset-sourced
 * quests never count against the free-tier custom quest limit.
 */
export default function PresetLibraryScreen() {
  const { t } = useLexicon();
  const router = useRouter();

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="flex-row items-center justify-between pt-2">
          <Text className="text-text-primary text-2xl font-extrabold">
            {t('preset_library_label')}
          </Text>
          <Badge label={t('preset_use_action')} tone="achievement" />
        </View>

        {QUEST_CATEGORIES.map((category) => {
          const quests = questsByCategory(category.id);
          if (quests.length === 0) return null;
          return (
            <View key={category.id} className="gap-2.5">
              <SectionHeader title={`${category.emoji}  ${t(category.labelKey)}`} />
              {quests.map((quest) => (
                <Pressable
                  key={quest.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${t('preset_use_action')}: ${quest.title}`}
                  onPress={() =>
                    router.push({
                      pathname: '/(parent)/quests/new',
                      params: { preset: quest.id },
                    })
                  }
                >
                  <QuestCard
                    emoji={quest.emoji}
                    title={quest.title}
                    description={t(quest.flavorKey)}
                    goldReward={quest.goldReward}
                    xpReward={quest.xpReward}
                    difficulty={quest.difficulty}
                    recurrence={quest.recurrence}
                  />
                </Pressable>
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
