import { useRouter } from 'expo-router';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/features/auth';
import { useApproveChoreInstance, useTodaysFamilyInstances } from '@/features/chore-instances';
import { useFamily } from '@/features/families';
import { useKids } from '@/features/kids';
import { useStreaks } from '@/features/points';
import { Button } from '@/shared/components/Button';
import { Text } from '@/shared/components/Text';
import { useTheme } from '@/shared/hooks';
import { useModeStore } from '@/stores/modeStore';
import { useSessionStore } from '@/stores/sessionStore';

function levelFromXP(xp: number) {
  return Math.floor(xp / 500) + 1;
}

export default function ParentDashboard() {
  const router = useRouter();
  const { colors } = useTheme();
  const familyId = useSessionStore((state) => state.familyId);
  const setActiveKid = useModeStore((state) => state.setActiveKid);
  const setMode = useModeStore((state) => state.setMode);
  const { user } = useSession();
  const familyQuery = useFamily();
  const kidsQuery = useKids(familyId);
  const instancesQuery = useTodaysFamilyInstances(familyId);
  const approveMutation = useApproveChoreInstance(familyId);

  const firstName =
    (typeof user?.user_metadata?.full_name === 'string'
      ? user.user_metadata.full_name.split(' ')[0]
      : undefined) ??
    user?.email?.split('@')[0] ??
    'there';

  const kids = kidsQuery.data ?? [];
  const allInstances = instancesQuery.data ?? [];
  const streaksQuery = useStreaks(kids.map((k) => k.id));

  const totalQuests = allInstances.length;
  const totalDone = allInstances.filter(
    (i) => i.status === 'completed_verified' || i.status === 'completed_unverified',
  ).length;
  const pendingApprovals = allInstances.filter((i) => i.status === 'completed_unverified');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* ── Header ── */}
        <View style={[styles.header, { backgroundColor: colors.bgElevated }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.dateLabel, { color: colors.textMuted }]}>
                {new Date()
                  .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
                  .toUpperCase()}
              </Text>
              <Text style={[styles.familyTitle, { color: colors.text }]}>
                {familyQuery.data?.name ?? `${firstName}'s Family`} 🏡
              </Text>
            </View>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: colors.borderStrong,
                backgroundColor: colors.bgCard,
              }}
            >
              <Text style={{ fontSize: 16 }}>🛡️</Text>
              <Text style={{ fontWeight: '800', fontSize: 12, color: colors.primaryLight }}>Parent</Text>
            </View>
          </View>

          {/* Quick stats row */}
          <View style={styles.statsRow}>
            {[
              { label: 'Quests Today', value: totalQuests, icon: '⚔️', hi: false },
              { label: 'Completed', value: totalDone, icon: '✅', hi: false },
              { label: 'Need Approval', value: pendingApprovals.length, icon: '⏳', hi: pendingApprovals.length > 0 },
            ].map((s) => (
              <View
                key={s.label}
                style={[
                  styles.statCard,
                  {
                    backgroundColor: s.hi ? `${colors.primary}1a` : colors.bgCard,
                    borderColor: s.hi ? `${colors.primary}55` : colors.border,
                  },
                ]}
              >
                <Text style={{ fontSize: 22, marginBottom: 5 }}>{s.icon}</Text>
                <Text style={{ fontWeight: '900', fontSize: 22, color: s.hi ? colors.primary : colors.text }}>
                  {s.value}
                </Text>
                <Text style={{ fontSize: 10, color: colors.textMuted, lineHeight: 14 }}>{s.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={{ padding: 16 }}>
          {/* ── No family yet ── */}
          {!familyId && (
            <View
              style={[
                styles.setupCard,
                { backgroundColor: `${colors.primary}1a`, borderColor: `${colors.primary}55` },
              ]}
            >
              <Text style={{ fontWeight: '800', fontSize: 16, color: colors.text, marginBottom: 6 }}>
                Set up your family
              </Text>
              <Text style={{ fontSize: 14, color: colors.textMuted, marginBottom: 14, lineHeight: 20 }}>
                Create a family name and parent PIN to get started with quests and rewards.
              </Text>
              <Button
                accessibilityLabel="Create your family"
                label="Create family →"
                fullWidth
                onPress={() => router.push('/(parent)/onboarding/create-family')}
              />
            </View>
          )}

          {/* ── Pending Approvals ── */}
          {pendingApprovals.length > 0 && (
            <>
              <Text style={[styles.sectionLabel, { color: colors.text }]}>⏳ Needs Your Approval</Text>
              {pendingApprovals.map((item) => {
                const title = (item.chores as { title?: string } | null)?.title ?? 'Chore';
                const points = (item.chores as { points?: number } | null)?.points ?? 0;
                const kidName = (item.kids as { display_name?: string } | null)?.display_name ?? 'Kid';
                const kidEmoji = (item.kids as { avatar_emoji?: string } | null)?.avatar_emoji ?? '🙂';
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.approvalCard,
                      { backgroundColor: `${colors.gold}0d`, borderColor: `${colors.gold}35` },
                    ]}
                  >
                    <Text style={{ fontSize: 28, flexShrink: 0 }}>{kidEmoji}</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', fontSize: 13, color: colors.text }}>{title}</Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        {kidName} · <Text style={{ color: colors.primaryLight }}>+{points} XP</Text>
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', gap: 7 }}>
                      <TouchableOpacity
                        onPress={() => approveMutation.mutate(item.id)}
                        style={[
                          styles.approveBtn,
                          { backgroundColor: `${colors.success}22`, borderColor: `${colors.success}55` },
                        ]}
                      >
                        <Text style={{ fontWeight: '800', fontSize: 12, color: colors.success }}>✓ Yes</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[
                          styles.approveBtn,
                          { backgroundColor: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.1)' },
                        ]}
                      >
                        <Text style={{ fontWeight: '800', fontSize: 12, color: colors.textMuted }}>✗</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </>
          )}

          {/* ── Kids Overview ── */}
          <Text style={[styles.sectionLabel, { color: colors.text, marginTop: pendingApprovals.length ? 8 : 0 }]}>
            👨‍👩‍👧‍👦 Kids Overview
          </Text>

          {kids.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.bgCard, borderColor: colors.border }]}>
              <Text style={{ fontSize: 36, textAlign: 'center', marginBottom: 8 }}>👧</Text>
              <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text, textAlign: 'center', marginBottom: 4 }}>
                No heroes yet
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center', marginBottom: 16 }}>
                Add a kid profile to assign quests and track their progress.
              </Text>
              <Button
                accessibilityLabel="Add a kid"
                label="Add a hero"
                fullWidth
                onPress={() => router.push('/(parent)/onboarding/add-kid')}
              />
            </View>
          ) : (
            kids.map((kid) => {
              const kidInstances = allInstances.filter((i) => i.kid_id === kid.id);
              const done = kidInstances.filter(
                (i) => i.status === 'completed_verified' || i.status === 'completed_unverified',
              ).length;
              const total = kidInstances.length;
              const allDone = total > 0 && done === total;
              const xp = kid.points_balance;
              const level = levelFromXP(xp);
              const kidStreak = (streaksQuery.data ?? []).find((s) => s.kid_id === kid.id)?.current_weekly_streak ?? 0;

              return (
                <TouchableOpacity
                  key={kid.id}
                  style={[
                    styles.kidCard,
                    { backgroundColor: colors.bgCard, borderColor: colors.border },
                  ]}
                  activeOpacity={0.8}
                  onPress={async () => {
                    setActiveKid(kid.id);
                    await setMode('kid');
                    router.replace('/(kid)/(tabs)');
                  }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 12 }}>
                    {/* avatar */}
                    <View
                      style={[
                        styles.kidAvatar,
                        {
                          backgroundColor: colors.primary,
                          shadowColor: colors.primary,
                          shadowOpacity: 0.4,
                          shadowRadius: 8,
                          elevation: 4,
                        },
                      ]}
                    >
                      <Text style={{ fontSize: 30 }}>{kid.avatar_emoji ?? '🙂'}</Text>
                      <View
                        style={[
                          styles.levelBubble,
                          { backgroundColor: colors.gold, borderColor: colors.bg },
                        ]}
                      >
                        <Text style={{ fontWeight: '900', fontSize: 11, color: '#000' }}>{level}</Text>
                      </View>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '800', fontSize: 17, color: colors.text }}>
                        {kid.display_name}
                      </Text>
                      <Text style={{ fontSize: 12, color: colors.textMuted }}>
                        Lvl {level} · 🔥 {kidStreak} streak · 🪙 {xp.toLocaleString()}
                      </Text>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text
                        style={{
                          fontWeight: '900',
                          fontSize: 20,
                          color: allDone ? colors.success : colors.text,
                        }}
                      >
                        {done}
                        <Text style={{ fontSize: 14, color: colors.textMuted }}>/{total}</Text>
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textMuted }}>done</Text>
                    </View>
                  </View>
                  {/* progress bar */}
                  <View
                    style={{
                      height: 5,
                      backgroundColor: 'rgba(255,255,255,0.06)',
                      borderRadius: 999,
                      overflow: 'hidden',
                    }}
                  >
                    <View
                      style={{
                        height: '100%',
                        width: `${total > 0 ? (done / total) * 100 : 0}%`,
                        backgroundColor: allDone ? colors.success : colors.primary,
                        borderRadius: 999,
                      }}
                    />
                  </View>
                  <Text
                    style={{
                      marginTop: 10,
                      fontSize: 12,
                      fontWeight: '800',
                      color: colors.primaryLight,
                      textAlign: 'right',
                    }}
                  >
                    → Enter kid mode
                  </Text>
                </TouchableOpacity>
              );
            })
          )}

          {/* Add hero CTA */}
          {kids.length > 0 && (
            <TouchableOpacity
              style={[
                styles.addKidCta,
                { borderColor: colors.border },
              ]}
              onPress={() => router.push('/(parent)/onboarding/add-kid')}
            >
              <Text style={{ fontSize: 22 }}>➕</Text>
              <Text style={{ fontWeight: '700', fontSize: 14, color: colors.textMuted }}>
                Add Another Hero
              </Text>
            </TouchableOpacity>
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
  },
  dateLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1.0,
    marginBottom: 4,
  },
  familyTitle: {
    fontWeight: '900',
    fontSize: 26,
    marginBottom: 20,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
  },
  sectionLabel: {
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.4,
    marginBottom: 10,
  },
  approvalCard: {
    borderRadius: 16,
    padding: 13,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
  },
  approveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  kidCard: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
  },
  kidAvatar: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  levelBubble: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 22,
    height: 22,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  emptyCard: {
    borderRadius: 18,
    padding: 24,
    borderWidth: 1,
    marginBottom: 12,
  },
  setupCard: {
    borderRadius: 18,
    padding: 20,
    borderWidth: 1,
    marginBottom: 20,
  },
  addKidCta: {
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 8,
  },
});
