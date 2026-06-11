import { useState } from 'react';
import { Alert, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSignOut } from '@/features/auth';
import { resetLocalStateAndSignOut } from '@/shared/lib/resetAppState';
import { Button, Card } from '../../components/ui';
import { useLexicon } from '../../hooks/useLexicon';

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
