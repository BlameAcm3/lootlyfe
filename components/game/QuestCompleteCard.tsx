import { Text, View } from 'react-native';

import { questDisplayDescription, questEmoji } from '../../data/presetQuests';
import { useLexicon } from '../../hooks/useLexicon';
import { cn } from '../../lib/cn';
import type { QuestReward } from '../../lib/game-math';
import type { QuestRow } from '../../queries/questsQueries';
import { Button } from '../ui';
import { RewardBurst } from './RewardBurst';

export type CompletionState = 'todo' | 'pending' | 'approved' | 'rejected';

type QuestCompleteCardProps = {
  quest: QuestRow;
  state: CompletionState;
  rejectionReason?: string | null;
  /** Predicted payout (streak multiplier applied) — display only. */
  reward: QuestReward;
  completing?: boolean;
  errorText?: string | null;
  /** Render the reward burst overlay (parent owns the trigger). */
  burst?: boolean;
  onBurstDone?: () => void;
  onComplete: () => void;
};

/**
 * The kid-side interactive quest card: tap Complete → optimistic state +
 * reward burst (auto-approved quests) or a themed "awaiting approval" state.
 * Rejection shows the NPC's reason wrapped in kind copy with a retry.
 */
export const QuestCompleteCard = ({
  quest,
  state,
  rejectionReason,
  reward,
  completing,
  errorText,
  burst,
  onBurstDone,
  onComplete,
}: QuestCompleteCardProps) => {
  const { t } = useLexicon();
  const done = state === 'approved';

  return (
    <View
      className={cn(
        'border-border gap-3 rounded-3xl border p-3.5',
        done ? 'bg-surface opacity-70' : 'bg-surface-raised',
      )}
    >
      <View className="flex-row gap-3">
        <View className="bg-bg-base border-border h-14 w-14 items-center justify-center rounded-2xl border">
          <Text className="text-2xl">{done ? '✅' : questEmoji(quest)}</Text>
        </View>
        <View className="flex-1 gap-1">
          <Text
            className={cn(
              'text-base font-extrabold',
              done ? 'text-text-muted line-through' : 'text-text-primary',
            )}
            numberOfLines={1}
          >
            {quest.title}
          </Text>
          {questDisplayDescription(quest, t) ? (
            <Text className="text-text-muted text-xs leading-4" numberOfLines={2}>
              {questDisplayDescription(quest, t)}
            </Text>
          ) : null}
          <View className="flex-row flex-wrap items-center gap-2 pt-0.5">
            <View className="bg-bg-base flex-row items-center gap-1 rounded-full px-2 py-0.5">
              <Text className="text-accent-loot text-xs font-extrabold">🪙 {reward.gold}</Text>
            </View>
            <View className="bg-bg-base flex-row items-center gap-1 rounded-full px-2 py-0.5">
              <Text className="text-accent-info text-xs font-extrabold">⚡ {reward.xp}</Text>
            </View>
            {reward.multiplier > 1 ? (
              <View className="bg-accent-achievement rounded-full px-2 py-0.5">
                <Text className="text-text-inverse text-[10px] font-black">
                  {t('streak_bonus_label', { multiplier: reward.multiplier })}
                </Text>
              </View>
            ) : null}
            {quest.is_required ? (
              <Text className="text-accent-achievement text-[10px] font-bold uppercase tracking-wide">
                {t('quest_required_badge')}
              </Text>
            ) : null}
          </View>
        </View>
      </View>

      {state === 'todo' ? (
        <Button
          accessibilityLabel={t('complete_action')}
          label={t('complete_action')}
          variant="primary"
          disabled={completing}
          onPress={onComplete}
        />
      ) : null}

      {state === 'pending' ? (
        <View className="bg-bg-base rounded-2xl px-3 py-2.5">
          <Text className="text-accent-info text-xs font-bold">
            ⏳ {t('quest_awaiting_approval')}
          </Text>
        </View>
      ) : null}

      {state === 'rejected' ? (
        <View className="gap-2">
          <View className="bg-bg-base rounded-2xl px-3 py-2.5">
            <Text className="text-text-muted text-xs leading-4">
              {t('quest_rejected_kind', { reason: rejectionReason ?? '…' })}
            </Text>
          </View>
          <Button
            accessibilityLabel={t('quest_try_again_action')}
            label={t('quest_try_again_action')}
            variant="ghost"
            size="sm"
            disabled={completing}
            onPress={onComplete}
          />
        </View>
      ) : null}

      {errorText ? <Text className="text-danger text-xs font-semibold">{errorText}</Text> : null}

      {burst && onBurstDone ? (
        <RewardBurst gold={reward.gold} xp={reward.xp} onDone={onBurstDone} />
      ) : null}
    </View>
  );
};
