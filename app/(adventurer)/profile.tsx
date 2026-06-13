import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { AvatarRenderer } from '../../components/game';
import { Card, SectionHeader } from '../../components/ui';
import {
  COSMETIC_SLOTS,
  COSMETIC_SLOT_LABEL_KEYS,
  presetCosmeticByKey,
} from '../../data/cosmetics';
import { PRESET_ACHIEVEMENTS } from '../../data/preset-achievements';
import { useCurrentAdventurer } from '../../hooks/useCurrentAdventurer';
import { useLexicon } from '../../hooks/useLexicon';
import { useTheme } from '../../hooks/useTheme';
import { parseAvatarConfig } from '../../lib/avatar';
import { ROUTES } from '../../lib/routes';
import { useAdventurerAchievements } from '../../queries/achievementsQueries';
import { useSetAvatarBase } from '../../queries/cosmeticsQueries';

/**
 * Adventurer profile: the avatar large, base picker, equipped gear, and the
 * achievement gallery (earned in full color, locked as dimmed silhouettes).
 */
export default function AdventurerProfileScreen() {
  const router = useRouter();
  const { t } = useLexicon();
  const { pack, variant } = useTheme();
  const { adventurerId, adventurer } = useCurrentAdventurer();
  const achievementsQuery = useAdventurerAchievements(adventurerId);
  const setBaseMutation = useSetAvatarBase(adventurerId);

  if (!adventurer) return null;

  const config = parseAvatarConfig(adventurer.avatar_config);
  // Variants curate which bases they offer; no variant = the whole pack.
  const baseChoices =
    variant && variant.avatarBases.length > 0
      ? variant.avatarBases
      : pack.assets.avatarBases.map((_, index) => index);

  const earnedIds = new Set((achievementsQuery.data ?? []).map((row) => row.achievement_id));

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
          <Text className="text-text-primary flex-1 text-2xl font-black">{t('profile_title')}</Text>
        </View>

        {/* Avatar hero */}
        <View className="items-center gap-2">
          <View className="border-accent-achievement bg-surface-raised items-center justify-center rounded-full border-4 p-4">
            <AvatarRenderer config={adventurer.avatar_config} size={144} />
          </View>
          <Text className="text-text-primary text-2xl font-black">{adventurer.nickname}</Text>
          <Text className="text-accent-achievement text-xs font-extrabold uppercase tracking-widest">
            {t('rank_title', { level: adventurer.level })}
          </Text>
        </View>

        {/* Base picker */}
        <SectionHeader title={t('avatar_base_label')} />
        <View className="flex-row gap-3">
          {baseChoices.map((baseIndex) => (
            <Pressable
              key={baseIndex}
              accessibilityRole="button"
              disabled={setBaseMutation.isPending}
              onPress={() => setBaseMutation.mutate(baseIndex)}
              className={
                config.base === baseIndex
                  ? 'border-accent-achievement bg-surface-raised rounded-2xl border-2 p-2'
                  : 'border-border bg-surface rounded-2xl border p-2'
              }
            >
              <Image
                source={pack.assets.avatarBases[baseIndex]}
                resizeMode="contain"
                style={{ width: 56, height: 56 }}
              />
            </Pressable>
          ))}
        </View>

        {/* Equipped gear */}
        <SectionHeader title={t('equipped_section_label')} />
        <Card className="gap-3 p-4">
          {COSMETIC_SLOTS.map((slot) => {
            const key = config.slots[slot];
            const preset = key ? presetCosmeticByKey(key) : null;
            return (
              <View key={slot} className="flex-row items-center gap-3">
                <View className="bg-bg-base h-12 w-12 items-center justify-center rounded-xl">
                  {key ? (
                    <Image
                      source={pack.assets.cosmetics[key]}
                      resizeMode="contain"
                      style={{ width: 40, height: 40 }}
                    />
                  ) : (
                    <Text className="text-text-muted text-lg">·</Text>
                  )}
                </View>
                <View className="flex-1">
                  <Text className="text-text-muted text-xs font-extrabold uppercase tracking-widest">
                    {t(COSMETIC_SLOT_LABEL_KEYS[slot])}
                  </Text>
                  <Text className="text-text-primary text-sm font-bold">
                    {preset ? t(preset.nameKey) : t('empty_slot_label')}
                  </Text>
                </View>
              </View>
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={t('cosmetic_store_title')}
            onPress={() => router.push(ROUTES.adventurerStore)}
            className="bg-accent-achievement items-center rounded-2xl p-3"
          >
            <Text className="text-text-inverse text-sm font-extrabold">
              {t('cosmetic_store_title')}
            </Text>
          </Pressable>
        </Card>

        {/* Achievement gallery */}
        <SectionHeader title={t('achievements_title')} />
        <Text className="text-text-muted text-xs font-semibold">
          {t('achievements_progress', {
            earned: earnedIds.size,
            total: PRESET_ACHIEVEMENTS.length,
          })}
        </Text>
        <View className="flex-row flex-wrap justify-between">
          {PRESET_ACHIEVEMENTS.map((achievement) => {
            const earned = earnedIds.has(achievement.id);
            return (
              <View
                key={achievement.id}
                className={
                  earned
                    ? 'bg-surface border-accent-achievement mb-3 w-[31%] items-center gap-1 rounded-2xl border p-3'
                    : 'bg-surface border-border mb-3 w-[31%] items-center gap-1 rounded-2xl border p-3'
                }
                style={earned ? undefined : { opacity: 0.45 }}
              >
                <Text className="text-3xl">{earned ? achievement.emoji : '🔒'}</Text>
                <Text
                  className="text-text-primary text-center text-xs font-extrabold"
                  numberOfLines={2}
                >
                  {earned ? t(achievement.nameKey) : t('achievement_locked_label')}
                </Text>
                <Text className="text-text-muted text-center text-[10px]" numberOfLines={2}>
                  {t(achievement.descriptionKey)}
                </Text>
                <Text className="text-accent-achievement text-xs font-black">
                  {t('level_up_points_line', { points: achievement.points })}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
