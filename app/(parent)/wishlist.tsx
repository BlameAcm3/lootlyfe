import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Button, Card, Input, Modal, SectionHeader } from '../../components/ui';
import { useLexicon } from '../../hooks/useLexicon';
import { useCurrentGuild } from '../../queries/guildQueries';
import {
  useAcceptWish,
  useDeclineWish,
  useGuildWishlist,
  type WishlistWithAdventurer,
} from '../../queries/lootQueries';

const statusChip = (
  status: string,
): {
  key: 'wish_status_accepted_chip' | 'wish_status_declined_chip';
  tone: 'progress' | 'muted';
} | null => {
  if (status === 'accepted') return { key: 'wish_status_accepted_chip', tone: 'progress' };
  if (status === 'declined') return { key: 'wish_status_declined_chip', tone: 'muted' };
  return null;
};

/**
 * NPC Loot List review (feature 21): accept a proposed wish (optionally
 * editing its cost/stock) into the live loot library, or decline it kindly.
 */
export default function WishlistReviewScreen() {
  const { t } = useLexicon();
  const { guild } = useCurrentGuild();
  const wishlistQuery = useGuildWishlist(guild?.id);
  const acceptMutation = useAcceptWish(guild?.id ?? '');
  const declineMutation = useDeclineWish(guild?.id ?? '');

  const [accepting, setAccepting] = useState<WishlistWithAdventurer | null>(null);
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [costError, setCostError] = useState<string | null>(null);
  const [stockError, setStockError] = useState<string | null>(null);

  if (!guild) return null;

  const wishes = wishlistQuery.data ?? [];
  const proposed = wishes.filter((w) => w.status === 'proposed');
  const resolved = wishes.filter((w) => w.status !== 'proposed');
  const resolving = acceptMutation.isPending || declineMutation.isPending;

  const openAccept = (wish: WishlistWithAdventurer) => {
    setAccepting(wish);
    setCost(wish.proposed_gold_cost != null ? String(wish.proposed_gold_cost) : '');
    setStock('');
    setCostError(null);
    setStockError(null);
  };

  const submitAccept = async () => {
    if (!accepting) return;
    const costValue = Number(cost);
    const trimmedStock = stock.trim();
    const stockValue = trimmedStock === '' ? null : Number(trimmedStock);
    let invalid = false;
    if (!Number.isInteger(costValue) || costValue < 0) {
      setCostError(t('loot_form_cost_invalid'));
      invalid = true;
    }
    if (stockValue !== null && (!Number.isInteger(stockValue) || stockValue < 0)) {
      setStockError(t('loot_form_stock_invalid'));
      invalid = true;
    }
    if (invalid) return;
    await acceptMutation.mutateAsync({
      wishlistId: accepting.id,
      goldCost: costValue,
      stock: stockValue,
    });
    setAccepting(null);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="pt-2">
          <Text className="text-text-primary text-2xl font-extrabold">
            {t('wishlist_review_title')}
          </Text>
        </View>

        {proposed.length === 0 && !wishlistQuery.isLoading ? (
          <Card className="items-center gap-2 p-8">
            <Text className="text-5xl">⭐</Text>
            <Text className="text-text-muted text-center text-sm">
              {t('wishlist_review_empty_body')}
            </Text>
          </Card>
        ) : (
          proposed.map((wish) => (
            <Card key={wish.id} raised className="gap-3">
              <View className="gap-1">
                <Text className="text-text-primary text-base font-extrabold">{wish.name}</Text>
                <Text className="text-text-muted text-xs font-semibold">
                  {wish.adventurer_profiles?.nickname} ·{' '}
                  {wish.proposed_gold_cost != null
                    ? t('wish_proposed_cost_label', { cost: wish.proposed_gold_cost })
                    : t('wish_no_cost_label')}
                </Text>
                {wish.description ? (
                  <View className="bg-bg-base mt-1 gap-0.5 rounded-2xl p-3">
                    <Text className="text-text-muted text-[10px] font-extrabold uppercase tracking-wider">
                      {t('wish_why_section')}
                    </Text>
                    <Text className="text-text-primary text-sm leading-5">{wish.description}</Text>
                  </View>
                ) : null}
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    accessibilityLabel={t('wish_accept_action')}
                    label={t('wish_accept_action')}
                    disabled={resolving}
                    onPress={() => openAccept(wish)}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    accessibilityLabel={t('wish_decline_action')}
                    label={t('wish_decline_action')}
                    variant="ghost"
                    disabled={resolving}
                    onPress={() => void declineMutation.mutateAsync(wish.id)}
                  />
                </View>
              </View>
            </Card>
          ))
        )}

        {resolved.length > 0 ? (
          <View className="gap-2 pt-2">
            <SectionHeader title={t('redemption_history_section')} />
            {resolved.map((wish) => {
              const chip = statusChip(wish.status);
              return (
                <Card key={wish.id} className="flex-row items-center justify-between">
                  <Text
                    className="text-text-primary flex-1 pr-2 text-sm font-bold"
                    numberOfLines={1}
                  >
                    {wish.name}
                  </Text>
                  {chip ? <Badge label={t(chip.key)} tone={chip.tone} /> : null}
                </Card>
              );
            })}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={accepting !== null} onClose={() => setAccepting(null)}>
        <View className="gap-3">
          <Text className="text-text-primary text-lg font-extrabold">{t('wish_accept_title')}</Text>
          <Text className="text-text-muted text-sm">{accepting?.name}</Text>
          <Input
            accessibilityLabel={t('loot_form_cost_label')}
            label={t('loot_form_cost_label')}
            value={cost}
            onChangeText={(value) => {
              setCost(value);
              setCostError(null);
            }}
            keyboardType="number-pad"
            error={costError ?? undefined}
          />
          <Input
            accessibilityLabel={t('loot_form_stock_label')}
            label={t('loot_form_stock_label')}
            value={stock}
            onChangeText={(value) => {
              setStock(value);
              setStockError(null);
            }}
            keyboardType="number-pad"
            placeholder={t('loot_unlimited_label')}
            error={stockError ?? undefined}
          />
          <Text className="text-text-muted text-xs">{t('loot_form_stock_hint')}</Text>
          <Button
            label={t('wish_accept_action')}
            disabled={acceptMutation.isPending}
            onPress={() => void submitAccept()}
          />
          <Button label={t('cancel_action')} variant="ghost" onPress={() => setAccepting(null)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
