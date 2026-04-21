import { useState } from 'react';
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useKids } from '@/features/kids';
import { useRedeemReward, useRedemptions } from '@/features/redemptions';
import { useRewards } from '@/features/rewards';
import { Text } from '@/shared/components/Text';
import { useTheme } from '@/shared/hooks';
import { useModeStore } from '@/stores/modeStore';
import { useSessionStore } from '@/stores/sessionStore';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'experience', label: 'Experiences' },
  { id: 'stuff', label: 'Stuff' },
  { id: 'special', label: 'Special' },
] as const;

type FilterId = (typeof FILTERS)[number]['id'];

function rewardCategory(title: string, description: string | null): Exclude<FilterId, 'all'> {
  const t = `${title} ${description ?? ''}`.toLowerCase();
  if (/screen|movie|night|outing|park|zoo|trip|experience|beach/.test(t)) return 'experience';
  if (/game|ice cream|toy|stuff|book|shirt|controller|credit/.test(t)) return 'stuff';
  return 'special';
}

function levelFromXP(xp: number) {
  return Math.floor(xp / 500) + 1;
}

export default function KidShopScreen() {
  const { colors } = useTheme();
  const familyId = useSessionStore((state) => state.familyId);
  const activeKidId = useModeStore((state) => state.activeKidId);
  const kidsQuery = useKids(familyId);
  const kid = (kidsQuery.data ?? []).find((k) => k.id === activeKidId) ?? null;
  const rewardsQuery = useRewards(familyId);
  const redeemMutation = useRedeemReward(familyId);
  const redemptionsQuery = useRedemptions(familyId);

  const [filter, setFilter] = useState<FilterId>('all');
  const [pendingId, setPendingId] = useState<string | null>(null);

  const coins = kid?.points_balance ?? 0;
  const xp = kid?.points_balance ?? 0;
  const level = levelFromXP(xp);

  const pendingRedemptionIds = new Set(
    (redemptionsQuery.data ?? [])
      .filter((r) => r.status === 'requested')
      .map((r) => r.reward_id),
  );

  const rewards = rewardsQuery.data ?? [];
  const filtered =
    filter === 'all'
      ? rewards
      : rewards.filter((r) => rewardCategory(r.title, r.description ?? null) === filter);

  const handleRedeem = async (rewardId: string, cost: number) => {
    if (!activeKidId || coins < cost) return;
    setPendingId(rewardId);
    await redeemMutation.mutateAsync({ rewardId, kidId: activeKidId, cost });
    setPendingId(null);
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 32 }}>
        {/* Header */}
        <View style={[styles.header, { backgroundColor: colors.bgElevated }]}>
          <Text style={[styles.title, { color: colors.text }]}>Loot Shop 🛒</Text>
          <Text style={{ fontSize: 13, color: colors.textMuted, marginBottom: 14 }}>
            Spend your hard-earned rewards
          </Text>

          {/* Balances */}
          <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
            <View style={[styles.balancePill, { backgroundColor: colors.gold }]}>
              <Text style={{ fontWeight: '900', fontSize: 15, color: '#000' }}>🪙 {coins}</Text>
            </View>
            <View style={[styles.balancePill, { backgroundColor: `${colors.primary}1a`, borderWidth: 1, borderColor: `${colors.primary}40` }]}>
              <Text style={{ fontWeight: '700', fontSize: 14, color: colors.primaryLight }}>⚡ {xp.toLocaleString()} XP</Text>
            </View>
          </View>

          {/* Filter pills */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: 'row', gap: 8, paddingBottom: 2 }}>
              {FILTERS.map((f) => (
                <TouchableOpacity
                  key={f.id}
                  onPress={() => setFilter(f.id)}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: filter === f.id ? colors.primary : 'rgba(255,255,255,0.07)',
                      borderColor: filter === f.id ? colors.primary : 'transparent',
                    },
                  ]}
                >
                  <Text style={{ fontSize: 11, fontWeight: '700', color: filter === f.id ? '#fff' : colors.textMuted, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                    {f.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={{ padding: 16 }}>
          {filtered.length === 0 ? (
            <View style={[styles.emptyBox, { borderColor: colors.border }]}>
              <Text style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>🎁</Text>
              <Text style={{ fontSize: 15, fontWeight: '700', color: colors.text, textAlign: 'center', marginBottom: 4 }}>
                No rewards yet
              </Text>
              <Text style={{ fontSize: 13, color: colors.textMuted, textAlign: 'center' }}>
                Ask your parent to add rewards in parent mode.
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {filtered.map((reward) => {
                const canAfford = coins >= reward.cost_points;
                const isPending = pendingRedemptionIds.has(reward.id);
                const isLoading = pendingId === reward.id;

                const stock = reward.stock;
                const stockLeft = stock != null && stock > 0 ? stock : null;

                return (
                  <View
                    key={reward.id}
                    style={[
                      styles.rewardCard,
                      {
                        backgroundColor: isPending ? `${colors.success}10` : colors.bgCard,
                        borderColor: isPending
                          ? `${colors.success}44`
                          : canAfford
                          ? colors.border
                          : 'rgba(255,255,255,0.05)',
                        opacity: !canAfford && !isPending ? 0.65 : 1,
                      },
                    ]}
                  >
                    {stockLeft != null ? (
                      <View
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          backgroundColor: colors.gold,
                          paddingHorizontal: 6,
                          paddingVertical: 2,
                          borderRadius: 6,
                          zIndex: 2,
                        }}
                      >
                        <Text style={{ fontSize: 9, fontWeight: '900', color: '#000' }}>{stockLeft} LEFT</Text>
                      </View>
                    ) : null}
                    <Text style={{ fontSize: 40, marginBottom: 8 }}>
                      {reward.icon_emoji ?? '🎁'}
                    </Text>
                    <Text style={{ fontWeight: '800', fontSize: 14, color: colors.text, textAlign: 'center', lineHeight: 18, marginBottom: 4 }}>
                      {reward.title}
                    </Text>
                    {reward.description ? (
                      <Text style={{ fontSize: 11, color: colors.textMuted, textAlign: 'center', marginBottom: 8 }}>
                        {reward.description}
                      </Text>
                    ) : (
                      <View style={{ height: 4 }} />
                    )}
                    <TouchableOpacity
                      onPress={() => handleRedeem(reward.id, reward.cost_points)}
                      disabled={!canAfford || isPending || isLoading}
                      style={[
                        styles.redeemBtn,
                        {
                          backgroundColor: isPending
                            ? `${colors.success}22`
                            : isLoading
                            ? colors.bgElevated
                            : canAfford
                            ? colors.primary
                            : 'rgba(255,255,255,0.06)',
                        },
                      ]}
                    >
                      <Text
                        style={{
                          fontWeight: '800',
                          fontSize: 12,
                          color: isPending ? colors.success : canAfford ? '#fff' : colors.textDim,
                        }}
                      >
                        {isPending
                          ? '✅ Requested'
                          : isLoading
                          ? '⏳'
                          : !canAfford
                          ? `🔒 ${reward.cost_points}🪙`
                          : `🪙 ${reward.cost_points}`}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* XP Cosmetics shelf — decorative, future feature */}
          <View style={{ marginTop: 8 }}>
            <Text style={{ fontWeight: '800', fontSize: 14, color: colors.text }}>⚡ XP Unlocks</Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 2, marginBottom: 12 }}>
              Avatar cosmetics — spend XP, keep forever
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {[
                  { icon: '🐉', title: 'Dragon Frame', xpCost: 500, unlocked: level >= 2 },
                  { icon: '👑', title: 'Star Crown', xpCost: 1000, unlocked: level >= 3 },
                  { icon: '🔥', title: 'Fire Trail', xpCost: 750, unlocked: level >= 2 },
                  { icon: '🦇', title: 'Shadow Cape', xpCost: 1500, unlocked: level >= 4 },
                ].map((item) => (
                  <View
                    key={item.title}
                    style={[
                      styles.cosmeticCard,
                      {
                        backgroundColor: item.unlocked ? `${colors.primary}15` : colors.bgCard,
                        borderColor: item.unlocked ? `${colors.primary}44` : 'rgba(255,255,255,0.06)',
                        opacity: !item.unlocked && xp < item.xpCost ? 0.55 : 1,
                      },
                    ]}
                  >
                    <Text style={{ fontSize: 30, marginBottom: 6, filter: undefined }}>
                      {item.icon}
                    </Text>
                    <Text style={{ fontWeight: '800', fontSize: 11, color: colors.text, textAlign: 'center' }}>
                      {item.title}
                    </Text>
                    <Text
                      style={{
                        fontWeight: '700',
                        fontSize: 10,
                        color: item.unlocked ? colors.success : xp >= item.xpCost ? colors.primaryLight : colors.textDim,
                        marginTop: 4,
                      }}
                    >
                      {item.unlocked ? '✓ Owned' : `${item.xpCost} XP`}
                    </Text>
                  </View>
                ))}
              </View>
            </ScrollView>
          </View>
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
  title: {
    fontWeight: '900',
    fontSize: 24,
    marginBottom: 4,
  },
  balancePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 999,
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  rewardCard: {
    width: '47%',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    gap: 0,
    position: 'relative',
  },
  redeemBtn: {
    width: '100%',
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 4,
  },
  emptyBox: {
    padding: 32,
    borderRadius: 18,
    borderWidth: 1,
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  cosmeticCard: {
    width: 90,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1,
  },
});
