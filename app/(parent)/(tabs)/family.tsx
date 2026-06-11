import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Button, Card, Modal } from '../../../components/ui';
import { FREE_TIER_LIMITS } from '../../../constants/game';
import { useLexicon } from '../../../hooks/useLexicon';
import { useAdventurers, type AdventurerRow } from '../../../queries/adventurerQueries';
import { useCurrentGuild } from '../../../queries/guildQueries';
import { getThemePack } from '../../../themes';
import { ROUTES } from '../../../lib/routes';

function AdventurerCard({ adventurer, onPress }: { adventurer: AdventurerRow; onPress: () => void }) {
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
  const { guild, isPremium } = useCurrentGuild();
  const adventurersQuery = useAdventurers(guild?.id);
  const [limitNudgeVisible, setLimitNudgeVisible] = useState(false);

  const adventurers = adventurersQuery.data ?? [];
  const active = adventurers.filter((adventurer) => !adventurer.archived_at);
  const archived = adventurers.filter((adventurer) => adventurer.archived_at);

  const handleAdd = () => {
    // Client-side FREE_TIER_LIMITS enforcement with the upgrade-nudge pattern;
    // server-side enforcement lands with the premium Edge Function pass.
    if (!isPremium && active.length >= FREE_TIER_LIMITS.adventurers) {
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
      </ScrollView>

      <Modal visible={limitNudgeVisible} onClose={() => setLimitNudgeVisible(false)}>
        <View className="gap-3">
          <Text className="text-text-primary text-lg font-extrabold">{t('limit_title')}</Text>
          <Text className="text-text-muted text-sm leading-5">
            {t('limit_body', { limit: FREE_TIER_LIMITS.adventurers })}
          </Text>
          <Button
            label={t('upgrade_action')}
            variant="gold"
            onPress={() => {
              setLimitNudgeVisible(false);
              router.push(ROUTES.paywall);
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
