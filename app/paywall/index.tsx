import { useState } from 'react';
import { Alert, Pressable, ScrollView, Text, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { PurchasesOffering, PurchasesPackage } from 'react-native-purchases';

import { Badge, Button, Card } from '../../components/ui';
import { useLexicon } from '../../hooks/useLexicon';
import type { LexiconKey } from '../../lib/lexicon';
import type { PaywallContext } from '../../lib/routes';
import { themePacks } from '../../themes';
import { FREE_TIER_LIMITS } from '../../constants/game';
import { guildKeys } from '../../queries/guildQueries';
import {
  getCurrentOffering,
  isRevenueCatAvailable,
  isUserCancelledError,
  purchasePackage,
  restorePurchases,
} from '../../lib/revenuecat';

const HEADLINE_KEY: Record<PaywallContext, LexiconKey> = {
  theme_lock: 'paywall_headline_theme_lock',
  adventurer_limit: 'paywall_headline_adventurer_limit',
  quest_limit: 'paywall_headline_quest_limit',
  loot_limit: 'paywall_headline_loot_limit',
  coparent: 'paywall_headline_coparent',
  history: 'paywall_headline_history',
  default: 'paywall_headline_default',
};

const isPaywallContext = (value: unknown): value is PaywallContext =>
  typeof value === 'string' && value in HEADLINE_KEY;

/** Locked premium theme preview — sells the theme packs visually (palette
 * swatches + name + lock). Dynamic colors → inline styles per the style rules. */
function LockedThemeCard({ name, swatches, lockLabel }: { name: string; swatches: string[]; lockLabel: string }) {
  return (
    <View className="border-border bg-surface flex-1 gap-2 rounded-2xl border p-3">
      <View className="flex-row gap-1.5">
        {swatches.map((color, i) => (
          <View key={i} className="h-7 flex-1 rounded-md" style={{ backgroundColor: color }} />
        ))}
      </View>
      <Text className="text-text-primary text-sm font-bold">{name}</Text>
      <View className="bg-surface-raised flex-row items-center gap-1 self-start rounded-full px-2 py-0.5">
        <Text className="text-xs">🔒</Text>
        <Text className="text-text-muted text-[10px] font-bold uppercase">{lockLabel}</Text>
      </View>
    </View>
  );
}

function LimitRow({ label, free, premium }: { label: string; free: string; premium: string }) {
  return (
    <View className="border-border flex-row items-center border-b py-2">
      <Text className="text-text-primary flex-1 text-sm">{label}</Text>
      <Text className="text-text-muted w-20 text-center text-xs font-semibold">{free}</Text>
      <Text className="text-accent-loot w-20 text-center text-xs font-extrabold">{premium}</Text>
    </View>
  );
}

function OfferingCard({
  label,
  priceString,
  trialLabel,
  highlight,
  disabled,
  busy,
  onPress,
}: {
  label: string;
  priceString: string;
  trialLabel?: string;
  highlight?: boolean;
  disabled?: boolean;
  busy?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => (pressed && !disabled ? { opacity: 0.85 } : undefined)}
      className={`flex-1 gap-1 rounded-2xl border p-4 ${
        highlight ? 'border-accent-loot bg-surface-raised' : 'border-border bg-surface'
      } ${disabled ? 'opacity-40' : ''}`}
    >
      <Text className="text-text-primary text-sm font-bold">{label}</Text>
      <Text className="text-text-primary text-xl font-extrabold">{busy ? '…' : priceString}</Text>
      {trialLabel ? <Badge label={trialLabel} tone="progress" /> : null}
    </Pressable>
  );
}

