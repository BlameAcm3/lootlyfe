import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdventurerForm, isAgeBucket } from '../../../components/forms/AdventurerForm';
import { Badge, Button, Card, Modal } from '../../../components/ui';
import { useLexicon } from '../../../hooks/useLexicon';
import { useAdventurers, useUpdateAdventurer } from '../../../queries/adventurerQueries';
import { useCurrentGuild } from '../../../queries/guildQueries';
import { useSubscription } from '@/features/subscriptions';
import {
  useCreatePairingCode,
  useDeviceBindings,
  useRevokeBinding,
} from '../../../queries/pairingQueries';
import { getThemePack, themePacks, type ThemeId } from '../../../themes';

function formatCountdown(msLeft: number) {
  const totalSeconds = Math.max(0, Math.floor(msLeft / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function PairCodeModal({
  adventurerId,
  visible,
  onClose,
}: {
  adventurerId: string;
  visible: boolean;
  onClose: () => void;
}) {
  const { t } = useLexicon();
  const mutation = useCreatePairingCode();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!visible) return;
    mutation.mutate(adventurerId);
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
    // Intentionally only re-runs on open: mutation identity is unstable.
  }, [visible, adventurerId]);

  const expiresAt = mutation.data ? new Date(mutation.data.expires_at).getTime() : null;
  const msLeft = expiresAt ? expiresAt - now : null;
  const expired = msLeft !== null && msLeft <= 0;

  return (
    <Modal visible={visible} onClose={onClose}>
      <View className="items-center gap-4 py-2">
        <Text className="text-text-primary text-lg font-extrabold">{t('pair_device_action')}</Text>
        <Text className="text-text-muted text-center text-sm">{t('pairing_code_hint')}</Text>

        {mutation.data ? (
          <>
            <View className="flex-row gap-1.5">
              {mutation.data.code.split('').map((digit, index) => (
                <View
                  key={index}
                  className="bg-bg-base h-14 w-10 items-center justify-center rounded-xl"
                >
                  <Text className="text-text-primary text-3xl font-black">{digit}</Text>
                </View>
              ))}
            </View>
            <Text className={expired ? 'text-danger text-sm font-bold' : 'text-text-muted text-sm'}>
              {expired
                ? t('pairing_code_expired')
                : t('pairing_code_expires_in', { time: formatCountdown(msLeft ?? 0) })}
            </Text>
          </>
        ) : (
          <Text className="text-text-muted text-sm">…</Text>
        )}

        <Button
          label={t('regenerate_code_action')}
          variant="ghost"
          disabled={mutation.isPending}
          onPress={() => mutation.mutate(adventurerId)}
        />
        <Button label={t('not_now_action')} onPress={onClose} />
      </View>
    </Modal>
  );
}

export default function EditAdventurerScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { guild } = useCurrentGuild();
  const { isPremium, lockedIdsFor, openPaywall } = useSubscription();
  const adventurersQuery = useAdventurers(guild?.id);
  const mutation = useUpdateAdventurer(guild?.id ?? '');
  const bindingsQuery = useDeviceBindings(id);
  const revokeMutation = useRevokeBinding(id ?? '');
  const [pairVisible, setPairVisible] = useState(false);

  const adventurer = (adventurersQuery.data ?? []).find((row) => row.id === id) ?? null;
  if (!guild || !adventurer) return null;

  const isArchived = Boolean(adventurer.archived_at);
  const bindings = bindingsQuery.data ?? [];
  // Downgrade matrix: on a lapsed (free) guild the newest adventurers beyond the
  // free limit are read-only — profile editing is locked, but their already-
  // paired kid devices keep working (device list + archive stay available).
  const active = (adventurersQuery.data ?? []).filter((row) => !row.archived_at);
  const isLocked = lockedIdsFor('adventurers', active).has(adventurer.id);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="pt-2">
          <Text className="text-text-primary text-2xl font-extrabold">
            {t('adventurer_edit_title')}
          </Text>
        </View>

        {isLocked ? (
          <Card className="gap-3">
            <View className="flex-row items-center gap-2">
              <Text className="text-xl">🔒</Text>
              <Text className="text-text-primary text-base font-bold">{adventurer.nickname}</Text>
              <Badge label={t('locked_badge_label')} tone="muted" />
            </View>
            <Text className="text-text-muted text-sm leading-5">{t('locked_upgrade_nudge')}</Text>
            <Text className="text-text-muted text-xs">
              {getThemePack(adventurer.theme_id).name} · {adventurer.age_bucket}
            </Text>
            <Button
              label={t('upgrade_action')}
              variant="gold"
              onPress={() => openPaywall('adventurer_limit')}
            />
          </Card>
        ) : (
          <AdventurerForm
            initial={{
              nickname: adventurer.nickname,
              ageBucket: isAgeBucket(adventurer.age_bucket) ? adventurer.age_bucket : '5-8',
              themeId: (adventurer.theme_id in themePacks
                ? adventurer.theme_id
                : 'high-fantasy') as ThemeId,
              variantId: adventurer.variant_id,
            }}
            guildIsPremium={isPremium}
            submitting={mutation.isPending}
            onSubmit={(values) => {
              // Optimistic: the list cache is patched immediately (rollback on error).
              mutation.mutate({
                id: adventurer.id,
                patch: {
                  nickname: values.nickname,
                  age_bucket: values.ageBucket,
                  theme_id: values.themeId,
                  variant_id: values.variantId,
                },
              });
              router.back();
            }}
          />
        )}

        {/* Paired devices */}
        <Card className="gap-3">
          <View className="flex-row items-center justify-between">
            <Text className="text-text-primary text-base font-bold">
              {t('devices_section_label')}
            </Text>
            <Button
              label={t('pair_device_action')}
              size="sm"
              onPress={() => setPairVisible(true)}
            />
          </View>

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
                      {binding.label ?? t('device_default_label')}
                    </Text>
                    <Text className="text-text-muted text-xs">
                      {t('device_last_seen', {
                        time: new Date(binding.last_seen_at ?? binding.created_at).toLocaleString(),
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
                      disabled={revokeMutation.isPending}
                      onPress={() => revokeMutation.mutate(binding.id)}
                    />
                  )}
                </View>
              );
            })
          )}
        </Card>

        <Button
          label={isArchived ? t('adventurer_restore_action') : t('adventurer_archive_action')}
          variant={isArchived ? 'primary' : 'danger'}
          onPress={() => {
            mutation.mutate({
              id: adventurer.id,
              patch: { archived_at: isArchived ? null : new Date().toISOString() },
            });
            router.back();
          }}
        />
      </ScrollView>

      <PairCodeModal adventurerId={adventurer.id} visible={pairVisible} onClose={() => setPairVisible(false)} />
    </SafeAreaView>
  );
}
