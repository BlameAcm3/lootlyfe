import { useRef, useState } from 'react';
import { Animated, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCompleteChoreInstance, useTodaysKidInstances } from '@/features/chore-instances';
import { useKids } from '@/features/kids';
import { useKidStreak } from '@/features/points';
import { QuestCard, XPBar, type QuestType } from '@/shared/components';
import { useTheme } from '@/shared/hooks';
import { useModeStore } from '@/stores/modeStore';
import { useSessionStore } from '@/stores/sessionStore';
import { Text } from '@/shared/components/Text';

type ChoreInstance = {
  id: string;
  status: string;
  chores?: {
    title?: string;
    points?: number;
    requires_approval?: boolean;
    high_value?: boolean;
    description?: string | null;
  } | null;
};

function getQuestType(chore: ChoreInstance['chores']): QuestType {
  if (chore?.high_value) return 'mission';
  const pts = chore?.points ?? 0;
  if (pts >= 35) return 'challenge';
  return 'quest';
}

function coinReward(points: number) {
  return Math.max(5, Math.round(points * 0.55));
}

function stepsFromDescription(desc: string | null | undefined): string[] | undefined {
  if (!desc) return undefined;
  const lines = desc.split(/\n+/).map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return undefined;
  return lines.map((l) => l.replace(/^\d+[.)]\s*/, '').trim());
}

function getDifficulty(points: number): 1 | 2 | 3 {
  if (points >= 50) return 3;
  if (points >= 25) return 2;
  return 1;
}

function levelFromXP(xp: number) {
  return Math.floor(xp / 500) + 1;
}

function xpToNextLevel(xp: number) {
  const level = levelFromXP(xp);
  return level * 500;
}

