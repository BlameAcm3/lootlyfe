import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Card, Input, StarfieldBackground } from '../components/ui';
import { useLexicon } from '../hooks/useLexicon';
import { InviteError, useAcceptGuildInvite, type InviteErrorCode } from '../queries/invitesQueries';
import type { LexiconKey } from '../lib/lexicon';

const ERROR_COPY: Record<InviteErrorCode, LexiconKey> = {
  invite_not_found: 'invite_error_not_found',
  invite_expired: 'invite_error_expired',
  invite_already_used: 'invite_error_used',
  already_member: 'invite_error_already_member',
  premium_required: 'invite_error_limit',
  npc_seat_limit_reached: 'invite_error_limit',
  not_a_guild_npc: 'invite_error_generic',
  requires_full_account: 'invite_error_generic',
  generic: 'invite_error_generic',
};

/**
 * Co-parent invite acceptance. The invitee has already created their own NPC
 * account (Supabase Auth); entering the code attaches them to the existing
 * guild as an admin (accept_guild_invite RPC, premium-gated server-side).
 * Reachable as a standalone route so a freshly-signed-up co-parent skips guild
 * creation; a ?code= deep-link param prefills it.
 */
export default function AcceptInviteScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const params = useLocalSearchParams<{ code?: string }>();
  const accept = useAcceptGuildInvite();
  const [code, setCode] = useState((params.code ?? '').toUpperCase());
  const [error, setError] = useState<string | null>(null);

  const handleAccept = async () => {
    if (code.trim().length < 8) {
      setError(t('invite_error_not_found'));
      return;
    }
    setError(null);
    try {
      await accept.mutateAsync({ code });
      router.replace('/(parent)/(tabs)/family');
    } catch (e) {
      const codeKey = e instanceof InviteError ? ERROR_COPY[e.code] : 'invite_error_generic';
      setError(t(codeKey));
    }
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <StarfieldBackground />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView contentContainerStyle={{ padding: 20, gap: 16 }}>
          <View className="items-center gap-1 pt-8">
            <Text className="text-5xl">🤝</Text>
            <Text className="text-text-primary text-3xl font-extrabold">
              {t('invite_accept_title')}
            </Text>
            <Text className="text-text-muted max-w-xs text-center text-sm">
              {t('invite_accept_subtitle')}
            </Text>
          </View>

          <Card className="gap-4">
            <Input
              accessibilityLabel={t('invite_code_label')}
              label={t('invite_code_label')}
              placeholder="ABCD2345"
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
              value={code}
              onChangeText={(value) => {
                setCode(value.toUpperCase());
                setError(null);
              }}
            />
            {error ? <Text className="text-danger text-xs">{error}</Text> : null}
            <Button
              accessibilityLabel={t('invite_accept_action')}
              label={t('invite_accept_action')}
              size="lg"
              disabled={accept.isPending}
              onPress={handleAccept}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
