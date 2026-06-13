import { useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Button, Card, Input, Modal, ProgressBar } from '../../components/ui';
import { GoldCounter, LootCard, QuestCard, StreakFlame, XPBar } from '../../components/game';
import { PRESET_QUESTS } from '../../data/presetQuests';
import { PRESET_LOOT } from '../../data/presetLoot';
import { useLexicon } from '../../hooks/useLexicon';
import { useTheme } from '../../hooks/useTheme';
import { themePacks } from '../../themes';
import { ThemeScope } from '../../themes/ThemeProvider';

/**
 * Hidden dev screen (no navigation entry; open via /dev/theme-lab). Renders
 * every primitive under each theme pack / variant / the NPC neutral skin —
 * our visual regression surface. Dev-tool chrome labels below are exempt from
 * the lexicon rule; all PREVIEWED copy goes through t().
 */

type Scope = {
  key: string;
  label: string;
  themeId?: string;
  variantId?: string | null;
  npcSkin?: boolean;
};

const scopes: Scope[] = [
  { key: 'npc-neutral', label: 'NPC Neutral', npcSkin: true },
  ...Object.values(themePacks).flatMap((pack) => [
    { key: pack.id, label: pack.name, themeId: pack.id, variantId: null },
    ...pack.variants.map((variant) => ({
      key: `${pack.id}/${variant.id}`,
      label: `${pack.name} · ${variant.name}`,
      themeId: pack.id,
      variantId: variant.id,
    })),
  ]),
];

const lexiconSampleKeys = [
  'guild',
  'npc',
  'adventurer',
  'quest_plural',
  'gold',
  'xp',
  'level',
  'loot',
  'loot_list',
  'streak',
  'store',
  'achievement_points',
] as const;

function PrimitivesPreview() {
  const { t } = useLexicon();
  const { pack, palette, isNpcSkin } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View className="bg-bg-base gap-4 rounded-3xl p-4">
      <Text className="text-text-primary text-xl font-extrabold">{t('greeting_morning')}</Text>
      <Text className="text-text-muted text-sm">{t('rank_title', { level: 3 })}</Text>

      <View className="flex-row flex-wrap gap-2">
        <Button label={t('complete_action')} variant="primary" />
        <Button label={t('store')} variant="gold" />
        <Button label={t('streak')} variant="danger" />
        <Button label={t('loot_list')} variant="ghost" />
        <Button label={t('quest')} variant="primary" disabled />
      </View>

      <View className="flex-row flex-wrap gap-2">
        <Badge label={t('gold')} tone="loot" />
        <Badge label={t('xp')} tone="progress" />
        <Badge label={t('quest')} tone="info" />
        <Badge label={t('streak')} tone="danger" />
        <Badge label={t('achievement_points')} tone="achievement" />
        <Badge label={t('today_label')} tone="muted" />
      </View>

      <Card className="gap-3">
        <Text className="text-text-primary text-base font-bold">{t('quests_today_label')}</Text>
        <XPBar xp={250} xpToNext={400} level={3} />
        <ProgressBar progress={0.66} tone="loot" />
        <ProgressBar progress={0.4} tone="achievement" />
        <View className="flex-row gap-2">
          <GoldCounter amount={1250} />
          <StreakFlame days={7} />
        </View>
        <Input label={t('adventurer')} placeholder={t('pairing_title')} />
        <Button label={t('level_up_title')} variant="primary" onPress={() => setModalVisible(true)} />
      </Card>

      <Card className="gap-2.5">
        <Text className="text-text-muted text-xs font-semibold uppercase">
          {t('quest_plural')} / {t('loot')}
        </Text>
        {PRESET_QUESTS.slice(0, 2).map((quest) => (
          <QuestCard
            key={quest.id}
            emoji={quest.emoji}
            title={quest.title}
            description={t(quest.flavorKey)}
            goldReward={quest.goldReward}
            xpReward={quest.xpReward}
            difficulty={quest.difficulty}
            recurrence={quest.recurrence}
          />
        ))}
        <QuestCard
          emoji="🛏️"
          title={PRESET_QUESTS[0].title}
          goldReward={PRESET_QUESTS[0].goldReward}
          xpReward={PRESET_QUESTS[0].xpReward}
          difficulty={1}
          done
        />
        <View className="flex-row gap-2.5">
          {PRESET_LOOT.slice(0, 2).map((loot) => (
            <View key={loot.id} className="flex-1">
              <LootCard
                emoji={loot.emoji}
                name={loot.name}
                goldCost={loot.goldCost}
                stock={loot.stock}
              />
            </View>
          ))}
        </View>
      </Card>

      {!isNpcSkin ? (
        <Card className="gap-2">
          <Text className="text-text-muted text-xs font-semibold uppercase">assets</Text>
          <View className="flex-row gap-2">
            {Object.values(pack.assets.icons).map((icon, index) => (
              <Image key={index} source={icon} className="h-8 w-8 rounded-lg" />
            ))}
            {pack.assets.avatarBases.map((avatar, index) => (
              <Image key={`avatar-${index}`} source={avatar} className="h-8 w-8 rounded-full" />
            ))}
          </View>
        </Card>
      ) : null}

      <Card className="gap-1">
        <Text className="text-text-muted text-xs font-semibold uppercase">lexicon</Text>
        {lexiconSampleKeys.map((key) => (
          <View key={key} className="flex-row justify-between">
            <Text className="text-text-muted text-xs">{key}</Text>
            <Text className="text-text-primary text-xs font-semibold">{t(key)}</Text>
          </View>
        ))}
      </Card>

      <Card className="gap-1">
        <Text className="text-text-muted text-xs font-semibold uppercase">palette</Text>
        <View className="flex-row flex-wrap gap-1.5">
          {Object.entries(palette).map(([token, color]) => (
            <View key={token} className="items-center gap-0.5">
              {/* Raw hex swatch — dev tooling, intentionally bypasses tokens. */}
              <View className="h-7 w-12 rounded-md" style={{ backgroundColor: color }} />
              <Text className="text-text-muted text-[8px]">{token}</Text>
            </View>
          ))}
        </View>
      </Card>

      <Modal visible={modalVisible} onClose={() => setModalVisible(false)}>
        <View className="gap-3">
          <Text className="text-text-primary text-lg font-extrabold">{t('level_up_title')}</Text>
          <Text className="text-text-muted text-sm">{t('level_up_body')}</Text>
          <Button label={t('done_label')} onPress={() => setModalVisible(false)} />
        </View>
      </Modal>
    </View>
  );
}

export default function ThemeLabScreen() {
  const [selected, setSelected] = useState<Scope>(scopes[1]);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>
        <Text className="text-text-primary mb-3 text-2xl font-extrabold">Theme Lab</Text>

        <View className="mb-4 flex-row flex-wrap gap-2">
          {scopes.map((scope) => {
            const active = scope.key === selected.key;
            return (
              <Pressable
                key={scope.key}
                accessibilityRole="button"
                onPress={() => setSelected(scope)}
                className={
                  active
                    ? 'bg-accent-info rounded-full px-3 py-1.5'
                    : 'bg-surface rounded-full px-3 py-1.5'
                }
              >
                <Text
                  className={
                    active
                      ? 'text-text-inverse text-xs font-bold'
                      : 'text-text-muted text-xs font-semibold'
                  }
                >
                  {scope.label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <ThemeScope
          key={selected.key}
          themeId={selected.themeId}
          variantId={selected.variantId}
          npcSkin={selected.npcSkin}
        >
          <PrimitivesPreview />
        </ThemeScope>
      </ScrollView>
    </SafeAreaView>
  );
}