export default function KidHomeScreen() {
  const { colors } = useTheme();
  const familyId = useSessionStore((state) => state.familyId);
  const activeKidId = useModeStore((state) => state.activeKidId);
  const kidsQuery = useKids(familyId);
  const kid = (kidsQuery.data ?? []).find((k) => k.id === activeKidId) ?? null;
  const instancesQuery = useTodaysKidInstances(familyId, activeKidId);
  const completeMutation = useCompleteChoreInstance(familyId, activeKidId);
  const streakQuery = useKidStreak(activeKidId);

  const [localDone, setLocalDone] = useState<Set<string>>(new Set());
  const [toastItem, setToastItem] = useState<ChoreInstance | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const xp = kid?.points_balance ?? 0;
  const level = levelFromXP(xp);
  const xpNext = xpToNextLevel(xp);
  const streak = streakQuery.data?.current_weekly_streak ?? 0;
  const instances = (instancesQuery.data ?? []) as ChoreInstance[];

  const doneCount = instances.filter(
    (i) => i.status === 'completed_unverified' || i.status === 'completed_verified' || localDone.has(i.id),
  ).length;
  const totalCount = instances.length;
  const allDone = totalCount > 0 && doneCount === totalCount;

  const showToast = (item: ChoreInstance) => {
    setToastItem(item);
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastOpacity, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const handleComplete = async (id: string, item: ChoreInstance) => {
    setLocalDone((prev) => new Set([...prev, id]));
    showToast(item);
    await completeMutation.mutateAsync(id);
  };

  const bgStyle = { backgroundColor: colors.bg, flex: 1 };

  return (
    <SafeAreaView style={bgStyle}>
      {/* Completion toast */}
      <Animated.View
        pointerEvents="none"
        style={[styles.toast, { opacity: toastOpacity, backgroundColor: colors.primary }]}
      >
        <Text style={{ fontSize: 28 }}>✅</Text>
        <View style={{ flex: 1 }}>
          <Text style={{ fontWeight: '800', fontSize: 13, color: '#fff' }}>
            {(toastItem?.chores as { title?: string } | null)?.title ?? 'Chore'} — Done!
          </Text>
          <Text style={{ fontSize: 12, color: 'rgba(255,255,255,0.8)' }}>
            +{(toastItem?.chores as { points?: number } | null)?.points ?? 0} XP earned
          </Text>
        </View>
      </Animated.View>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 32 }}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: colors.bgElevated }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
            <View>
              <Text style={[styles.subLabel, { color: colors.textMuted }]}>WELCOME BACK</Text>
              <Text style={[styles.heroName, { color: colors.text }]}>
                {kid?.display_name ?? 'Hero'}{' '}
                <Text style={{ fontSize: 22 }}>{kid?.avatar_emoji ?? '🌟'}</Text>
              </Text>
            </View>
            <View style={{ flexDirection: 'row', gap: 8 }}>
              {/* streak badge */}
              <View style={[styles.badge, { backgroundColor: 'rgba(245,158,11,0.15)', borderColor: 'rgba(245,158,11,0.3)' }]}>
                <Text style={{ fontSize: 15 }}>🔥</Text>
                <Text style={[styles.badgeText, { color: colors.gold }]}>{streak}</Text>
              </View>
              {/* coins badge */}
              <View style={[styles.badge, { backgroundColor: `${colors.primary}1a`, borderColor: `${colors.primary}40` }]}>
                <Text style={{ fontSize: 14 }}>🪙</Text>
                <Text style={[styles.badgeText, { color: colors.primaryLight }]}>{xp}</Text>
              </View>
            </View>
          </View>

          {/* Level + XP card */}
          <View style={[styles.xpCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
                  <Text style={{ fontWeight: '900', fontSize: 14, color: '#fff' }}>{level}</Text>
                </View>
                <View>
                  <Text style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>Level {level} Hero</Text>
                  <Text style={{ fontSize: 11, color: colors.textMuted }}>{xpNext - xp} XP to level {level + 1}</Text>
                </View>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ fontWeight: '900', fontSize: 18, color: allDone ? colors.success : colors.text }}>
                  {doneCount}<Text style={{ fontSize: 13, color: colors.textMuted }}>/{totalCount}</Text>
                </Text>
                <Text style={{ fontSize: 11, color: colors.textMuted }}>today</Text>
              </View>
            </View>
            <XPBar xp={xp} xpToNext={xpNext} animate />
          </View>

          {/* daily progress */}
          <View style={{ marginTop: 14 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontWeight: '700', fontSize: 12, color: colors.text }}>Daily Progress</Text>
              <Text style={{ fontSize: 12, color: allDone ? colors.success : colors.textMuted, fontWeight: '700' }}>
                {allDone ? '🏆 Complete!' : `${doneCount} / ${totalCount} done`}
              </Text>
            </View>
            <View style={{ height: 6, backgroundColor: 'rgba(255,255,255,0.06)', borderRadius: 999, overflow: 'hidden' }}>
              <View
                style={{
                  height: '100%',
                  width: `${totalCount > 0 ? (doneCount / totalCount) * 100 : 0}%`,
                  backgroundColor: allDone ? colors.success : colors.primary,
                  borderRadius: 999,
                }}
              />
            </View>
          </View>
        </View>

        {/* ── Quest list ── */}
        <View style={{ paddingHorizontal: 16, marginTop: 16 }}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>TODAY'S QUESTS</Text>

          {instances.length === 0 ? (
            <View style={[styles.allDoneBox, { backgroundColor: `${colors.success}0d`, borderColor: `${colors.success}30` }]}>
              <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>🏆</Text>
              <Text style={{ fontWeight: '900', fontSize: 18, color: colors.success, textAlign: 'center', marginBottom: 4 }}>
                All Clear!
              </Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
                No quests assigned for today.
              </Text>
            </View>
          ) : (
            instances.map((item) => {
              const chore = item.chores as {
                title?: string;
                points?: number;
                requires_approval?: boolean;
                high_value?: boolean;
                description?: string | null;
              } | null;
              const isDone = item.status === 'completed_unverified' || item.status === 'completed_verified' || localDone.has(item.id);
              const isPending = item.status === 'pending' && !localDone.has(item.id);
              const pts = chore?.points ?? 0;
              return (
                <QuestCard
                  key={item.id}
                  title={chore?.title ?? 'Chore'}
                  type={getQuestType(chore)}
                  xp={pts}
                  coins={coinReward(pts)}
                  difficulty={getDifficulty(pts)}
                  done={isDone}
                  requiresApproval={chore?.requires_approval}
                  steps={stepsFromDescription(chore?.description == null ? undefined : chore.description)}
                  kidMode
                  onComplete={isPending ? () => handleComplete(item.id, item) : undefined}
                />
              );
            })
          )}

          {allDone && (
            <View style={[styles.allDoneBox, { backgroundColor: `${colors.success}0d`, borderColor: `${colors.success}30` }]}>
              <Text style={{ fontSize: 48, textAlign: 'center', marginBottom: 8 }}>🏆</Text>
              <Text style={{ fontWeight: '900', fontSize: 18, color: colors.success, textAlign: 'center', marginBottom: 4 }}>
                All Clear!
              </Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, textAlign: 'center' }}>
                You absolutely crushed it today.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: 20,
    paddingTop: 22,
    paddingBottom: 20,
  },
  subLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  heroName: {
    fontWeight: '900',
    fontSize: 26,
    lineHeight: 32,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeText: {
    fontWeight: '900',
    fontSize: 15,
  },
  xpCard: {
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
  },
  levelBadge: {
    width: 36,
    height: 36,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionLabel: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 10,
  },
  allDoneBox: {
    padding: 28,
    borderRadius: 18,
    borderWidth: 1,
    marginTop: 4,
  },
  toast: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 100,
    borderRadius: 16,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
