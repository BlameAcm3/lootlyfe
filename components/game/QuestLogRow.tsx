import { Pressable, Text, View } from 'react-native';

import { questEmoji } from '../../data/presetQuests';
import { useLexicon } from '../../hooks/useLexicon';
import type { QuestLogEntry } from '../../hooks/useQuestLog';
import { cn } from '../../lib/cn';
import type { LexiconKey } from '../../lib/lexicon';
import type { OccurrenceStatus } from '../../lib/recurrence';
import { Badge } from '../ui';

const statusKeys: Record<OccurrenceStatus, LexiconKey> = {
  pending: 'quest_status_pending',
  in_progress: 'quest_status_in_progress',
  completed: 'quest_status_completed',
  expired: 'quest_status_expired',
};

const statusTones: Record<OccurrenceStatus, 'muted' | 'info' | 'progress' | 'danger'> = {
  pending: 'muted',
  in_progress: 'info',
  completed: 'progress',
  expired: 'danger',
};

/**
 * One due instance in the NPC quest log: quest + adventurer + computed
 * status. Compact by design — the log shows many of these per day.
 */
export const QuestLogRow = ({ entry, onPress }: { entry: QuestLogEntry; onPress?: () => void }) => {
  const { t } = useLexicon();
  const { quest, adventurer, window, status } = entry;
  const done = status === 'completed';

  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={!onPress}>
      <View
        className={cn(
          'border-border flex-row items-center gap-3 rounded-2xl border p-3',
          done ? 'bg-surface opacity-60' : 'bg-surface-raised',
        )}
      >
        <View className="bg-bg-base border-border h-11 w-11 items-center justify-center rounded-xl border">
          <Text className="text-xl">{done ? '✅' : questEmoji(quest)}</Text>
        </View>
        <View className="flex-1 gap-1">
          <Text className="text-text-primary text-sm font-extrabold" numberOfLines={1}>
            {quest.title}
          </Text>
          <View className="flex-row flex-wrap items-center gap-2">
            <Text className="text-text-muted text-xs font-semibold">
              {adventurer?.nickname ?? t('quest_unassigned_label')}
            </Text>
            {window ? (
              <Text className="text-text-muted text-xs">
                {window.start}–{window.end}
              </Text>
            ) : null}
            {quest.is_required ? (
              <Text className="text-accent-achievement text-[10px] font-bold uppercase tracking-wide">
                {t('quest_required_badge')}
              </Text>
            ) : null}
          </View>
        </View>
        <View className="items-end gap-1">
          <Badge label={t(statusKeys[status])} tone={statusTones[status]} />
          <Text className="text-text-muted text-[10px] font-semibold">
            🪙 {quest.gold_reward} · ⚡ {quest.xp_reward}
          </Text>
        </View>
      </View>
    </Pressable>
  );
};
