import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Alert, Image, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Button, Card, Modal } from '../../../components/ui';
import { useLexicon } from '../../../hooks/useLexicon';
import { useAdventurers, type AdventurerRow } from '../../../queries/adventurerQueries';
import { useCurrentGuild } from '../../../queries/guildQueries';
import { useCreateGuildInvite, type GuildInvite } from '../../../queries/invitesQueries';
import { useSubscription } from '@/features/subscriptions';
import { getThemePack } from '../../../themes';

function AdventurerCard({
  adventurer,
  onPress,
  lockedLabel,
}: {
  adventurer: AdventurerRow;
  onPress: () => void;
  lockedLabel?: string;
}) {
  const pack = getThemePack(adventurer.theme_id);
  return (
    <Pressable accessibilityRole="button" onPress={onPress}>
      <Card className="flex-row items-center gap-3">
        <Image source={pack.assets.avatarBases[0]} className="bg-bg-base h-12 w-12 rounded-full" />
        <View className="flex-1 gap-1">
          <Text className="text-text-primary text-base font-bold">{adventurer.nickname}</Text>
          <View className="flex-row gap-2">
            <Badge label={adventurer.age_bucket} tone="info" />
            <Badge label={pack.name} tone="achievement" />
            {lockedLabel ? <Badge label={lockedLabel} tone="muted" /> : null}
          </View>
        </View>
        <Text className="text-text-muted text-xl">›</Text>
      </Card>
    </Pressable>
  );
}

export default function AdventurersScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const { guild } = useCurrentGuild();
  const { isPremium, checkLimit, lockedIdsFor, openPaywall, limits } = useSubscription();
  const adventurersQuery = useAdventurers(guild?.id);
  const [limitNudgeVisible, setLimitNudgeVisible] = useState(false);
  const inviteMutation = useCreateGuildInvite();
  const [invite, setInvite] = useState<GuildInvite | null>(null);

  // Co-parent invites are premium (free = 1 NPC). Non-premium guilds go to the
  // paywall (with the co-parent headline) instead of minting a code. The server
  // also enforces this in accept_guild_invite/create_guild_invite (migration 016).
  const handleInvite = async () => {
    if (!isPremium) {
      openPaywall('coparent');
      return;
    }
    try {
      setInvite(await inviteMutation.mutateAsync());
    } catch {
      Alert.alert(t('invite_error_generic'));
    }
  };

  const shareInvite = async (code: string) => {
    try {
      await Share.share({ message: `${t('invite_code_share_hint')} ${code}` });
    } catch {
      /* user dismissed the share sheet */
    }
  };

  const adventurers = adventurersQuery.data ?? [];
  const active = adventurers.filter((adventurer) => !adventurer.archived_at);
  const archived = adventurers.filter((adventurer) => adventurer.archived_at);
  // Downgrade matrix: on a lapsed (free) guild, the newest adventurers beyond
  // the free limit are read-only (locked badge here; edit disabled in detail).
  const lockedAdventurerIds = lockedIdsFor('adventurers', active);

  const handleAdd = () => {
    // Client check is UX; the BEFORE INSERT trigger (migration 017) is the law.
    if (!checkLimit('adventurers', active.length).allowed) {
      setLimitNudgeVisible(true);
      return;
    }
    router.push('/(parent)/adventurers/new');
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="flex-row items-center justify-between pt-2">
          <Text className="text-text-primary text-2xl font-extrabold">{t('adventurer')}s</Text>
          <Button label={`+ ${t('adventurer_add_action')}`} size="sm" onPress={handleAdd} />
        </View>

        {active.length === 0 && !adventurersQuery.isLoading ? (
          <Card className="items-center gap-2 p-8">
            <Text className="text-5xl">🛡️</Text>
            <Text className="text-text-primary text-center text-base font-bold">
              {t('adventurers_empty_title')}
            </Text>
            <Text className="text-text-muted text-center text-sm">
              {t('adventurers_empty_body')}
            </Text>
            <View className="pt-2">
              <Button label={t('adventurer_add_action')} onPress={handleAdd} />
            </View>
          </Card>
        ) : (
          active.map((adventurer) => (
            <AdventurerCard
              key={adventurer.id}
              adventurer={adventurer}
              lockedLabel={lockedAdventurerIds.has(adventurer.id) ? t('locked_badge_label') : undefined}
              onPress={() =>
                router.push({ pathname: '/(parent)/adventurers/[id]', params: { id: adventurer.id } })
              }
            />
          ))
        )}

        {archived.length > 0 ? (
          <View className="gap-2 pt-4">
            <Text className="text-text-muted text-xs font-semibold uppercase">
              {t('archived_section_label')}
            </Text>
            {archived.map((adventurer) => (
              <View key={adventurer.id} style={{ opacity: 0.55 }}>
                <AdventurerCard
                  adventurer={adventurer}
                  onPress={() =>
                    router.push({
                      pathname: '/(parent)/adventurers/[id]',
                      params: { id: adventurer.id },
                    })
                  }
                />
              </View>
            ))}
          </View>
        ) : null}

        <Card className="mt-4 gap-3">
          <Text className="text-text-primary text-base font-bold">{t('npc')}s</Text>
          <Text className="text-text-muted text-sm leading-5">
            {isPremium ? t('notif_master_hint') : t('invite_premium_required')}
          </Text>
          <Button
            label={t('invite_coparent_action')}
            variant={isPremium ? 'primary' : 'gold'}
            disabled={inviteMutation.isPending}
            onPress={handleInvite}
          />
        </Card>
      </ScrollView>

      <Modal visible={Boolean(invite)} onClose={() => setInvite(null)}>
        <View className="gap-3">
          <Text className="text-text-primary text-lg font-extrabold">{t('invite_code_title')}</Text>
          <Text className="text-text-muted text-sm">{t('invite_code_share_hint')}</Text>
          <View className="bg-bg-base border-border items-center rounded-xl border py-4">
            <Text className="text-text-primary text-3xl font-extrabold tracking-[6px]">
              {invite?.code}
            </Text>
          </View>
          <Button
            label={t('invite_share_action')}
            variant="primary"
            onPress={() => invite && shareInvite(invite.code)}
          />
          <Button label={t('cancel_action')} variant="ghost" onPress={() => setInvite(null)} />
        </View>
      </Modal>

      <Modal visible={limitNudgeVisible} onClose={() => setLimitNudgeVisible(false)}>
        <View className="gap-3">
          <Text className="text-text-primary text-lg font-extrabold">{t('limit_title')}</Text>
          <Text className="text-text-muted text-sm leading-5">
            {t('limit_body', { limit: limits.adventurers })}
          </Text>
          <Button
            label={t('upgrade_action')}
            variant="gold"
            onPress={() => {
              setLimitNudgeVisible(false);
              openPaywall('adventurer_limit');
            }}
          />
          <Button
            label={t('not_now_action')}
            variant="ghost"
            onPress={() => setLimitNudgeVisible(false)}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
