import { Text, View } from 'react-native';

import { cn } from '../../lib/cn';
import { useLexicon } from '../../hooks/useLexicon';
import type { LexiconKey } from '../../lib/lexicon';
import type { RecurrenceType } from '../../lib/recurrence';

type QuestCardProps = {
  emoji: string;
  title: string;
  description?: string;
  goldReward: number;
  xpReward: number;
  difficulty?: 1 | 2 | 3;
  recurrence?: RecurrenceType;
  /** Completed styling (checked tile, dimmed). */
  done?: boolean;
};

const recurrenceKeys: Record<RecurrenceType, LexiconKey> = {
  daily: 'recurrence_daily',
  weekly: 'recurrence_weekly',
  monthly: 'recurrence_monthly',
  once: 'recurrence_once',
};

function DifficultyPips({ level }: { level: 1 | 2 | 3 }) {
  return (
    <View className="flex-row items-center gap-1" accessibilityLabel={`difficulty ${level}/3`}>
      {[1, 2, 3].map((pip) => (
        <View
          key={pip}
          className={cn(
            'h-1.5 w-3 rounded-full',
            pip <= level ? 'bg-accent-achievement' : 'bg-border',
          )}
        />
      ))}
    </View>
  );
}

/**
 * The core quest row: emoji tile, title, reward chips. Everything resolves
 * through theme tokens and the lexicon, so the same card reads "Quest · Gold"
 * in fantasy and "Mission · Credits" in sci-fi.
 */
export const QuestCard = ({
  emoji,
  title,
  description,
  goldReward,
  xpReward,
  difficulty,
  recurrence,
  done,
}: QuestCardProps) => {
  const { t } = useLexicon();

  return (
    <View
      className={cn(
        'border-border flex-row gap-3 rounded-3xl border p-3.5',
        done ? 'bg-surface opacity-60' : 'bg-surface-raised',
      )}
    >
      <View className="bg-bg-base border-border h-14 w-14 items-center justify-center rounded-2xl border">
        <Text className="text-2xl">{done ? '✅' : emoji}</Text>
      </View>
      <View className="flex-1 gap-1.5">
        <View className="flex-row items-start justify-between gap-2">
          <Text className="text-text-primary flex-1 text-base font-extrabold" numberOfLines={1}>
            {title}
          </Text>
          {difficulty ? <DifficultyPips level={difficulty} /> : null}
        </View>
        {description ? (
          <Text className="text-text-muted text-xs leading-4" numberOfLines={2}>
            {description}
          </Text>
        ) : null}
        <View className="flex-row items-center gap-2 pt-0.5">
          <View className="bg-bg-base flex-row items-center gap-1 rounded-full px-2 py-0.5">
            <Text className="text-accent-loot text-xs font-extrabold">🪙 {goldReward}</Text>
            <Text className="text-text-muted text-[10px] font-semibold">{t('gold')}</Text>
          </View>
          <View className="bg-bg-base flex-row items-center gap-1 rounded-full px-2 py-0.5">
            <Text className="text-accent-info text-xs font-extrabold">⚡ {xpReward}</Text>
            <Text className="text-text-muted text-[10px] font-semibold">{t('xp')}</Text>
          </View>
          {recurrence ? (
            <Text className="text-text-muted text-[10px] font-bold uppercase tracking-wide">
              {t(recurrenceKeys[recurrence])}
            </Text>
          ) : null}
        </View>
      </View>
    </View>
  );
};
