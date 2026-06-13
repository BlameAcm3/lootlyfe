import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuestForm, type QuestFormValues } from '../../../components/forms/QuestForm';
import { Button, Card } from '../../../components/ui';
import { presetById, presetCanonicalDescription } from '../../../data/presetQuests';
import { useLexicon } from '../../../hooks/useLexicon';
import { todayIso, type Recurrence } from '../../../lib/recurrence';
import { useAdventurers } from '../../../queries/adventurerQueries';
import { useCurrentGuild } from '../../../queries/guildQueries';
import { limitErrorContext, useSubscription } from '@/features/subscriptions';
import { isActiveCustomQuest, useCreateQuest, useQuests } from '../../../queries/questsQueries';

const presetInitial = (presetId: string | undefined): Partial<QuestFormValues> | undefined => {
  const preset = presetById(presetId);
  if (!preset) return undefined;
  const recurrence: Recurrence =
    preset.recurrence === 'weekly'
      ? { type: 'weekly', days: [] }
      : preset.recurrence === 'once'
        ? { type: 'once', date: todayIso() }
        : { type: 'daily' };
  return {
    title: preset.title,
    description: presetCanonicalDescription(preset),
    category: preset.categoryId,
    goldReward: preset.goldReward,
    xpReward: preset.xpReward,
    recurrence,
  };
};

export default function NewQuestScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const params = useLocalSearchParams<{ preset?: string }>();
  const { guild } = useCurrentGuild();
  const { checkLimit, openPaywall, limits } = useSubscription();
  const adventurersQuery = useAdventurers(guild?.id);
  const questsQuery = useQuests(guild?.id);
  const mutation = useCreateQuest(guild?.id ?? '');

  if (!guild) return null;

  const preset = presetById(params.preset);
  const activeCustomCount = (questsQuery.data ?? []).filter(isActiveCustomQuest).length;
  // Deep-link guard for the free-tier gate on the quest log's New button;
  // preset-sourced quests never count against the custom limit.
  const limitHit = !preset && !checkLimit('custom_quests', activeCustomCount).allowed;

  const activeAdventurers = (adventurersQuery.data ?? []).filter(
    (adventurer) => !adventurer.archived_at,
  );

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="pt-2">
          <Text className="text-text-primary text-2xl font-extrabold">{t('quest_new_title')}</Text>
        </View>

        {limitHit ? (
          <Card className="gap-3 p-5">
            <Text className="text-text-primary text-lg font-extrabold">
              {t('quest_limit_title')}
            </Text>
            <Text className="text-text-muted text-sm leading-5">
              {t('quest_limit_body', { limit: limits.custom_quests })}
            </Text>
            <Button
              label={t('upgrade_action')}
              variant="gold"
              onPress={() => openPaywall('quest_limit')}
            />
            <Button label={t('not_now_action')} variant="ghost" onPress={() => router.back()} />
          </Card>
        ) : (
          <QuestForm
            initial={presetInitial(params.preset)}
            adventurers={activeAdventurers}
            submitting={mutation.isPending}
            onSubmit={async (values) => {
              try {
                await mutation.mutateAsync({
                  title: values.title,
                  description: values.description || null,
                  category: values.category,
                  gold_reward: values.goldReward,
                  xp_reward: values.xpReward,
                  is_required: values.isRequired,
                  requires_approval: values.requiresApproval,
                  recurrence: values.recurrence,
                  assigned_adventurer_ids: values.assignedAdventurerIds,
                  source_preset_id: preset?.id ?? null,
                });
                router.back();
              } catch (error) {
                const context = limitErrorContext(error);
                if (context) openPaywall(context);
                else Alert.alert(t('error_generic'));
              }
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
