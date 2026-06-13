import { useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LootForm, type LootFormValues } from '../../../components/forms/LootForm';
import { Button, Card } from '../../../components/ui';
import { PRESET_LOOT } from '../../../data/presetLoot';
import { useLexicon } from '../../../hooks/useLexicon';
import { useCurrentGuild } from '../../../queries/guildQueries';
import { limitErrorContext, useSubscription } from '@/features/subscriptions';
import { useCreateLootItem, useLootItems } from '../../../queries/lootQueries';

const presetInitial = (presetId: string | undefined): Partial<LootFormValues> | undefined => {
  const preset = PRESET_LOOT.find((p) => p.id === presetId);
  if (!preset) return undefined;
  return {
    name: preset.name,
    description: preset.description ?? '',
    goldCost: preset.goldCost,
    stock: preset.stock,
  };
};

export default function NewLootScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const params = useLocalSearchParams<{ preset?: string }>();
  const { guild, npcProfile } = useCurrentGuild();
  const { checkLimit, openPaywall, limits } = useSubscription();
  const itemsQuery = useLootItems(guild?.id);
  const mutation = useCreateLootItem(guild?.id ?? '', npcProfile?.id ?? '');

  if (!guild || !npcProfile) return null;

  // Deep-link guard for the free-tier gate. Every loot_items row counts (loot
  // has no preset-source exemption, unlike quests).
  const limitHit = !checkLimit('custom_loot', (itemsQuery.data ?? []).length).allowed;

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="pt-2">
          <Text className="text-text-primary text-2xl font-extrabold">{t('loot_new_action')}</Text>
        </View>

        {limitHit ? (
          <Card className="gap-3 p-5">
            <Text className="text-text-primary text-lg font-extrabold">
              {t('loot_limit_title')}
            </Text>
            <Text className="text-text-muted text-sm leading-5">
              {t('loot_limit_body', { limit: limits.custom_loot })}
            </Text>
            <Button
              label={t('upgrade_action')}
              variant="gold"
              onPress={() => openPaywall('loot_limit')}
            />
            <Button label={t('not_now_action')} variant="ghost" onPress={() => router.back()} />
          </Card>
        ) : (
          <LootForm
            initial={presetInitial(params.preset)}
            submitting={mutation.isPending}
            onSubmit={async (values) => {
              try {
                await mutation.mutateAsync({
                  name: values.name,
                  description: values.description || null,
                  gold_cost: values.goldCost,
                  stock: values.stock,
                });
                router.back();
              } catch (error) {
                const context = limitErrorContext(error);
                if (context) openPaywall(context);
                else Alert.alert(t('error_generic'));
              }
            }}
          />
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
