import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { Card, SectionHeader } from '../../components/ui';
import {
  AchievementToast,
  AvatarRenderer,
  GoldCounter,
  LevelUpModal,
  QuestCompleteCard,
  StreakFlame,
  XPBar,
  type CompletionState,
} from '../../components/game';
import { presetAchievementById } from '../../data/preset-achievements';
import { useCurrentAdventurer } from '../../hooks/useCurrentAdventurer';
import { useLexicon } from '../../hooks/useLexicon';
import { useTheme } from '../../hooks/useTheme';
import { achievementPointsForLevelUp, calculateQuestReward, xpProgress } from '../../lib/game-math';
import { occurrencesFor, todayIso } from '../../lib/recurrence';
import { ROUTES } from '../../lib/routes';
import { playPackSound } from '../../lib/sounds';
import { useAdventurerAchievements } from '../../queries/achievementsQueries';
import { useCompleteQuest } from '../../queries/completionsQueries';
import {
  useAdventurerCompletions,
  useAdventurerQuests,
  type QuestCompletionRow,
  type QuestRow,
} from '../../queries/questsQueries';

function greetingKey(hour: number) {
  if (hour < 12) return 'greeting_morning' as const;
  if (hour < 18) return 'greeting_afternoon' as const;
  return 'greeting_evening' as const;
}

const stateFor = (completion: QuestCompletionRow | undefined): CompletionState => {
  if (!completion) return 'todo';
  if (completion.status === 'approved') return 'approved';
  if (completion.status === 'rejected') return 'rejected';
  return 'pending';
};

type TodayItem = {
  quest: QuestRow;
  state: CompletionState;
  completion?: QuestCompletionRow;
  windowStart: string;
};

/**
 * Adventurer dashboard: identity hero, live stats, and today's quest list
 * with the full completion loop (optimistic complete → reward burst or
 * awaiting-approval → level-up celebration).
 */
