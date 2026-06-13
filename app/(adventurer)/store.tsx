import { useCallback, useRef, useState } from 'react';
import { Image, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

import { AvatarRenderer } from '../../components/game';
import { Card } from '../../components/ui';
import {
  COSMETIC_SLOTS,
  COSMETIC_SLOT_LABEL_KEYS,
  presetCosmeticByKey,
  type CosmeticSlot,
  type PresetCosmetic,
} from '../../data/cosmetics';
import { useCurrentAdventurer } from '../../hooks/useCurrentAdventurer';
import { useLexicon } from '../../hooks/useLexicon';
import { useTheme } from '../../hooks/useTheme';
import { playPackSound } from '../../lib/sounds';
import {
  useCosmeticCatalog,
  useEquipCosmetic,
  useGuildEntitlement,
  useOwnedCosmetics,
  usePurchaseCosmetic,
  type CosmeticItemRow,
} from '../../queries/cosmeticsQueries';

type SlotFilter = 'all' | CosmeticSlot;

type StoreEntry = {
  row: CosmeticItemRow;
  preset: PresetCosmetic;
  owned: boolean;
  equipped: boolean;
  premiumLocked: boolean;
};

/**
 * Cosmetic store: browse by slot, unlock with achievement points, equip.
 * Affordability and premium gates are rendered client-side but ENFORCED by
 * the purchase RPC — the buttons here are UX, not security.
 */
export default function CosmeticStoreScreen() {
  const router = useRouter();
  const { t } = useLexicon();
  const { pack } = useTheme();
  const { adventurerId, adventurer } = useCurrentAdventurer();

  const catalogQuery = useCosmeticCatalog();
  const ownedQuery = useOwnedCosmetics(adventurerId);
  const premiumQuery = useGuildEntitlement(adventurer?.guild_id);
  const purchaseMutation = usePurchaseCosmetic(adventurerId);
  const equipMutation = useEquipCosmetic(adventurerId);

  const [slotFilter, setSlotFilter] = useState<SlotFilter>('all');
  const [message, setMessage] = useState<string | null>(null);
  const messageTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showMessage = useCallback((text: string) => {
    if (messageTimer.current) clearTimeout(messageTimer.current);
    setMessage(text);
    messageTimer.current = setTimeout(() => setMessage(null), 4000);
  }, []);

  if (!adventurer) return null;

  const isPremiumGuild = premiumQuery.data ?? false;
  const ownedById = new Map((ownedQuery.data ?? []).map((row) => [row.cosmetic_id, row]));
  const points = adventurer.achievement_points;

  const entries: StoreEntry[] = (catalogQuery.data ?? [])
    .flatMap((row) => {
      const preset = presetCosmeticByKey(row.item_key);
      if (!preset) return []; // newer server catalog than this build
      const ownedRow = ownedById.get(row.id);
      return [
        {
          row,
          preset,
          owned: Boolean(ownedRow),
          equipped: ownedRow?.equipped ?? false,
          premiumLocked: row.premium_only && !isPremiumGuild,
        },
      ];
    })
    .filter((entry) => slotFilter === 'all' || entry.preset.slot === slotFilter);

  const busy = purchaseMutation.isPending || equipMutation.isPending;

  const handlePress = async (entry: StoreEntry) => {
    if (busy) return; // rapid-tap guard (UI layer; the DB guards for real)
    if (entry.premiumLocked) {
      showMessage(t('cosmetic_premium_nudge'));
      return;
    }
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      if (entry.owned) {
        await equipMutation.mutateAsync({
          cosmeticId: entry.row.id,
          equipped: !entry.equipped,
        });
        return;
      }
      if (entry.row.achievement_point_cost > points) {
        showMessage(t('cosmetic_need_more', { points: entry.row.achievement_point_cost - points }));
        return;
      }
      const status = await purchaseMutation.mutateAsync(entry.row.id);
      if (status === 'purchased' || status === 'already_owned') {
        playPackSound(pack, 'gold_pickup');
      } else if (status === 'insufficient_points') {
        showMessage(t('cosmetic_need_more', { points: entry.row.achievement_point_cost - points }));
      } else if (status === 'premium_required') {
        showMessage(t('cosmetic_premium_nudge'));
      }
    } catch {
      showMessage(t('error_generic'));
    }
  };

  const actionLabel = (entry: StoreEntry): string => {
    if (entry.premiumLocked) return t('cosmetic_premium_locked_label');
    if (entry.equipped) return t('unequip_action');
    if (entry.owned) return t('equip_action');
    if (entry.row.achievement_point_cost === 0) return t('unlock_action');
    return t('cosmetic_cost_label', { points: entry.row.achievement_point_cost });
  };

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
          <View className="flex-1">
            <Text className="text-text-primary text-2xl font-black">
              {t('cosmetic_store_title')}
            </Text>
            <Text className="text-text-muted text-xs font-semibold">
              {t('cosmetic_store_subtitle')}
            </Text>
          </View>
        </View>

        {/* Preview + balance */}
        <Card raised className="flex-row items-center gap-4 p-4">
          <AvatarRenderer config={adventurer.avatar_config} size={88} />
          <View className="gap-1">
            <Text className="text-text-muted text-xs font-extrabold uppercase tracking-widest">
              {t('achievement_points')}
            </Text>
            <View className="flex-row items-center gap-2">
              <Text className="text-2xl">🏅</Text>
              <Text className="text-accent-achievement text-2xl font-black">{points}</Text>
            </View>
          </View>
        </Card>

        {message ? (
          <Card className="border-accent-achievement border p-3">
            <Text className="text-text-primary text-sm font-semibold">{message}</Text>
          </Card>
        ) : null}

        {/* Slot filter */}
        <View className="flex-row gap-2">
          {(['all', ...COSMETIC_SLOTS] as const).map((slot) => (
            <Pressable
              key={slot}
              accessibilityRole="button"
              onPress={() => setSlotFilter(slot)}
              className={
                slotFilter === slot
                  ? 'bg-accent-achievement rounded-full px-4 py-2'
                  : 'bg-surface rounded-full px-4 py-2'
              }
            >
              <Text
                className={
                  slotFilter === slot
                    ? 'text-text-inverse text-xs font-extrabold'
                    : 'text-text-muted text-xs font-extrabold'
                }
              >
                {slot === 'all' ? t('filter_all') : t(COSMETIC_SLOT_LABEL_KEYS[slot])}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Items */}
        <View className="flex-row flex-wrap justify-between">
          {entries.map((entry) => (
            <Pressable
              key={entry.row.id}
              accessibilityRole="button"
              accessibilityLabel={t(entry.preset.nameKey)}
              disabled={busy}
              onPress={() => void handlePress(entry)}
              className="bg-surface border-border mb-3 w-[48%] items-center gap-2 rounded-3xl border p-4"
              style={entry.premiumLocked ? { opacity: 0.55 } : undefined}
            >
              <View className="bg-bg-base h-20 w-20 items-center justify-center rounded-2xl">
                <Image
                  source={pack.assets.cosmetics[entry.preset.key]}
                  resizeMode="contain"
                  style={{ width: 64, height: 64 }}
                />
              </View>
              <Text
                className="text-text-primary text-center text-sm font-extrabold"
                numberOfLines={1}
              >
                {t(entry.preset.nameKey)}
              </Text>
              <View
                className={
                  entry.equipped
                    ? 'bg-accent-progress rounded-full px-3 py-1'
                    : entry.owned
                      ? 'bg-accent-info rounded-full px-3 py-1'
                      : 'bg-surface-raised border-border rounded-full border px-3 py-1'
                }
              >
                <Text
                  className={
                    entry.owned
                      ? 'text-text-inverse text-xs font-extrabold'
                      : 'text-accent-achievement text-xs font-extrabold'
                  }
                >
                  {entry.equipped ? t('equipped_label') : actionLabel(entry)}
                </Text>
              </View>
            </Pressable>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
