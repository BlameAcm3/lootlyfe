import { ROUTES } from '../../lib/routes';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import * as Device from 'expo-device';
import { Pressable, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/ui';
import { useLexicon } from '../../hooks/useLexicon';
import { PairError, usePairDevice } from '../../queries/pairingQueries';
import { ThemeScope } from '../../themes/ThemeProvider';
import { supabase } from '@/shared/lib/supabase';
import { useSession } from '@/features/auth';

const CODE_LENGTH = 6;

function PairScreenBody() {
  const { t } = useLexicon();
  const router = useRouter();
  const { session, isLoading } = useSession();
  const mutation = usePairDevice();
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Kid devices authenticate via Supabase anonymous auth; create the session
  // silently the moment the pairing screen opens.
  useEffect(() => {
    if (!isLoading && !session) {
      void supabase.auth.signInAnonymously();
    }
  }, [isLoading, session]);

  const submit = async (value: string) => {
    if (mutation.isPending) return;
    setError(null);
    try {
      await mutation.mutateAsync({
        code: value,
        label: Device.modelName ?? undefined,
      });
      router.replace(ROUTES.adventurerHome);
    } catch (pairError) {
      const errorCode = pairError instanceof PairError ? pairError.code : 'generic';
      const key =
        errorCode === 'code_not_found'
          ? 'pair_error_wrong_code'
          : errorCode === 'code_expired'
            ? 'pair_error_expired'
            : errorCode === 'code_already_used'
              ? 'pair_error_used'
              : 'pair_error_generic';
      setError(t(key));
      setCode('');
    }
  };

  const handleChange = (value: string) => {
    const digits = value.replace(/[^0-9]/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    setError(null);
    if (digits.length === CODE_LENGTH) {
      void submit(digits);
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <View className="flex-1 items-center justify-center gap-6 p-6">
        <Text className="text-6xl">🗝️</Text>
        <Text className="text-text-primary text-center text-2xl font-extrabold">
          {t('pairing_title')}
        </Text>
        <Text className="text-text-muted max-w-xs text-center text-base leading-6">
          {t('pair_enter_code_hint')}
        </Text>

        <Pressable
          accessibilityLabel={t('pair_enter_code_hint')}
          onPress={() => inputRef.current?.focus()}
          className="flex-row gap-2"
        >
          {Array.from({ length: CODE_LENGTH }).map((_, index) => (
            <View
              key={index}
              className={
                index === code.length
                  ? 'border-accent-info bg-surface-raised h-16 w-12 items-center justify-center rounded-2xl border-2'
                  : 'border-border bg-surface-raised h-16 w-12 items-center justify-center rounded-2xl border'
              }
            >
              <Text className="text-text-primary text-3xl font-black">{code[index] ?? ''}</Text>
            </View>
          ))}
        </Pressable>
        {/* Hidden input drives the boxes (number pad, autofocus). */}
        <TextInput
          ref={inputRef}
          autoFocus
          keyboardType="number-pad"
          maxLength={CODE_LENGTH}
          value={code}
          onChangeText={handleChange}
          style={{ position: 'absolute', opacity: 0, height: 1, width: 1 }}
        />

        {error ? (
          <Text className="text-danger max-w-xs text-center text-sm font-semibold">{error}</Text>
        ) : null}

        <Button
          label={t('pair_submit_action')}
          size="lg"
          disabled={code.length < CODE_LENGTH || mutation.isPending}
          onPress={() => void submit(code)}
        />
      </View>
    </SafeAreaView>
  );
}

export default function PairScreen() {
  // Pairing happens pre-binding, so no adventurer theme yet: high-fantasy default.
  return (
    <ThemeScope>
      <PairScreenBody />
    </ThemeScope>
  );
}
