import { useState } from 'react';
import { Alert, Linking, Platform, ScrollView, Switch, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSignOut } from '@/features/auth';
import { useSubscription } from '@/features/subscriptions';
import { env } from '@/shared/lib/env';
import { resetLocalStateAndSignOut } from '@/shared/lib/resetAppState';
import { Badge, Button, Card, Input } from '../../components/ui';
import { useLexicon } from '../../hooks/useLexicon';
import type { LexiconKey } from '../../lib/lexicon';
import { useCurrentGuild, useDeleteGuild } from '../../queries/guildQueries';
import { useAdventurers } from '../../queries/adventurerQueries';
import { useGuildDeviceBindings, useRevokeGuildBinding } from '../../queries/pairingQueries';
import {
  MUTABLE_EVENT_TYPES,
  isAdventurerMuted,
  isEventMuted,
  useNotificationMutes,
  useNotificationSettings,
  useToggleAdventurerMute,
  useToggleEventMute,
  useUpdateNotificationSettings,
  type MutableEventType,
} from '../../queries/notificationsQueries';

// 9:00 PM – 7:00 AM default quiet window (kept simple — a toggle, not a picker).
const QUIET_START = '21:00:00';
const QUIET_END = '07:00:00';

const EVENT_LABEL_KEYS: Record<MutableEventType, LexiconKey> = {
  quest_completed: 'notif_event_quest_completed',
  redemption_requested: 'notif_event_redemption_requested',
  wishlist_proposed: 'notif_event_wishlist_proposed',
};

// Platform store subscription-management deep links.
const STORE_SUBSCRIPTION_URL =
  Platform.OS === 'ios'
    ? 'itms-apps://apps.apple.com/account/subscriptions'
    : 'https://play.google.com/store/account/subscriptions';

function ToggleRow({
  label,
  value,
  onValueChange,
  disabled,
}: {
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <View className="flex-row items-center justify-between gap-3">
      <Text className="text-text-primary flex-1 text-sm">{label}</Text>
      <Switch value={value} onValueChange={onValueChange} disabled={disabled} />
    </View>
  );
}

function SubscriptionCard() {
  const { t } = useLexicon();
  const { isEntitled, openPaywall } = useSubscription();
  return (
    <Card className="gap-3">
      <Text className="text-text-primary text-base font-bold">{t('settings_subscription_label')}</Text>
      <View className="flex-row items-center gap-2">
        <Badge
          label={isEntitled ? t('premium_lock_label') : t('paywall_grid_col_free')}
          tone={isEntitled ? 'loot' : 'muted'}
        />
        <Text className="text-text-muted flex-1 text-sm">
          {isEntitled ? t('settings_subscription_premium_status') : t('settings_subscription_free_status')}
        </Text>
      </View>
      {isEntitled ? (
        <Button
          label={t('settings_manage_subscription_action')}
          variant="ghost"
          onPress={() => Linking.openURL(STORE_SUBSCRIPTION_URL)}
        />
      ) : (
        <Button label={t('settings_upgrade_action')} variant="gold" onPress={() => openPaywall('default')} />
      )}
    </Card>
  );
}

function DevicesCard() {
  const { t } = useLexicon();
  const { guild } = useCurrentGuild();
  const bindingsQuery = useGuildDeviceBindings(guild?.id);
  const adventurersQuery = useAdventurers(guild?.id);
  const revoke = useRevokeGuildBinding();

  const nicknameFor = (adventurerId: string) =>
    (adventurersQuery.data ?? []).find((a) => a.id === adventurerId)?.nickname ?? '';
  const bindings = bindingsQuery.data ?? [];

  const confirmRevoke = (bindingId: string) =>
    Alert.alert(t('device_revoke_action'), undefined, [
      { text: t('cancel_action'), style: 'cancel' },
      { text: t('device_revoke_action'), style: 'destructive', onPress: () => revoke.mutate(bindingId) },
    ]);

  return (
    <Card className="gap-3">
      <Text className="text-text-primary text-base font-bold">{t('settings_devices_label')}</Text>
      <Text className="text-text-muted text-xs">{t('settings_devices_hint')}</Text>
      {bindings.length === 0 ? (
        <Text className="text-text-muted text-sm">{t('no_devices_label')}</Text>
      ) : (
        bindings.map((binding) => {
          const revoked = Boolean(binding.revoked_at);
          return (
            <View
              key={binding.id}
              className="bg-bg-base flex-row items-center gap-3 rounded-2xl p-3"
              style={revoked ? { opacity: 0.55 } : undefined}
            >
              <Text className="text-2xl">📱</Text>
              <View className="flex-1">
                <Text className="text-text-primary text-sm font-bold">
                  {nicknameFor(binding.adventurer_id) || binding.label || t('device_default_label')}
                </Text>
                <Text className="text-text-muted text-xs">
                  {t('device_last_seen', {
                    time: new Date(binding.last_seen_at ?? binding.created_at).toLocaleDateString(),
                  })}
                </Text>
              </View>
              {revoked ? (
                <Badge label={t('device_revoked_label')} tone="muted" />
              ) : (
                <Button
                  label={t('device_revoke_action')}
                  size="sm"
                  variant="danger"
                  disabled={revoke.isPending}
                  onPress={() => confirmRevoke(binding.id)}
                />
              )}
            </View>
          );
        })
      )}
    </Card>
  );
}

