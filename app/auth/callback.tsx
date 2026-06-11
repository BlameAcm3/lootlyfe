import { useEffect, useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/ui';
import { useLexicon } from '../../hooks/useLexicon';
import { supabase } from '@/shared/lib/supabase';

/**
 * Deep-link target for Supabase email links (PKCE):
 *   lootlyfe://auth/callback?code=...        -> exchange for a session
 *   ...#error=...&error_code=otp_expired     -> friendly retry copy
 * The redirect URL must be allowlisted in the dashboard (Auth > URL
 * Configuration); errors arrive in the URL fragment, which native deep links
 * surface as params too.
 */
export default function AuthCallbackScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string; error_code?: string; error?: string }>();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (params.error || params.error_code) {
        setFailed(true);
        return;
      }
      if (!params.code) {
        // Nothing to exchange (e.g. opened manually) — bounce to sign-in.
        router.replace('/(auth)/sign-in');
        return;
      }
      const { error } = await supabase.auth.exchangeCodeForSession(params.code);
      if (cancelled) return;
      if (error) {
        setFailed(true);
        return;
      }
      router.replace('/(parent)/(tabs)');
    };

    void run();
    return () => {
      cancelled = true;
    };
    // params are stable for a given deep-link open.
  }, [params.code, params.error, params.error_code, router]);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <View className="flex-1 items-center justify-center gap-5 p-6">
        {failed ? (
          <>
            <Text className="text-5xl">⏳</Text>
            <Text className="text-text-muted max-w-xs text-center text-base leading-6">
              {t('auth_callback_failed')}
            </Text>
            <Button
              label={t('auth_sign_in_action')}
              onPress={() => router.replace('/(auth)/sign-in')}
            />
          </>
        ) : (
          <>
            <ActivityIndicator />
            <Text className="text-text-muted text-base">{t('auth_callback_verifying')}</Text>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}
