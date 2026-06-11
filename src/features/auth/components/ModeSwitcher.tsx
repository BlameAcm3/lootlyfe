import { ROUTES } from '../../../../lib/routes';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Image, Pressable, Text, View } from 'react-native';

import { useModeStore } from '@/stores/modeStore';
import { Button, Input, Modal } from '../../../../components/ui';
import { useLexicon } from '../../../../hooks/useLexicon';
import { useAdventurers } from '../../../../queries/adventurerQueries';
import { useCurrentGuild, guildKeys } from '../../../../queries/guildQueries';
import { getThemePack } from '../../../../themes';
import { supabase } from '@/shared/lib/supabase';
import { useQueryClient } from '@tanstack/react-query';

type Step = 'closed' | 'choose' | 'set-pin' | 'verify-pin';

/**
 * Single-device mode toggle. NPC → adventurer is instant (after choosing the
 * adventurer; sets a PIN first if none exists). Adventurer → NPC requires the
 * 4-digit PIN, verified server-side against the bcrypt hash.
 */
export const ModeSwitcher = () => {
  const { t } = useLexicon();
  const router = useRouter();
  const queryClient = useQueryClient();
  const mode = useModeStore((state) => state.mode);
  const enterAdventurerMode = useModeStore((state) => state.enterAdventurerMode);
  const exitToNpcMode = useModeStore((state) => state.exitToNpcMode);
  const { guild, npcProfile } = useCurrentGuild();
  const adventurersQuery = useAdventurers(guild?.id);

  const [step, setStep] = useState<Step>('closed');
  const [pin, setPin] = useState('');
  const [pendingAdventurerId, setPendingAdventurerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const activeAdventurers = (adventurersQuery.data ?? []).filter((row) => !row.archived_at);

  const close = () => {
    setStep('closed');
    setPin('');
    setPendingAdventurerId(null);
    setError(null);
  };

  const startEnter = (adventurerId: string) => {
    if (npcProfile?.pin_hash) {
      enterAdventurerMode(adventurerId);
      close();
      router.replace(ROUTES.adventurerHome);
    } else {
      setPendingAdventurerId(adventurerId);
      setStep('set-pin');
    }
  };

  const savePinAndEnter = async () => {
    if (!/^[0-9]{4}$/.test(pin)) {
      setError(t('mode_pin_set_body'));
      return;
    }
    setBusy(true);
    try {
      const { error: rpcError } = await supabase.rpc('set_mode_pin', { p_pin: pin });
      if (rpcError) throw rpcError;
      // npcProfile.pin_hash is cached in the guild query — refresh it.
      await queryClient.invalidateQueries({ queryKey: guildKeys.all });
      if (pendingAdventurerId) {
        enterAdventurerMode(pendingAdventurerId);
        close();
        router.replace(ROUTES.adventurerHome);
      }
    } catch {
      setError(t('error_generic'));
    } finally {
      setBusy(false);
    }
  };

  const verifyPinAndExit = async () => {
    setBusy(true);
    try {
      await exitToNpcMode(pin);
      close();
      router.replace('/(parent)/(tabs)');
    } catch {
      setError(t('mode_pin_error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={{ position: 'absolute', bottom: 84, right: 16, zIndex: 40 }}>
      <Button
        accessibilityLabel={
          mode === 'parent' ? t('mode_enter_adventurer_action') : t('mode_back_to_npc_action')
        }
        label={mode === 'parent' ? `⚔️ ${t('mode_enter_adventurer_action')}` : `⚙️ ${t('npc')}`}
        size="sm"
        variant="gold"
        onPress={() => setStep(mode === 'parent' ? 'choose' : 'verify-pin')}
      />

      <Modal visible={step !== 'closed'} onClose={close}>
        {step === 'choose' ? (
          <View className="gap-3">
            <Text className="text-text-primary text-lg font-extrabold">
              {t('mode_choose_adventurer_title')}
            </Text>
            {activeAdventurers.length === 0 ? (
              <Text className="text-text-muted text-sm">{t('mode_no_adventurers_body')}</Text>
            ) : (
              activeAdventurers.map((adventurer) => {
                const pack = getThemePack(adventurer.theme_id);
                return (
                  <Pressable
                    key={adventurer.id}
                    accessibilityRole="button"
                    onPress={() => startEnter(adventurer.id)}
                    className="bg-bg-base flex-row items-center gap-3 rounded-2xl p-3"
                  >
                    <Image source={pack.assets.avatarBases[0]} className="h-8 w-8 rounded-full" />
                    <Text className="text-text-primary text-sm font-bold">
                      {adventurer.nickname}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        ) : null}

        {step === 'set-pin' ? (
          <View className="gap-3">
            <Text className="text-text-primary text-lg font-extrabold">
              {t('mode_pin_set_title')}
            </Text>
            <Text className="text-text-muted text-sm">{t('mode_pin_set_body')}</Text>
            <Input
              accessibilityLabel={t('mode_pin_label')}
              label={t('mode_pin_label')}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              value={pin}
              onChangeText={(value) => {
                setPin(value);
                setError(null);
              }}
              error={error ?? undefined}
            />
            <Button
              label={t('mode_pin_save_action')}
              disabled={busy}
              onPress={() => void savePinAndEnter()}
            />
          </View>
        ) : null}

        {step === 'verify-pin' ? (
          <View className="gap-3">
            <Text className="text-text-primary text-lg font-extrabold">{t('mode_pin_title')}</Text>
            <Text className="text-text-muted text-sm">{t('mode_pin_body')}</Text>
            <Input
              accessibilityLabel={t('mode_pin_label')}
              label={t('mode_pin_label')}
              keyboardType="number-pad"
              secureTextEntry
              maxLength={4}
              value={pin}
              onChangeText={(value) => {
                setPin(value);
                setError(null);
              }}
              error={error ?? undefined}
            />
            <Button
              label={t('mode_back_to_npc_action')}
              disabled={busy}
              onPress={() => void verifyPinAndExit()}
            />
          </View>
        ) : null}
      </Modal>
    </View>
  );
};