function NotificationsCard() {
  const { t } = useLexicon();
  const { guild, npcProfile } = useCurrentGuild();
  const npcId = npcProfile?.id ?? null;
  const settingsQuery = useNotificationSettings(npcId);
  const mutesQuery = useNotificationMutes(npcId);
  const adventurersQuery = useAdventurers(guild?.id);
  const updateSettings = useUpdateNotificationSettings(npcId ?? '');
  const toggleEvent = useToggleEventMute(npcId ?? '');
  const toggleAdventurer = useToggleAdventurerMute(npcId ?? '');

  if (!npcId) return null;

  const settings = settingsQuery.data;
  const mutes = mutesQuery.data ?? [];
  const masterOn = settings?.master_enabled ?? true;
  const quietOn = Boolean(settings?.quiet_hours_start);
  const adventurers = (adventurersQuery.data ?? []).filter((a) => !a.archived_at);

  return (
    <Card className="gap-4">
      <Text className="text-text-primary text-base font-bold">
        {t('settings_notifications_label')}
      </Text>

      <View className="gap-1">
        <ToggleRow
          label={t('notif_master_label')}
          value={masterOn}
          onValueChange={(v) => updateSettings.mutate({ master_enabled: v })}
        />
        <Text className="text-text-muted text-xs">{t('notif_master_hint')}</Text>
      </View>

      <View className="gap-1">
        <ToggleRow
          label={t('notif_quiet_hours_label')}
          value={quietOn}
          disabled={!masterOn}
          onValueChange={(v) =>
            updateSettings.mutate({
              quiet_hours_start: v ? QUIET_START : null,
              quiet_hours_end: v ? QUIET_END : null,
            })
          }
        />
        <Text className="text-text-muted text-xs">{t('notif_quiet_hours_hint')}</Text>
      </View>

      <Text className="text-text-muted text-xs font-semibold uppercase">
        {t('notif_events_label')}
      </Text>
      {MUTABLE_EVENT_TYPES.map((event) => (
        <ToggleRow
          key={event}
          label={t(EVENT_LABEL_KEYS[event])}
          value={!isEventMuted(mutes, event)}
          disabled={!masterOn}
          onValueChange={(v) => toggleEvent.mutate({ event, muted: !v })}
        />
      ))}

      {adventurers.length > 0 ? (
        <>
          <Text className="text-text-muted text-xs font-semibold uppercase">
            {t('notif_adventurers_label')}
          </Text>
          {adventurers.map((a) => (
            <ToggleRow
              key={a.id}
              label={a.nickname}
              value={!isAdventurerMuted(mutes, a.id)}
              disabled={!masterOn}
              onValueChange={(v) => toggleAdventurer.mutate({ adventurerId: a.id, muted: !v })}
            />
          ))}
        </>
      ) : null}
    </Card>
  );
}

