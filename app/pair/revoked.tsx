import { ROUTES } from '../../lib/routes';
import { useRouter } from 'expo-router';
import { Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button } from '../../components/ui';
import { useLexicon } from '../../hooks/useLexicon';
import { ThemeScope } from '../../themes/ThemeProvider';

/** Friendly landing for a kid device whose binding was revoked by an NPC. */
export default function PairRevokedScreen() {
  const { t } = useLexicon();
  const router = useRouter();

  return (
    <ThemeScope>
      <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
        <View className="flex-1 items-center justify-center gap-5 p-6">
          <Text className="text-6xl">🌙</Text>
          <Text className="text-text-primary text-center text-2xl font-extrabold">
            {t('pair_revoked_title')}
          </Text>
          <Text className="text-text-muted max-w-xs text-center text-base leading-6">
            {t('pair_revoked_body')}
          </Text>
          <Button
            label={t('pair_again_action')}
            size="lg"
            onPress={() => router.replace(ROUTES.pair)}
          />
        </View>
      </SafeAreaView>
    </ThemeScope>
  );
}
