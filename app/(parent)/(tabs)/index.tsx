import { useRouter } from 'expo-router';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSession } from '@/features/auth';
import { Badge, Button, Card } from '../../../components/ui';
import { GoldCounter, StreakFlame, XPBar } from '../../../components/game';
import { getCrest } from '../../../data/crests';
import { useLexicon } from '../../../hooks/useLexicon';
import { xpProgress } from '../../../lib/game-math';
import { useAdventurers } from '../../../queries/adventurerQueries';
import { usePendingCompletions } from '../../../queries/completionsQueries';
import { useCurrentGuild } from '../../../queries/guildQueries';
import { getThemePack } from '../../../themes';

function greetingKey(hour: number) {
  if (hour < 12) return 'greeting_morning' as const;
  if (hour < 18) return 'greeting_afternoon' as const;
  return 'greeting_evening' as const;
}

/** NPC dashboard: guild header + adventurer roster from the guild schema. */
export default function GuildDashboardScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const { user } = useSession();
  const { guild, npcProfile } = useCurrentGuild();
  const adventurersQuery = useAdventurers(guild?.id);
  const pendingCount = usePendingCompletions(guild?.id).data?.length ?? 0;

  const adventurers = (adventurersQuery.data ?? []).filter((row) => !row.archived_at);
  const displayName = npcProfile?.display_name ?? user?.email?.split('@')[0] ?? t('npc');

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        {/* Guild header */}
        <View className="flex-row items-center gap-3 pt-2">
          <Text className="text-4xl">{getCrest(guild?.crest).emoji}</Text>
          <View className="flex-1">
            <Text className="text-text-muted text-xs font-semibold">
              {t(greetingKey(new Date().getHours()))}, {displayName}
            </Text>
            <Text className="text-text-primary text-2xl font-extrabold">
              {guild?.name ?? t('guild')}
            </Text>
          </View>
        </View>

        {/* Approval queue entry */}
        {pendingCount > 0 ? (
          <Pressable accessibilityRole="button" onPress={() => router.push('/(parent)/approvals')}>
            <Card raised className="flex-row items-center gap-3">
              <Text className="text-3xl">📜</Text>
              <View className="flex-1">
                <Text className="text-text-primary text-sm font-extrabold">
                  {t('approvals_title')}
                </Text>
                <Text className="text-text-muted text-xs">
                  {t('approvals_link_label', { count: pendingCount })}
                </Text>
              </View>
              <Badge label={String(pendingCount)} tone="danger" />
            </Card>
          </Pressable>
        ) : null}

        {/* Roster */}
        <View className="flex-row items-center justify-between pt-2">
          <Text className="text-text-muted text-xs font-semibold uppercase">
            {t('home_roster_label')}
          </Text>
          <Button
            label={`+ ${t('adventurer_add_action')}`}
            size="sm"
            variant="ghost"
            onPress={() => router.push('/(parent)/(tabs)/family')}
          />
        </View>

        {adventurers.length === 0 && !adventurersQuery.isLoading ? (
          <Card className="items-center gap-2 p-8">
            <Text className="text-5xl">🛡️</Text>
            <Text className="text-text-primary text-center text-base font-bold">
              {t('adventurers_empty_title')}
            </Text>
            <Text className="text-text-muted text-center text-sm">
              {t('adventurers_empty_body')}
            </Text>
            <View className="pt-2">
              <Button
                label={t('adventurer_add_action')}
                onPress={() => router.push('/(parent)/adventurers/new')}
              />
            </View>
          </Card>
        ) : (
          adventurers.map((adventurer) => {
            const pack = getThemePack(adventurer.theme_id);
            return (
              <Pressable
                key={adventurer.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({
                    pathname: '/(parent)/adventurers/[id]',
                    params: { id: adventurer.id },
                  })
                }
              >
                <Card raised className="gap-3">
                  <View className="flex-row items-center gap-3">
                    <View className="border-accent-achievement h-14 w-14 items-center justify-center rounded-full border-2">
                      <Image
                        source={pack.assets.avatarBases[0]}
                        className="bg-bg-base h-11 w-11 rounded-full"
                      />
                    </View>
                    <View className="flex-1">
                      <Text className="text-text-primary text-lg font-extrabold">
                        {adventurer.nickname}
                      </Text>
                      <Text className="text-text-muted text-xs font-semibold">
                        {t('rank_title', { level: adventurer.level })}
                      </Text>
                    </View>
                    <Badge label={pack.name} tone="achievement" />
                  </View>
                  <XPBar
                    xp={xpProgress(adventurer.xp_total).into}
                    xpToNext={xpProgress(adventurer.xp_total).toNext}
                    level={adventurer.level}
                  />
                  <View className="flex-row gap-2">
                    <GoldCounter amount={adventurer.gold_balance} />
                    <StreakFlame days={adventurer.current_streak_days} />
                  </View>
                </Card>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
