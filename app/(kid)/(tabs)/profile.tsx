import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useKids } from '@/features/kids';
import { useKidStreak } from '@/features/points';
import { XPBar } from '@/shared/components';
import { Text } from '@/shared/components/Text';
import { useTheme } from '@/shared/hooks';
import { useModeStore } from '@/stores/modeStore';
import { useSessionStore } from '@/stores/sessionStore';

function levelFromXP(xp: number) {
  return Math.floor(xp / 500) + 1;
}

function xpToNextLevel(xp: number) {
  return levelFromXP(xp) * 500;
}

const BADGE_UNLOCKS = [
  { icon: '🔥', label: 'Hot Streak', unlockAt: 5 },
  { icon: '⭐', label: 'Star Hero', unlockAt: 10 },
  { icon: '🏆', label: 'Champion', unlockAt: 25 },
  { icon: '💎', label: 'Diamond', unlockAt: 50 },
  { icon: '🎯', label: 'Bullseye', unlockAt: 100 },
];

export default function KidProfileScreen() {
  const { colors } = useTheme();
  const familyId = useSessionStore((state) => state.familyId);
  const activeKidId = useModeStore((state) => state.activeKidId);
  const kidsQuery = useKids(familyId);
  const kid = (kidsQuery.data ?? []).find((k) => k.id === activeKidId) ?? null;
  const streakQuery = useKidStreak(activeKidId);

  const xp = kid?.points_balance ?? 0;
  const level = levelFromXP(xp);
  const xpNext = xpToNextLevel(xp);
  const streak = streakQuery.data?.current_weekly_streak ?? 0;

  const earnedBadges = BADGE_UNLOCKS.filter((b) => streak >= b.unlockAt || xp >= b.unlockAt * 100);
  const lockedBadges = BADGE_UNLOCKS.filter((b) => !(streak >= b.unlockAt || xp >= b.unlockAt * 100));

  const questsDoneEstimate = Math.min(999, Math.max(0, Math.floor(xp / 20)));
  const stats = [
    { label: 'Day Streak', value: streak, icon: '🔥' },
    { label: 'Quests Done', value: questsDoneEstimate, icon: '⚔️' },
    { label: 'Coins', value: xp.toLocaleString(), icon: '🪙' },
    { label: 'Badges', value: earnedBadges.length, icon: '🏅' },
  ];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Hero section */}
        <View
          style={[
            styles.heroSection,
            { backgroundColor: colors.bgElevated },
          ]}
        >
          {/* Avatar */}
          <View
            style={[
              styles.avatarRing,
              {
                backgroundColor: colors.primary,
                shadowColor: colors.primary,
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.6,
                shadowRadius: 20,
                elevation: 12,
              },
            ]}
          >
            <Text style={{ fontSize: 52 }}>{kid?.avatar_emoji ?? '🌟'}</Text>
            {/* Level badge */}
            <View
              style={[
                styles.levelOverlay,
                {
                  backgroundColor: colors.gold,
                  borderColor: colors.bg,
                  shadowColor: colors.gold,
                  shadowOpacity: 0.5,
                  shadowRadius: 8,
                  elevation: 6,
                },
              ]}
            >
              <Text style={{ fontWeight: '900', fontSize: 13, color: '#000' }}>{level}</Text>
            </View>
          </View>

          <Text style={[styles.kidName, { color: colors.text }]}>
            {kid?.display_name ?? 'Hero'}
          </Text>
          <View
            style={[
              styles.rankPill,
              { backgroundColor: `${colors.primary}1a`, borderColor: `${colors.primary}40` },
            ]}
          >
            <Text style={{ fontWeight: '700', fontSize: 12, color: colors.primaryLight }}>
              Hero Rank · Level {level}
            </Text>
          </View>

          {/* XP card */}
          <View
            style={[
              styles.xpCard,
              { backgroundColor: colors.bgCard, borderColor: colors.border },
            ]}
          >
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
              <Text style={{ fontWeight: '700', fontSize: 13, color: colors.text }}>
                Level {level + 1} Progress
              </Text>
              <Text style={{ fontSize: 12, color: colors.textMuted }}>
                {(xpNext - xp).toLocaleString()} XP to go
              </Text>
            </View>
            <XPBar xp={xp} xpToNext={xpNext} animate />
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Preview level up ceremony"
              onPress={() =>
                Alert.alert('Level up!', 'Full ceremony animation can ship in a future build. Keep completing quests!')
              }
              style={{
                marginTop: 14,
                paddingVertical: 12,
                borderRadius: 14,
                borderWidth: 1,
                borderStyle: 'dashed',
                borderColor: colors.borderStrong,
                alignItems: 'center',
              }}
            >
              <Text style={{ fontWeight: '800', fontSize: 13, color: colors.primaryLight }}>✨ Preview level up ceremony</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stats + Badges */}
        <View style={{ padding: 16 }}>
          {/* Stats grid */}
          <View style={styles.statsGrid}>
            {stats.map((s) => (
              <View
                key={s.label}
                style={[
                  styles.statCard,
                  { backgroundColor: colors.bgCard, borderColor: colors.border },
                ]}
              >
                <Text style={{ fontSize: 26, marginBottom: 7 }}>{s.icon}</Text>
                <Text style={{ fontWeight: '900', fontSize: 24, color: colors.text }}>
                  {s.value}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textMuted }}>{s.label}</Text>
              </View>
            ))}
          </View>

          {/* Badges */}
          <Text style={[styles.sectionTitle, { color: colors.text }]}>🏅 Badge Collection</Text>
          <View style={styles.badgesRow}>
            {earnedBadges.map((b) => (
              <View
                key={b.label}
                style={[
                  styles.badgeSlot,
                  {
                    backgroundColor: colors.bgCard,
                    borderColor: colors.border,
                    shadowColor: colors.primary,
                    shadowOpacity: 0.35,
                    shadowRadius: 8,
                    elevation: 4,
                  },
                ]}
              >
                <Text style={{ fontSize: 28 }}>{b.icon}</Text>
              </View>
            ))}
            {lockedBadges.map((b) => (
              <View
                key={b.label}
                style={[
                  styles.badgeSlot,
                  {
                    backgroundColor: 'rgba(255,255,255,0.02)',
                    borderColor: 'rgba(255,255,255,0.08)',
                    borderStyle: 'dashed',
                    opacity: 0.35,
                  },
                ]}
              >
                <Text style={{ fontSize: 22 }}>🔒</Text>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    padding: 32,
    paddingTop: 36,
    alignItems: 'center',
  },
  avatarRing: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    position: 'relative',
  },
  levelOverlay: {
    position: 'absolute',
    bottom: -5,
    right: -5,
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2.5,
  },
  kidName: {
    fontWeight: '900',
    fontSize: 26,
    marginBottom: 6,
  },
  rankPill: {
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    marginBottom: 24,
  },
  xpCard: {
    width: '100%',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 22,
  },
  statCard: {
    width: '47%',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
  },
  sectionTitle: {
    fontWeight: '800',
    fontSize: 14,
    marginBottom: 14,
  },
  badgesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 24,
  },
  badgeSlot: {
    width: 56,
    height: 56,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});
