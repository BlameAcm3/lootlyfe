import { useCallback, useRef, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { GoldCounter, LootCard } from '../../components/game';
import { Button, Card, Modal } from '../../components/ui';
import { useCurrentAdventurer } from '../../hooks/useCurrentAdventurer';
import { useLexicon } from '../../hooks/useLexicon';
import { useTheme } from '../../hooks/useTheme';
import { averageGoldReward, questsAwayFromLoot } from '../../lib/game-math';
import { ROUTES } from '../../lib/routes';
import { playPackSound } from '../../lib/sounds';
import {
  isSoldOut,
  useLootItems,
  useRedeemLoot,
  type LootItemRow,
} from '../../queries/lootQueries';
import { useAdventurerQuests } from '../../queries/questsQueries';

/**
 * Adventurer loot shop (feature 20): browse the guild's themed rewards and
 * redeem with gold. Affordability is shown here (motivating, never shaming);
 * the gold-hold and balance check are enforced entirely in the DB.
 */
export default function LootShopScreen() {
  const router = useRouter();
  const { t } = useLexicon();
  const { pack } = useTheme();
  const { adventurerId, adventurer } = useCurrentAdventurer();

  const itemsQuery = useLootItems(adventurer?.guild_id);
  const questsQuery = useAdventurerQuests(adventurerId);
  const redeemMutation = useRedeemLoot(adventurerId);

  const [confirming, setConfirming] = useState<LootItemRow | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showMessage = useCallback((text: string) => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setMessage(text);
    messageTimer.current = setTimeout(() => setMessage(null), 4000);
  }, []);

  if (!adventurer) return null;

  const balance = adventurer.gold_balance;
  const items = itemsQuery.data ?? [];
  const avgReward = averageGoldReward(questsQuery.data ?? []);

  const insufficientCopy = (cost: number): string => {
    const away = questsAwayFromLoot(cost, balance, avgReward);
    return away && away > 0
      ? t('insufficient_gold_quests', { count: away })
      : t('insufficient_gold_generic');
  };

  const handlePress = (item: LootItemRow) => {
    if (isSoldOut(item)) return;
    if (balance < item.gold_cost) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      showMessage(`${t('insufficient_gold_title')} ${insufficientCopy(item.gold_cost)}`);
      return;
    }
    setConfirming(item);
  };

  const confirmRedeem = async () => {
    if (!confirming) return;
    const item = confirming;
    setConfirming(null);
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    const outcome = await redeemMutation.mutateAsync(item);
    if (outcome === 'redeemed') {
      playPackSound(pack, 'loot_redeem');
      showMessage(t('redeem_success_body'));
    } else if (outcome === 'insufficient_gold') {
      showMessage(`${t('insufficient_gold_title')} ${insufficientCopy(item.gold_cost)}`);
    } else if (outcome === 'sold_out') {
      showMessage(t('redeem_sold_out_body'));
    } else {
      showMessage(t('redeem_error_body'));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
        {/* Header */}
        <View className="flex-row items-center gap-3 pt-2">
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('cancel_action')}
            onPress={() => router.back()}
            className="bg-surface h-10 w-10 items-center justify-center rounded-full"
          >
            <Text className="text-text-primary text-xl font-black">‹</Text>
          </Pressable>
          <View className="flex-1">
            <Text className="text-text-primary text-2xl font-black">{t('loot_shop_title')}</Text>
            <Text className="text-text-muted text-xs font-semibold">{t('loot_shop_subtitle')}</Text>
          </View>
        </View>

        {/* Balance + history link */}
        <View className="flex-row items-center gap-2.5">
          <View className="flex-1">
            <GoldCounter amount={balance} />
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('loot_history_link')}
            onPress={() => router.push(ROUTES.adventurerRedemptions)}
            className="bg-surface border-border flex-row items-center gap-1.5 rounded-2xl border px-4 py-3"
          >
            <Text className="text-lg">🎁</Text>
            <Text className="text-text-primary text-xs font-extrabold">
              {t('loot_history_link')}
            </Text>
          </Pressable>
        </View>

        {message ? (
          <Card raised className="border-accent-loot border p-3">
            <Text className="text-text-primary text-sm font-semibold">{message}</Text>
          </Card>
        ) : null}

        {/* Shop grid */}
        {items.length === 0 ? (
          <Card className="items-center gap-2 p-8">
            <Text className="text-5xl">🪙</Text>
            <Text className="text-text-primary text-base font-extrabold">
              {t('empty_loot_title')}
            </Text>
            <Text className="text-text-muted text-center text-sm">{t('empty_loot_body')}</Text>
          </Card>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {items.map((item) => {
              const soldOut = isSoldOut(item);
              const affordable = balance >= item.gold_cost;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={item.name}
                  disabled={soldOut || redeemMutation.isPending}
                  onPress={() => handlePress(item)}
                  className="mb-3 w-[48.5%]"
                  style={soldOut || !affordable ? { opacity: 0.55 } : undefined}
                >
                  <LootCard
                    emoji={soldOut ? '🚫' : '🎁'}
                    name={item.name}
                    description={item.description ?? undefined}
                    goldCost={item.gold_cost}
                    stock={item.stock}
                  />
                  {soldOut ? (
                    <View className="bg-text-muted absolute left-2.5 top-2.5 rounded-full px-2 py-0.5">
                      <Text className="text-text-inverse text-[9px] font-black uppercase">
                        {t('sold_out_label')}
                      </Text>
                    </View>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>

      <Modal visible={confirming !== null} onClose={() => setConfirming(null)}>
        <View className="gap-3">
          <Text className="text-text-primary text-lg font-extrabold">
            {t('redeem_confirm_title')}
          </Text>
          <Text className="text-text-muted text-sm leading-5">
            {t('redeem_confirm_body', {
              cost: confirming?.gold_cost ?? 0,
              name: confirming?.name ?? '',
            })}
          </Text>
          <Button
            label={t('redeem_confirm_action')}
            variant="gold"
            disabled={redeemMutation.isPending}
            onPress={() => void confirmRedeem()}
          />
          <Button label={t('cancel_action')} variant="ghost" onPress={() => setConfirming(null)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
