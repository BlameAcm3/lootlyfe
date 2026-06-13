import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LootCard } from '../../../components/game';
import { Badge, Button, Card, Modal, SectionHeader } from '../../../components/ui';
import { PRESET_LOOT } from '../../../data/presetLoot';
import { useLexicon } from '../../../hooks/useLexicon';
import { useCurrentGuild } from '../../../queries/guildQueries';
import { useSubscription } from '@/features/subscriptions';
import {
  isSoldOut,
  useGuildRedemptions,
  useGuildWishlist,
  useLootItems,
} from '../../../queries/lootQueries';
import { useState } from 'react';

/**
 * NPC loot library (feature 19): manage the guild's real-world rewards, jump
 * to the fulfillment queue and Loot List reviews, and stock more from presets.
 */
export default function LootTabScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const { guild } = useCurrentGuild();
  const { checkLimit, lockedIdsFor, openPaywall, limits } = useSubscription();
  const itemsQuery = useLootItems(guild?.id);
  const redemptionsQuery = useGuildRedemptions(guild?.id);
  const wishlistQuery = useGuildWishlist(guild?.id);
  const [limitNudge, setLimitNudge] = useState(false);

  if (!guild) return null;

  const items = itemsQuery.data ?? [];
  const pendingRedemptions = (redemptionsQuery.data ?? []).filter((r) => r.status === 'pending');
  const proposedWishes = (wishlistQuery.data ?? []).filter((w) => w.status === 'proposed');
  // Downgrade matrix: newest loot beyond the free limit is read-only on a
  // lapsed guild (shown locked here; NPC approval still gates kid redemption).
  const lockedLootIds = lockedIdsFor('custom_loot', items);

  const handleNew = () => {
    // Client check is UX; the BEFORE INSERT trigger (migration 017) is the law.
    if (!checkLimit('custom_loot', items.length).allowed) {
      setLimitNudge(true);
      return;
    }
    router.push('/(parent)/loot/new');
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="flex-row items-center justify-between pt-2">
          <Text className="text-text-primary text-3xl font-black">{t('loot_manage_title')}</Text>
          <Button label={`+ ${t('loot_new_action')}`} size="sm" onPress={handleNew} />
        </View>
        <Text className="text-text-muted text-sm leading-5">{t('loot_manage_subtitle')}</Text>

        {/* Queues */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('fulfillment_title')}
          onPress={() => router.push('/(parent)/fulfillment')}
        >
          <Card className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Text className="text-2xl">🎁</Text>
              <Text className="text-text-primary text-sm font-extrabold">
                {t('fulfillment_title')}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {pendingRedemptions.length > 0 ? (
                <Badge label={String(pendingRedemptions.length)} tone="achievement" />
              ) : null}
              <Text className="text-text-muted text-xl">›</Text>
            </View>
          </Card>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={t('wishlist_review_title')}
          onPress={() => router.push('/(parent)/wishlist')}
        >
          <Card className="flex-row items-center justify-between">
            <View className="flex-row items-center gap-3">
              <Text className="text-2xl">⭐</Text>
              <Text className="text-text-primary text-sm font-extrabold">
                {t('wishlist_review_title')}
              </Text>
            </View>
            <View className="flex-row items-center gap-2">
              {proposedWishes.length > 0 ? (
                <Badge label={String(proposedWishes.length)} tone="info" />
              ) : null}
              <Text className="text-text-muted text-xl">›</Text>
            </View>
          </Card>
        </Pressable>

        {/* Custom rewards */}
        <SectionHeader title={t('loot_custom_section')} />
        {items.length === 0 ? (
          <Card className="items-center gap-2 p-6">
            <Text className="text-3xl">⚒️</Text>
            <Text className="text-text-muted text-center text-sm leading-5">
              {t('loot_custom_empty_body')}
            </Text>
          </Card>
        ) : (
          <View className="flex-row flex-wrap justify-between">
            {items.map((item) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={item.name}
                onPress={() =>
                  router.push({ pathname: '/(parent)/loot/[id]', params: { id: item.id } })
                }
                className="mb-3 w-[48.5%]"
                style={isSoldOut(item) || lockedLootIds.has(item.id) ? { opacity: 0.55 } : undefined}
              >
                <LootCard
                  emoji={lockedLootIds.has(item.id) ? '🔒' : isSoldOut(item) ? '🚫' : '🎁'}
                  name={item.name}
                  description={item.description ?? undefined}
                  goldCost={item.gold_cost}
                  stock={item.stock}
                />
              </Pressable>
            ))}
          </View>
        )}

        {/* Presets */}
        <SectionHeader title={t('loot_presets_section')} />
        <View className="flex-row flex-wrap justify-between">
          {PRESET_LOOT.map((preset) => (
            <Pressable
              key={preset.id}
              accessibilityRole="button"
              accessibilityLabel={`${t('preset_use_action')}: ${preset.name}`}
              onPress={() =>
                router.push({ pathname: '/(parent)/loot/new', params: { preset: preset.id } })
              }
              className="mb-3 w-[48.5%]"
            >
              <LootCard
                emoji={preset.emoji}
                name={preset.name}
                description={preset.description}
                goldCost={preset.goldCost}
                stock={preset.stock}
              />
            </Pressable>
          ))}
        </View>
      </ScrollView>

      <Modal visible={limitNudge} onClose={() => setLimitNudge(false)}>
        <View className="gap-3">
          <Text className="text-text-primary text-lg font-extrabold">{t('loot_limit_title')}</Text>
          <Text className="text-text-muted text-sm leading-5">
            {t('loot_limit_body', { limit: limits.custom_loot })}
          </Text>
          <Button
            label={t('upgrade_action')}
            variant="gold"
            onPress={() => {
              setLimitNudge(false);
              openPaywall('loot_limit');
            }}
          />
          <Button
            label={t('not_now_action')}
            variant="ghost"
            onPress={() => setLimitNudge(false)}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
