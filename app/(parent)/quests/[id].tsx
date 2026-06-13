import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuestForm, type QuestFormValues } from '../../../components/forms/QuestForm';
import { Badge, Button, Card, Modal } from '../../../components/ui';
import { categoryById, type QuestCategoryId } from '../../../data/presetQuests';
import { useLexicon } from '../../../hooks/useLexicon';
import { parseRecurrence } from '../../../lib/recurrence';
import { useAdventurers } from '../../../queries/adventurerQueries';
import { useCurrentGuild } from '../../../queries/guildQueries';
import { useSubscription } from '@/features/subscriptions';
import {
  isActiveCustomQuest,
  useDeleteQuest,
  useQuests,
  useUpdateQuest,
  type QuestRow,
} from '../../../queries/questsQueries';

const toInitial = (quest: QuestRow): Partial<QuestFormValues> => ({
  title: quest.title,
  description: quest.description ?? '',
  category: (categoryById(quest.category)?.id ?? 'chores') as QuestCategoryId,
  goldReward: quest.gold_reward,
  xpReward: quest.xp_reward,
  isRequired: quest.is_required,
  requiresApproval: quest.requires_approval,
  recurrence: parseRecurrence(quest.recurrence) ?? undefined,
  assignedAdventurerIds: quest.assigned_adventurer_ids,
});

export default function EditQuestScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { guild } = useCurrentGuild();
  const { lockedIdsFor, openPaywall } = useSubscription();
  const adventurersQuery = useAdventurers(guild?.id);
  const questsQuery = useQuests(guild?.id);
  const updateMutation = useUpdateQuest(guild?.id ?? '');
  const deleteMutation = useDeleteQuest(guild?.id ?? '');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const quest = (questsQuery.data ?? []).find((row) => row.id === id);
  if (!guild || !quest) return null;

  const activeAdventurers = (adventurersQuery.data ?? []).filter(
    (adventurer) => !adventurer.archived_at,
  );
  const archived = Boolean(quest.archived_at);
  // Downgrade matrix: newest custom quests beyond the free limit are read-only
  // on a lapsed guild (editing locked; archive/delete stay available so the NPC
  // can free a slot). Preset-sourced quests are never locked.
  const activeCustom = (questsQuery.data ?? []).filter(isActiveCustomQuest);
  const isLocked = lockedIdsFor('custom_quests', activeCustom).has(quest.id);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="pt-2">
          <Text className="text-text-primary text-2xl font-extrabold">{t('quest_edit_title')}</Text>
        </View>

        {isLocked ? (
          <Card className="gap-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl">🔒</Text>
              <Text className="text-text-primary flex-1 text-base font-bold">{quest.title}</Text>
              <Badge label={t('locked_badge_label')} tone="muted" />
            </View>
            <Text className="text-text-muted text-sm leading-5">{t('locked_upgrade_nudge')}</Text>
            <Button
              label={t('upgrade_action')}
              variant="gold"
              onPress={() => openPaywall('quest_limit')}
            />
          </Card>
        ) : (
          <QuestForm
            initial={toInitial(quest)}
            adventurers={activeAdventurers}
            submitting={updateMutation.isPending}
            onSubmit={async (values) => {
              await updateMutation.mutateAsync({
                id: quest.id,
                patch: {
                  title: values.title,
                  description: values.description || null,
                  category: values.category,
                  gold_reward: values.goldReward,
                  xp_reward: values.xpReward,
                  is_required: values.isRequired,
                  requires_approval: values.requiresApproval,
                  recurrence: values.recurrence,
                  assigned_adventurer_ids: values.assignedAdventurerIds,
                },
              });
              router.back();
            }}
          />
        )}

        <Button
          label={archived ? t('quest_restore_action') : t('quest_archive_action')}
          variant="ghost"
          disabled={updateMutation.isPending}
          onPress={async () => {
            await updateMutation.mutateAsync({
              id: quest.id,
              patch: { archived_at: archived ? null : new Date().toISOString() },
            });
            router.back();
          }}
        />
        <Button
          label={t('quest_delete_action')}
          variant="danger"
          disabled={deleteMutation.isPending}
          onPress={() => setDeleteConfirmVisible(true)}
        />
      </ScrollView>

      <Modal visible={deleteConfirmVisible} onClose={() => setDeleteConfirmVisible(false)}>
        <View className="gap-3">
          <Text className="text-text-primary text-lg font-extrabold">
            {t('quest_delete_action')}
          </Text>
          <Text className="text-text-muted text-sm leading-5">
            {t('quest_delete_confirm_body')}
          </Text>
          <Button
            label={t('quest_delete_action')}
            variant="danger"
            disabled={deleteMutation.isPending}
            onPress={async () => {
              await deleteMutation.mutateAsync(quest.id);
              setDeleteConfirmVisible(false);
              router.back();
            }}
          />
          <Button
            label={t('cancel_action')}
            variant="ghost"
            onPress={() => setDeleteConfirmVisible(false)}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
