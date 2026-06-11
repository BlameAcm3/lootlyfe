import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Badge, Button, Card } from '../../components/ui';
import { useLexicon } from '../../hooks/useLexicon';

/**
 * Paywall STUB — the upgrade-nudge destination. The RevenueCat purchase flow
 * (react-native-purchases-ui) replaces the body in the monetization pass;
 * entitlement updates arrive via the revenuecat-webhook Edge Function.
 */
export default function PaywallScreen() {
  const { t } = useLexicon();
  const router = useRouter();

  const benefits = [
    t('paywall_benefit_npcs'),
    t('paywall_benefit_adventurers'),
    t('paywall_benefit_quests'),
    t('paywall_benefit_themes'),
  ];

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
        <View className="items-center gap-2 pt-8">
          <Text className="text-6xl">🏆</Text>
          <Badge label={t('premium_lock_label')} tone="loot" />
          <Text className="text-text-primary text-3xl font-extrabold">{t('paywall_title')}</Text>
          <Text className="text-text-muted max-w-xs text-center text-sm">
            {t('paywall_subtitle')}
          </Text>
        </View>

        <Card raised className="gap-3.5 p-5">
          {benefits.map((benefit) => (
            <View key={benefit} className="flex-row items-center gap-3">
              <View className="bg-accent-progress h-6 w-6 items-center justify-center rounded-full">
                <Text className="text-text-inverse text-xs font-black">✓</Text>
              </View>
              <Text className="text-text-primary flex-1 text-sm font-semibold">{benefit}</Text>
            </View>
          ))}
        </Card>

        <View className="bg-surface border-border self-center rounded-full border px-4 py-1.5">
          <Text className="text-text-muted text-center text-xs font-bold">
            {t('paywall_price_line')}
          </Text>
        </View>

        <Button label={t('upgrade_action')} variant="gold" size="lg" disabled />
        <Button label={t('not_now_action')} variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </SafeAreaView>
  );
}