export default function AdventurerHomeScreen() {
  const router = useRouter();
  const { t } = useLexicon();
  const { pack } = useTheme();
  const { adventurerId, adventurer } = useCurrentAdventurer();

  const today = todayIso();
  const questsQuery = useAdventurerQuests(adventurerId);
  const completionsQuery = useAdventurerCompletions(adventurerId, { start: today, end: today });
  const achievementsQuery = useAdventurerAchievements(adventurerId);
  const completeMutation = useCompleteQuest(adventurerId);

  const [completingIds, setCompletingIds] = useState<ReadonlySet<string>>(new Set());
  const [burstQuestId, setBurstQuestId] = useState<string | null>(null);
  const [errorQuestId, setErrorQuestId] = useState<string | null>(null);
  const [levelUp, setLevelUp] = useState<{ level: number; points: number } | null>(null);
  const previousLevel = useRef<number | null>(null);
  const [toastQueue, setToastQueue] = useState<string[]>([]);
  const seenAchievements = useRef<Set<string> | null>(null);

  // Achievement-earned detection mirrors level-up detection: awards are
  // written server-side in the grant transaction; any new id arriving after
  // the first fetch (which sets the no-toast baseline) gets celebrated.
  const achievementRows = achievementsQuery.data;
  useEffect(() => {
    if (!achievementRows) return;
    const ids = achievementRows.map((row) => row.achievement_id);
    if (seenAchievements.current === null) {
      seenAchievements.current = new Set(ids);
      return;
    }
    const seen = seenAchievements.current;
    const fresh = ids.filter((id) => !seen.has(id) && presetAchievementById(id) !== null);
    if (fresh.length === 0) return;
    fresh.forEach((id) => seen.add(id));
    setToastQueue((queue) => [...queue, ...fresh]);
  }, [achievementRows]);

  const dismissToast = useCallback(() => setToastQueue((queue) => queue.slice(1)), []);

  // Level-up detection: the server recomputes level on every grant; a crossing
  // between refetches triggers the celebration (covers auto-approve AND
  // later NPC approvals landing while the kid is on the dashboard).
  const level = adventurer?.level ?? null;
  useEffect(() => {
    if (level === null) return;
    const previous = previousLevel.current;
    previousLevel.current = level;
    if (previous !== null && level > previous) {
      setLevelUp({ level, points: achievementPointsForLevelUp(previous, level) });
    }
  }, [level]);

  const handleComplete = useCallback(
    async (quest: QuestRow) => {
      if (completingIds.has(quest.id)) return; // double-tap guard (UI layer)
      setCompletingIds((current) => new Set(current).add(quest.id));
      setErrorQuestId(null);
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
      try {
        await completeMutation.mutateAsync(quest.id);
        if (!quest.requires_approval) {
          playPackSound(pack, 'quest_complete');
          setBurstQuestId(quest.id);
        }
      } catch {
        setErrorQuestId(quest.id);
        setTimeout(
          () => setErrorQuestId((current) => (current === quest.id ? null : current)),
          4000,
        );
      } finally {
        setCompletingIds((current) => {
          const next = new Set(current);
          next.delete(quest.id);
          return next;
        });
      }
    },
    [completingIds, completeMutation, pack],
  );

  if (!adventurer) return null;

  // Latest completion per quest for today (a rejected row may have a newer
  // retry after it).
  const completionByQuest = new Map<string, QuestCompletionRow>();
  for (const completion of completionsQuery.data ?? []) {
    if (todayIso(new Date(completion.completed_at)) !== today) continue;
    const existing = completionByQuest.get(completion.quest_id);
    if (!existing || completion.completed_at > existing.completed_at) {
      completionByQuest.set(completion.quest_id, completion);
    }
  }

  const stateRank: Record<CompletionState, number> = {
    rejected: 0,
    todo: 1,
    pending: 2,
    approved: 3,
  };
  const todayItems: TodayItem[] = (questsQuery.data ?? [])
    .flatMap((quest) =>
      occurrencesFor(quest, { start: today, end: today }).map((occurrence) => {
        const completion = completionByQuest.get(quest.id);
        return {
          quest,
          completion,
          state: stateFor(completion),
          windowStart: occurrence.window?.start ?? '',
        };
      }),
    )
    .sort(
      (a, b) =>
        // Done sinks; required floats; then by time window; then title.
        Number(a.state === 'approved') - Number(b.state === 'approved') ||
        Number(b.quest.is_required) - Number(a.quest.is_required) ||
        a.windowStart.localeCompare(b.windowStart) ||
        a.quest.title.localeCompare(b.quest.title),
    );
  const allDone = todayItems.length > 0 && todayItems.every((item) => stateRank[item.state] >= 2);

  const progress = xpProgress(adventurer.xp_total);
  const streakDays = adventurer.current_streak_days;
  const activeToast = toastQueue.length > 0 ? presetAchievementById(toastQueue[0]) : null;

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
        {/* Identity hero — tap the avatar to open the profile */}
        <View className="items-center gap-2 pt-6">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('profile_title')}
            onPress={() => router.push(ROUTES.adventurerProfile)}
            className="border-accent-achievement bg-surface-raised h-24 w-24 items-center justify-center rounded-full border-4"
          >
            <AvatarRenderer config={adventurer.avatar_config} size={80} />
            <View className="bg-accent-loot border-bg-base absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-xl border-2">
              <Text className="text-text-inverse text-xs font-black">{adventurer.level}</Text>
            </View>
          </Pressable>
          <Text className="text-text-muted text-sm font-semibold">
            {t(greetingKey(new Date().getHours()))}
          </Text>
          <Text className="text-text-primary text-3xl font-black">{adventurer.nickname}</Text>
          <Text className="text-accent-achievement text-xs font-extrabold uppercase tracking-widest">
            {t('rank_title', { level: adventurer.level })}
          </Text>
        </View>

        {/* Stats */}
        <Card raised className="gap-4 p-5">
          <XPBar xp={progress.into} xpToNext={progress.toNext} level={progress.level} />
          <View className="flex-row gap-2.5">
            <GoldCounter amount={adventurer.gold_balance} />
            <StreakFlame days={streakDays} />
          </View>
        </Card>

        {/* Identity quick links */}
        <View className="flex-row gap-2.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('loot_shop_title')}
            onPress={() => router.push(ROUTES.adventurerShop)}
            className="bg-surface border-border flex-1 flex-row items-center justify-center gap-2 rounded-2xl border p-3"
          >
            <Text className="text-lg">🎁</Text>
            <Text className="text-text-primary text-sm font-extrabold">{t('loot_shop_title')}</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('wishlist_title')}
            onPress={() => router.push(ROUTES.adventurerWishlist)}
            className="bg-surface border-border flex-1 flex-row items-center justify-center gap-2 rounded-2xl border p-3"
          >
            <Text className="text-lg">⭐</Text>
            <Text className="text-text-primary text-sm font-extrabold">{t('wishlist_title')}</Text>
          </Pressable>
        </View>
        <View className="flex-row gap-2.5">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('cosmetic_store_title')}
            onPress={() => router.push(ROUTES.adventurerStore)}
            className="bg-surface border-border flex-1 flex-row items-center justify-center gap-2 rounded-2xl border p-3"
          >
            <Text className="text-lg">🛍️</Text>
            <Text className="text-text-primary text-sm font-extrabold">
              {t('cosmetic_store_title')}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('achievements_title')}
            onPress={() => router.push(ROUTES.adventurerProfile)}
            className="bg-surface border-border flex-1 flex-row items-center justify-center gap-2 rounded-2xl border p-3"
          >
            <Text className="text-lg">🏅</Text>
            <Text className="text-text-primary text-sm font-extrabold">
              {t('achievements_title')}
            </Text>
          </Pressable>
        </View>

        {/* Today's quests */}
        <SectionHeader title={t('quests_today_label')} />
        {todayItems.length === 0 ? (
          <Card className="items-center gap-2 p-8">
            <Text className="text-5xl">⚔️</Text>
            <Text className="text-text-muted text-center text-sm leading-5">
              {t('empty_quests_body')}
            </Text>
          </Card>
        ) : (
          <View className="gap-2.5">
            {allDone ? (
              <Card raised className="items-center gap-1 p-5">
                <Text className="text-4xl">🏆</Text>
                <Text className="text-text-primary text-base font-extrabold">
                  {t('all_done_title')}
                </Text>
                <Text className="text-text-muted text-center text-sm">{t('all_done_body')}</Text>
              </Card>
            ) : null}
            {todayItems.map((item) => (
              <QuestCompleteCard
                key={item.quest.id}
                quest={item.quest}
                state={item.state}
                rejectionReason={item.completion?.rejection_reason}
                reward={calculateQuestReward(item.quest, streakDays)}
                completing={completingIds.has(item.quest.id)}
                errorText={errorQuestId === item.quest.id ? t('complete_error_body') : null}
                burst={burstQuestId === item.quest.id}
                onBurstDone={() => setBurstQuestId(null)}
                onComplete={() => void handleComplete(item.quest)}
              />
            ))}
          </View>
        )}
      </ScrollView>

      <AchievementToast achievement={activeToast} onDone={dismissToast} />

      <LevelUpModal
        visible={levelUp !== null}
        level={levelUp?.level ?? adventurer.level}
        points={levelUp?.points ?? 0}
        onClose={() => setLevelUp(null)}
      />
    </SafeAreaView>
  );
}