function DeleteGuildCard() {
  const { t } = useLexicon();
  const router = useRouter();
  const { guild, npcProfile } = useCurrentGuild();
  const deleteGuild = useDeleteGuild();
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  // Owner-only (server also enforces). Admins don't see the delete control.
  if (!guild || npcProfile?.role !== 'owner') return null;

  const canDelete = typed.trim() === guild.name && !busy;

  const onDelete = async () => {
    setBusy(true);
    try {
      await deleteGuild.mutateAsync(guild.id);
      await resetLocalStateAndSignOut();
      router.replace('/(auth)/sign-in');
    } catch {
      Alert.alert(t('error_generic'));
      setBusy(false);
    }
  };

  return (
    <Card className="gap-3">
      <Text className="text-danger text-base font-bold">{t('settings_delete_guild_label')}</Text>
      <Text className="text-text-muted text-sm">{t('settings_delete_guild_body')}</Text>
      {confirmVisible ? (
        <View className="gap-3">
          <Text className="text-text-muted text-sm">{t('settings_delete_confirm_body')}</Text>
          <Input
            accessibilityLabel={t('settings_delete_confirm_input_label', { name: guild.name })}
            label={t('settings_delete_confirm_input_label', { name: guild.name })}
            value={typed}
            onChangeText={setTyped}
            autoCapitalize="none"
            autoCorrect={false}
          />
          <Button
            label={t('settings_delete_confirm_action')}
            variant="danger"
            disabled={!canDelete}
            onPress={onDelete}
          />
          <Button
            label={t('cancel_action')}
            variant="ghost"
            disabled={busy}
            onPress={() => {
              setConfirmVisible(false);
              setTyped('');
            }}
          />
        </View>
      ) : (
        <Button
          label={t('settings_delete_guild_action')}
          variant="danger"
          onPress={() => setConfirmVisible(true)}
        />
      )}
    </Card>
  );
}

export default function ParentSettingsScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const signOutMutation = useSignOut();
  const [resetting, setResetting] = useState(false);

  const confirmFullReset = () => {
    Alert.alert(t('settings_reset_title'), t('settings_reset_confirm_body'), [
      { text: t('cancel_action'), style: 'cancel' },
      {
        text: t('settings_reset_action'),
        style: 'destructive',
        onPress: async () => {
          setResetting(true);
          try {
            await resetLocalStateAndSignOut();
            router.replace('/(auth)/sign-in');
          } catch {
            Alert.alert(t('error_generic'));
          } finally {
            setResetting(false);
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="gap-1 pt-2">
          <Text className="text-text-primary text-2xl font-extrabold">{t('settings_title')}</Text>
          <Text className="text-text-muted text-sm">{t('settings_subtitle')}</Text>
        </View>

        <SubscriptionCard />

        <Card className="gap-3">
          <Text className="text-text-primary text-base font-bold">{t('settings_adventurers_label')}</Text>
          <Text className="text-text-muted text-xs">{t('settings_adventurers_hint')}</Text>
          <Button
            label={t('settings_manage_adventurers_action')}
            variant="ghost"
            onPress={() => router.push('/(parent)/(tabs)/family')}
          />
        </Card>

        <DevicesCard />

        <NotificationsCard />

        <Card className="gap-3">
          <Text className="text-text-primary text-base font-bold">{t('settings_data_label')}</Text>
          <Text className="text-text-muted text-xs">{t('settings_export_hint')}</Text>
          <Button
            label={t('settings_export_action')}
            variant="ghost"
            onPress={() => router.push('/(parent)/data-export')}
          />
        </Card>

        <Card className="gap-3">
          <Text className="text-text-primary text-base font-bold">{t('settings_legal_label')}</Text>
          <Button
            label={t('settings_privacy_action')}
            variant="ghost"
            onPress={() => Linking.openURL(env.privacyUrl)}
          />
          <Button
            label={t('settings_terms_action')}
            variant="ghost"
            onPress={() => Linking.openURL(env.termsUrl)}
          />
        </Card>

        <Card className="gap-3">
          <Text className="text-text-primary text-base font-bold">
            {t('settings_session_label')}
          </Text>
          <Button
            accessibilityLabel={t('sign_out_action')}
            label={t('sign_out_action')}
            variant="ghost"
            disabled={signOutMutation.isPending}
            onPress={async () => {
              try {
                await signOutMutation.mutateAsync();
                router.replace('/(auth)/sign-in');
              } catch {
                Alert.alert(t('error_generic'));
              }
            }}
          />
        </Card>

        <DeleteGuildCard />

        <Card className="gap-3">
          <Text className="text-danger text-base font-bold">{t('settings_reset_title')}</Text>
          <Text className="text-text-muted text-sm">{t('settings_reset_body')}</Text>
          <Button
            accessibilityLabel={t('settings_reset_action')}
            label={t('settings_reset_action')}
            variant="danger"
            disabled={resetting}
            onPress={confirmFullReset}
          />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}
