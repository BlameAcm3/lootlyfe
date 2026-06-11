import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Card, SectionHeader } from '../../../components/ui';
import { QuestCard } from '../../../components/game';
import { QUEST_CATEGORIES, questsByCategory } from '../../../data/presetQuests';
import { useLexicon } from '../../../hooks/useLexicon';

/**
 * Quests tab: browsable preset quest library (client-side content from
 * data/). The quest builder — creating, customizing, assigning to
 * adventurers — lands with the quest pass and writes to the quests table.
 */
export default function QuestsTabScreen() {
  const { t } = useLexicon();

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="flex-row items-center justify-between pt-2">
          <Text className="text-text-primary text-3xl font-black">{t('quest_plural')}</Text>
          <Badge label={t('preset_library_label')} tone="achievement" />
        </View>

        <Card raised className="flex-row items-center gap-3">
          <Text className="text-3xl">🛠️</Text>
          <View className="flex-1">
            <Text className="text-text-primary text-sm font-extrabold">
              {t('quests_coming_title')}
            </Text>
            <Text className="text-text-muted text-xs leading-4">{t('quests_coming_body')}</Text>
          </View>
        </Card>

        {QUEST_CATEGORIES.map((category) => {
          const quests = questsByCategory(category.id);
          if (quests.length === 0) return null;
          return (
            <View key={category.id} className="gap-2.5">
              <SectionHeader title={`${category.emoji}  ${category.label}`} />
              {quests.map((quest) => (
                <QuestCard
                  key={quest.id}
                  emoji={quest.emoji}
                  title={quest.title}
                  description={quest.description}
                  goldReward={quest.goldReward}
                  xpReward={quest.xpReward}
                  difficulty={quest.difficulty}
                  recurrence={quest.recurrence}
                />
              ))}
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}
