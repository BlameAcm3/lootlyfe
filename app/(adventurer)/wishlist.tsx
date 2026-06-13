import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Badge, Button, Card, Input } from '../../components/ui';
import { useCurrentAdventurer } from '../../hooks/useCurrentAdventurer';
import { useLexicon } from '../../hooks/useLexicon';
import type { LexiconKey } from '../../lib/lexicon';
import { useAdventurerWishlist, useProposeWish } from '../../queries/lootQueries';

const STATUS_CHIP: Record<string, { key: LexiconKey; tone: 'achievement' | 'progress' | 'muted' }> =
  {
    proposed: { key: 'wish_status_proposed_chip', tone: 'achievement' },
    accepted: { key: 'wish_status_accepted_chip', tone: 'progress' },
    declined: { key: 'wish_status_declined_chip', tone: 'muted' },
  };

/**
 * Adventurer Loot List (feature 21): propose rewards (kid-friendly form) and
 * track each wish's status. Accepted wishes land in the live shop; declined
 * ones show kind copy.
 */
export default function WishlistScreen() {
  const router = useRouter();
  const { t } = useLexicon();
  const { adventurerId } = useCurrentAdventurer();
  const wishlistQuery = useAdventurerWishlist(adventurerId);
  const proposeMutation = useProposeWish(adventurerId);

  const [composing, setComposing] = useState(false);
  const [name, setName] = useState('');
  const [why, setWhy] = useState('');
  const [cost, setCost] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [costError, setCostError] = useState<string | null>(null);

  const wishes = wishlistQuery.data ?? [];

  const resetForm = () => {
    setName('');
    setWhy('');
    setCost('');
    setNameError(null);
    setCostError(null);
  };

  const submit = async () => {
    const trimmedCost = cost.trim();
    const costValue = trimmedCost === '' ? null : Number(trimmedCost);
    let invalid = false;
    if (!name.trim()) {
      setNameError(t('wish_form_name_required'));
      invalid = true;
    }
    if (costValue !== null && (!Number.isInteger(costValue) || costValue < 0)) {
      setCostError(t('wish_form_cost_invalid'));
      invalid = true;
    }
    if (invalid) return;
    await proposeMutation.mutateAsync({
      name: name.trim(),
      description: why.trim() || null,
      proposedGoldCost: costValue,
    });
    resetForm();
    setComposing(false);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
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
            <Text className="text-text-primary text-2xl font-black">{t('wishlist_title')}</Text>
            <Text className="text-text-muted text-xs font-semibold">{t('wishlist_subtitle')}</Text>
          </View>
        </View>

        {composing ? (
          <Card className="gap-4">
            <Text className="text-text-primary text-base font-extrabold">
              {t('wish_form_title')}
            </Text>
            <Input
              accessibilityLabel={t('wish_form_name_label')}
              label={t('wish_form_name_label')}
              value={name}
              onChangeText={(value) => {
                setName(value);
                setNameError(null);
              }}
              error={nameError ?? undefined}
            />
            <Input
              accessibilityLabel={t('wish_form_why_label')}
              label={t('wish_form_why_label')}
              value={why}
              onChangeText={setWhy}
              multiline
            />
            <Input
              accessibilityLabel={t('wish_form_cost_label')}
              label={t('wish_form_cost_label')}
              value={cost}
              onChangeText={(value) => {
                setCost(value);
                setCostError(null);
              }}
              keyboardType="number-pad"
              error={costError ?? undefined}
            />
            <Button
              label={t('wish_form_submit_action')}
              variant="gold"
              disabled={proposeMutation.isPending}
              onPress={() => void submit()}
            />
            <Button
              label={t('cancel_action')}
              variant="ghost"
              onPress={() => {
                resetForm();
                setComposing(false);
              }}
            />
          </Card>
        ) : (
          <Button
            label={`+ ${t('wishlist_propose_action')}`}
            variant="gold"
            onPress={() => setComposing(true)}
          />
        )}

        {wishes.length === 0 && !wishlistQuery.isLoading && !composing ? (
          <Card className="items-center gap-2 p-8">
            <Text className="text-5xl">⭐</Text>
            <Text className="text-text-primary text-base font-extrabold">
              {t('wishlist_empty_title')}
            </Text>
            <Text className="text-text-muted text-center text-sm">{t('wishlist_empty_body')}</Text>
          </Card>
        ) : (
          wishes.map((wish) => {
            const chip = STATUS_CHIP[wish.status] ?? STATUS_CHIP.proposed;
            return (
              <Card key={wish.id} className="gap-1.5">
                <View className="flex-row items-center gap-2">
                  <Text
                    className="text-text-primary flex-1 text-base font-extrabold"
                    numberOfLines={1}
                  >
                    {wish.name}
                  </Text>
                  <Badge label={t(chip.key)} tone={chip.tone} />
                </View>
                {wish.proposed_gold_cost != null ? (
                  <Text className="text-accent-loot text-xs font-bold">
                    🪙 {wish.proposed_gold_cost}
                  </Text>
                ) : null}
                {wish.description ? (
                  <Text className="text-text-muted text-xs leading-4">{wish.description}</Text>
                ) : null}
                {wish.status === 'declined' ? (
                  <Text className="text-text-muted text-xs italic leading-4">
                    {t('wish_declined_kind')}
                  </Text>
                ) : null}
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
