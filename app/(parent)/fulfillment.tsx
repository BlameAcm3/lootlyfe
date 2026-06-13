import { useCallback, useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Button, Card, SectionHeader } from '../../components/ui';
import { useLexicon } from '../../hooks/useLexicon';
import { timeLabel } from '../../lib/dates';
import { useCurrentGuild } from '../../queries/guildQueries';
import {
  useApproveRedemption,
  useDenyRedemption,
  useGuildRedemptions,
  type GuildRedemption,
} from '../../queries/lootQueries';

const statusChip = (
  status: string,
): {
  key: 'redemption_fulfilled_chip' | 'redemption_denied_chip';
  tone: 'progress' | 'muted';
} | null => {
  if (status === 'approved') return { key: 'redemption_fulfilled_chip', tone: 'progress' };
  if (status === 'rejected') return { key: 'redemption_denied_chip', tone: 'muted' };
  return null;
};

/**
 * NPC fulfillment queue (feature 20): pending redemptions to fulfill or
 * decline, plus past redemption history. Gold was already held when the kid
 * requested; approval decrements stock and denial refunds — both in the DB.
 */
export default function FulfillmentScreen() {
  const { t } = useLexicon();
  const { guild, npcProfile } = useCurrentGuild();
  const redemptionsQuery = useGuildRedemptions(guild?.id);
  const approveMutation = useApproveRedemption(guild?.id ?? '', npcProfile?.id ?? '');
  const denyMutation = useDenyRedemption(guild?.id ?? '');

  const [message, setMessage] = useState<string | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showMessage = useCallback((text: string) => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setMessage(text);
    messageTimer.current = setTimeout(() => setMessage(null), 4000);
  }, []);

  if (!guild) return null;

  const redemptions = redemptionsQuery.data ?? [];
  const pending = redemptions.filter((r) => r.status === 'pending');
  const resolved = redemptions.filter((r) => r.status !== 'pending');
  const resolving = approveMutation.isPending || denyMutation.isPending;

  const handleApprove = async (redemption: GuildRedemption) => {
    try {
      await approveMutation.mutateAsync(redemption.id);
    } catch {
      // The only expected failure is the sold-out oversell race.
      showMessage(t('fulfillment_sold_out_error'));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="pt-2">
          <Text className="text-text-primary text-2xl font-extrabold">
            {t('fulfillment_title')}
          </Text>
        </View>

        {message ? (
          <Card className="border-danger border p-3">
            <Text className="text-text-primary text-sm font-semibold">{message}</Text>
          </Card>
        ) : null}

        {pending.length === 0 && !redemptionsQuery.isLoading ? (
          <Card className="items-center gap-2 p-8">
            <Text className="text-5xl">🎁</Text>
            <Text className="text-text-muted text-center text-sm">
              {t('fulfillment_empty_body')}
            </Text>
          </Card>
        ) : (
          pending.map((redemption) => (
            <Card key={redemption.id} raised className="gap-3">
              <View className="flex-row items-center gap-3">
                <View className="flex-1 gap-0.5">
                  <Text className="text-text-primary text-base font-extrabold" numberOfLines={1}>
                    {redemption.loot_items?.name ?? '—'}
                  </Text>
                  <Text className="text-text-muted text-xs font-semibold">
                    {redemption.adventurer_profiles?.nickname} ·{' '}
                    {t('completed_when_label', { when: timeLabel(redemption.requested_at) })}
                  </Text>
                </View>
                <Text className="text-accent-loot text-xs font-bold">
                  🪙 {redemption.gold_spent}
                </Text>
              </View>
              <View className="flex-row gap-2">
                <View className="flex-1">
                  <Button
                    accessibilityLabel={t('fulfill_action')}
                    label={t('fulfill_action')}
                    disabled={resolving}
                    onPress={() => void handleApprove(redemption)}
                  />
                </View>
                <View className="flex-1">
                  <Button
                    accessibilityLabel={t('deny_action')}
                    label={t('deny_action')}
                    variant="ghost"
                    disabled={resolving}
                    onPress={() => void denyMutation.mutateAsync(redemption.id)}
                  />
                </View>
              </View>
            </Card>
          ))
        )}

        {resolved.length > 0 ? (
          <View className="gap-2 pt-2">
            <SectionHeader title={t('redemption_history_section')} />
            {resolved.map((redemption) => {
              const chip = statusChip(redemption.status);
              return (
                <Card key={redemption.id} className="flex-row items-center justify-between">
                  <View className="flex-1 gap-0.5 pr-2">
                    <Text className="text-text-primary text-sm font-bold" numberOfLines={1}>
                      {redemption.loot_items?.name ?? '—'}
                    </Text>
                    <Text className="text-text-muted text-xs font-semibold">
                      {redemption.adventurer_profiles?.nickname} ·{' '}
                      {t('redemption_spent_label', { gold: redemption.gold_spent })}
                    </Text>
                  </View>
                  {chip ? <Badge label={t(chip.key)} tone={chip.tone} /> : null}
                </Card>
              );
            })}
          </View>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}
