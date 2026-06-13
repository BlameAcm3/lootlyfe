import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { Badge, Card } from '../../components/ui';
import { useCurrentAdventurer } from '../../hooks/useCurrentAdventurer';
import { useLexicon } from '../../hooks/useLexicon';
import type { LexiconKey } from '../../lib/lexicon';
import { useAdventurerRedemptions } from '../../queries/lootQueries';

type StatusCopy = {
  chip: LexiconKey;
  body: LexiconKey;
  tone: 'achievement' | 'progress' | 'muted';
  emoji: string;
};

const STATUS_COPY: Record<string, StatusCopy> = {
  pending: {
    chip: 'redemption_pending_chip',
    body: 'redemption_pending_body',
    tone: 'achievement',
    emoji: '⏳',
  },
  approved: {
    chip: 'redemption_fulfilled_chip',
    body: 'redemption_fulfilled_body',
    tone: 'progress',
    emoji: '🎉',
  },
  rejected: {
    chip: 'redemption_denied_chip',
    body: 'redemption_denied_body',
    tone: 'muted',
    emoji: '🪙',
  },
};

/**
 * Adventurer redemption history (feature 20): pending / fulfilled / denied,
 * each with encouraging copy. A denied redemption already refunded the gold.
 */
export default function RedemptionsScreen() {
  const router = useRouter();
  const { t } = useLexicon();
  const { adventurerId } = useCurrentAdventurer();
  const redemptionsQuery = useAdventurerRedemptions(adventurerId);

  const redemptions = redemptionsQuery.data ?? [];

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
          <Text className="text-text-primary text-2xl font-black">{t('loot_history_title')}</Text>
        </View>

        {redemptions.length === 0 && !redemptionsQuery.isLoading ? (
          <Card className="items-center gap-2 p-8">
            <Text className="text-5xl">🎁</Text>
            <Text className="text-text-muted text-center text-sm">{t('empty_loot_body')}</Text>
          </Card>
        ) : (
          redemptions.map((redemption) => {
            const copy = STATUS_COPY[redemption.status] ?? STATUS_COPY.pending;
            return (
              <Card key={redemption.id} raised className="gap-2">
                <View className="flex-row items-center gap-3">
                  <Text className="text-2xl">{copy.emoji}</Text>
                  <View className="flex-1">
                    <Text className="text-text-primary text-base font-extrabold" numberOfLines={1}>
                      {redemption.loot_items?.name ?? '—'}
                    </Text>
                    <Text className="text-accent-loot text-xs font-bold">
                      🪙 {redemption.gold_spent}
                    </Text>
                  </View>
                  <Badge label={t(copy.chip)} tone={copy.tone} />
                </View>
                <Text className="text-text-muted text-xs leading-4">{t(copy.body)}</Text>
              </Card>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
