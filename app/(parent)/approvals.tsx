import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Input, Modal } from '../../components/ui';
import { useLexicon } from '../../hooks/useLexicon';
import { timeLabel } from '../../lib/dates';
import { useCurrentGuild } from '../../queries/guildQueries';
import {
  useApproveCompletion,
  usePendingCompletions,
  useRejectCompletion,
  type PendingCompletion,
} from '../../queries/completionsQueries';

function PendingRow({
  completion,
  resolving,
  onApprove,
  onReject,
}: {
  completion: PendingCompletion;
  resolving: boolean;
  onApprove: () => void;
  onReject: () => void;
}) {
  const { t } = useLexicon();

  return (
    <Card raised className="gap-3">
      <View className="flex-row items-center gap-3">
        <View className="flex-1 gap-0.5">
          <Text className="text-text-primary text-base font-extrabold" numberOfLines={1}>
            {completion.quests.title}
          </Text>
          <Text className="text-text-muted text-xs font-semibold">
            {completion.adventurer_profiles.nickname} ·{' '}
            {t('completed_when_label', { when: timeLabel(completion.completed_at) })}
          </Text>
        </View>
        <Text className="text-text-muted text-xs font-bold">
          🪙 {completion.quests.gold_reward} · ⚡ {completion.quests.xp_reward}
        </Text>
      </View>
      <View className="flex-row gap-2">
        <View className="flex-1">
          <Button
            accessibilityLabel={t('approve_action')}
            label={t('approve_action')}
            disabled={resolving}
            onPress={onApprove}
          />
        </View>
        <View className="flex-1">
          <Button
            accessibilityLabel={t('reject_action')}
            label={t('reject_action')}
            variant="ghost"
            disabled={resolving}
            onPress={onReject}
          />
        </View>
      </View>
    </Card>
  );
}

/**
 * NPC approval queue. Approving only flips status — the reward grant (with
 * streak multiplier) happens in the DB trigger, never client-computed.
 * Rejecting requires a short reason, shown kindly on the kid's card.
 */
export default function ApprovalsScreen() {
  const { t } = useLexicon();
  const { guild, npcProfile } = useCurrentGuild();
  const pendingQuery = usePendingCompletions(guild?.id);
  const approveMutation = useApproveCompletion({
    guildId: guild?.id ?? '',
    npcProfileId: npcProfile?.id ?? '',
  });
  const rejectMutation = useRejectCompletion({ guildId: guild?.id ?? '' });

  const [rejecting, setRejecting] = useState<PendingCompletion | null>(null);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);

  if (!guild) return null;

  const pending = pendingQuery.data ?? [];
  const resolving = approveMutation.isPending || rejectMutation.isPending;

  const submitRejection = async () => {
    if (!rejecting) return;
    if (!reason.trim()) {
      setReasonError(t('reject_reason_required'));
      return;
    }
    await rejectMutation.mutateAsync({ completionId: rejecting.id, reason: reason.trim() });
    setRejecting(null);
    setReason('');
    setReasonError(null);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="pt-2">
          <Text className="text-text-primary text-2xl font-extrabold">{t('approvals_title')}</Text>
        </View>

        {pending.length === 0 && !pendingQuery.isLoading ? (
          <Card className="items-center gap-2 p-8">
            <Text className="text-5xl">🎉</Text>
            <Text className="text-text-muted text-center text-sm">{t('approvals_empty_body')}</Text>
          </Card>
        ) : (
          pending.map((completion) => (
            <PendingRow
              key={completion.id}
              completion={completion}
              resolving={resolving}
              onApprove={() => void approveMutation.mutateAsync(completion.id)}
              onReject={() => {
                setRejecting(completion);
                setReason('');
                setReasonError(null);
              }}
            />
          ))
        )}
      </ScrollView>

      <Modal visible={rejecting !== null} onClose={() => setRejecting(null)}>
        <View className="gap-3">
          <Text className="text-text-primary text-lg font-extrabold">
            {t('reject_modal_title')}
          </Text>
          <Input
            accessibilityLabel={t('reject_reason_label')}
            label={t('reject_reason_label')}
            value={reason}
            onChangeText={(value) => {
              setReason(value);
              setReasonError(null);
            }}
            error={reasonError ?? undefined}
          />
          <Button
            label={t('reject_action')}
            variant="danger"
            disabled={rejectMutation.isPending}
            onPress={() => void submitRejection()}
          />
          <Button label={t('cancel_action')} variant="ghost" onPress={() => setRejecting(null)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