export default function PaywallScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const queryClient = useQueryClient();
  const params = useLocalSearchParams<{ context?: string }>();
  const context: PaywallContext = isPaywallContext(params.context) ? params.context : 'default';

  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);

  const offeringQuery = useQuery({
    queryKey: ['revenuecat', 'offering'],
    queryFn: getCurrentOffering,
    staleTime: 1000 * 60 * 5,
  });
  const offering: PurchasesOffering | null = offeringQuery.data ?? null;
  const available = isRevenueCatAvailable();

  const premiumThemes = Object.values(themePacks).filter((pack) => pack.premium);

  const limitRows: { key: LexiconKey; free: string; premium: string }[] = [
    { key: 'paywall_grid_npcs', free: String(FREE_TIER_LIMITS.npc_accounts), premium: '4' },
    {
      key: 'paywall_grid_adventurers',
      free: String(FREE_TIER_LIMITS.adventurers),
      premium: t('paywall_value_unlimited'),
    },
    {
      key: 'paywall_grid_quests',
      free: String(FREE_TIER_LIMITS.custom_quests),
      premium: t('paywall_value_unlimited'),
    },
    {
      key: 'paywall_grid_loot',
      free: String(FREE_TIER_LIMITS.custom_loot),
      premium: t('paywall_value_unlimited'),
    },
    {
      key: 'paywall_grid_history',
      free: `${FREE_TIER_LIMITS.history_days}d`,
      premium: t('paywall_value_unlimited'),
    },
    { key: 'paywall_grid_cosmetics', free: '—', premium: '✓' },
    { key: 'paywall_grid_scheduling', free: '—', premium: '✓' },
  ];

  const onPurchase = async (pkg: PurchasesPackage | null | undefined) => {
    if (!pkg) return;
    setPurchasing(pkg.identifier);
    try {
      await purchasePackage(pkg);
      // Entitlement is written server-side by the webhook; refetch the guild so
      // the client reflects premium (also arrives via realtime on other devices).
      await queryClient.invalidateQueries({ queryKey: guildKeys.all });
      router.back();
    } catch (error) {
      if (!isUserCancelledError(error)) Alert.alert(t('paywall_purchase_error'));
    } finally {
      setPurchasing(null);
    }
  };

  const onRestore = async () => {
    setRestoring(true);
    try {
      const { isPremium } = await restorePurchases();
      await queryClient.invalidateQueries({ queryKey: guildKeys.all });
      Alert.alert(isPremium ? t('paywall_restored_success') : t('paywall_restored_none'));
      if (isPremium) router.back();
    } catch {
      Alert.alert(t('paywall_purchase_error'));
    } finally {
      setRestoring(false);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 20, gap: 18 }}>
        <View className="items-center gap-2 pt-6">
          <Text className="text-6xl">🏆</Text>
          <Badge label={t('premium_lock_label')} tone="loot" />
          <Text className="text-text-primary text-center text-3xl font-extrabold">
            {t(HEADLINE_KEY[context])}
          </Text>
          <Text className="text-text-muted max-w-xs text-center text-sm">{t('paywall_subtitle')}</Text>
        </View>

        {/* Theme-forward visual sell: the locked premium theme packs. */}
        <View className="gap-2">
          <Text className="text-text-primary text-base font-bold">{t('paywall_theme_sell_title')}</Text>
          <View className="flex-row gap-3">
            {premiumThemes.map((pack) => (
              <LockedThemeCard
                key={pack.id}
                name={pack.name}
                lockLabel={t('paywall_locked_theme_label')}
                swatches={[
                  pack.palette['bg-base'],
                  pack.palette['accent-loot'],
                  pack.palette['accent-progress'],
                  pack.palette['accent-achievement'],
                ]}
              />
            ))}
          </View>
        </View>

        {/* Free vs Legendary limit grid. */}
        <Card className="gap-1">
          <View className="flex-row items-center pb-1">
            <Text className="text-text-primary flex-1 text-base font-bold">
              {t('paywall_limit_grid_title')}
            </Text>
            <Text className="text-text-muted w-20 text-center text-[10px] font-bold uppercase">
              {t('paywall_grid_col_free')}
            </Text>
            <Text className="text-accent-loot w-20 text-center text-[10px] font-bold uppercase">
              {t('paywall_grid_col_premium')}
            </Text>
          </View>
          {limitRows.map((row) => (
            <LimitRow key={row.key} label={t(row.key)} free={row.free} premium={row.premium} />
          ))}
        </Card>

        {/* Offerings. */}
        {available && offering ? (
          <View className="flex-row gap-3">
            {offering.monthly ? (
              <OfferingCard
                label={t('paywall_monthly_label')}
                priceString={offering.monthly.product.priceString}
                busy={purchasing === offering.monthly.identifier}
                disabled={Boolean(purchasing)}
                onPress={() => onPurchase(offering.monthly)}
              />
            ) : null}
            {offering.annual ? (
              <OfferingCard
                label={t('paywall_annual_label')}
                priceString={offering.annual.product.priceString}
                trialLabel={t('paywall_trial_badge')}
                highlight
                busy={purchasing === offering.annual.identifier}
                disabled={Boolean(purchasing)}
                onPress={() => onPurchase(offering.annual)}
              />
            ) : null}
          </View>
        ) : (
          <View className="bg-surface border-border self-center rounded-full border px-4 py-1.5">
            <Text className="text-text-muted text-center text-xs font-bold">
              {available ? t('paywall_price_line') : t('paywall_unavailable_note')}
            </Text>
          </View>
        )}

        {available ? (
          <Button
            label={t('paywall_restore_action')}
            variant="ghost"
            disabled={restoring || Boolean(purchasing)}
            onPress={onRestore}
          />
        ) : null}
        <Button label={t('not_now_action')} variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}
