import { Image, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Card, SectionHeader } from '../../components/ui';
import { GoldCounter, StreakFlame, XPBar } from '../../components/game';
import { useLexicon } from '../../hooks/useLexicon';
import { useTheme } from '../../hooks/useTheme';
import { useModeStore } from '@/stores/modeStore';
import { useSession } from '@/features/auth';
import { useBoundAdventurer, useOwnBinding } from '../../queries/pairingQueries';

function greetingKey(hour: number) {
  if (hour < 12) return 'greeting_morning' as const;
  if (hour < 18) return 'greeting_afternoon' as const;
  return 'greeting_evening' as const;
}

/**
 * Adventurer dashboard: identity hero + derived aggregates. The quest log,
 * loot shop, and avatar screens land with their feature passes — no fake
 * tappable content for kids in the meantime.
 */
export default function AdventurerHomeScreen() {
  const { t } = useLexicon();
  const { pack, variant } = useTheme();
  const { user } = useSession();
  const isAnon = Boolean(user?.is_anonymous);
  const activeAdventurerId = useModeStore((state) => state.activeAdventurerId);
  const bindingQuery = useOwnBinding();
  const adventurerId = isAnon ? bindingQuery.data?.adventurer_id : activeAdventurerId;
  const adventurer = useBoundAdventurer(adventurerId).data ?? null;

  if (!adventurer) return null;

  const xpToNext = adventurer.level * adventurer.level * 100;
  const avatarSource =
    pack.assets.avatarBases[variant?.avatarBases[0] ?? 0] ?? pack.assets.avatarBases[0];

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 48 }}>
        {/* Identity hero */}
        <View className="items-center gap-2 pt-6">
          <View className="border-accent-achievement bg-surface-raised h-24 w-24 items-center justify-center rounded-full border-4">
            <Image source={avatarSource} className="h-20 w-20 rounded-full" />
            <View className="bg-accent-loot border-bg-base absolute -bottom-1 -right-1 h-8 w-8 items-center justify-center rounded-xl border-2">
              <Text className="text-text-inverse text-xs font-black">{adventurer.level}</Text>
            </View>
          </View>
          <Text className="text-text-muted text-sm font-semibold">
            {t(greetingKey(new Date().getHours()))}
          </Text>
          <Text className="text-text-primary text-3xl font-black">{adventurer.nickname}</Text>
          <Text className="text-accent-achievement text-xs font-extrabold uppercase tracking-widest">
            {t('rank_title', { level: adventurer.level })}
          </Text>
        </View>

        {/* Stats */}
        <Card raised className="gap-4 p-5">
          <XPBar xp={adventurer.xp_total} xpToNext={xpToNext} level={adventurer.level} />
          <View className="flex-row gap-2.5">
            <GoldCounter amount={adventurer.gold_balance} />
            <StreakFlame days={adventurer.current_streak_days} />
          </View>
        </Card>

        {/* Quest log placeholder */}
        <SectionHeader title={t('quests_today_label')} />
        <Card className="items-center gap-2 p-8">
          <Text className="text-5xl">⚔️</Text>
          <Text className="text-text-muted text-center text-sm leading-5">
            {t('empty_quests_body')}
          </Text>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
