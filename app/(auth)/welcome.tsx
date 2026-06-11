import { Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { APP_NAME } from '@/shared/constants';
import { GradientButton, StarfieldBackground } from '../../components/ui';
import { useLexicon } from '../../hooks/useLexicon';
import { ROUTES } from '../../lib/routes';

export default function WelcomeScreen() {
  const router = useRouter();
  const { t } = useLexicon();

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <StarfieldBackground />
      <View className="flex-1 justify-between px-6 pb-7">
        <View className="flex-1 items-center justify-center pt-6">
          <View className="bg-accent-info mb-7 h-28 w-28 items-center justify-center rounded-full">
            <Text className="text-5xl">⚔️</Text>
          </View>
          <Text className="text-text-primary mb-1 text-xl font-extrabold">
            {t('welcome_intro_label')}
          </Text>
          <Text className="text-accent-loot mb-4 text-4xl font-black tracking-tight">
            {APP_NAME}
          </Text>
          <Text className="text-text-muted px-3 text-center text-base leading-6">
            {t('welcome_tagline')}
          </Text>
        </View>

        <View className="gap-4">
          <GradientButton
            accessibilityLabel={t('welcome_cta')}
            label={t('welcome_cta')}
            onPress={() => router.push('/(auth)/sign-in')}
          />
          <Text
            accessibilityRole="link"
            onPress={() => router.push(ROUTES.pair)}
            className="text-accent-achievement text-center text-sm font-bold"
          >
            🗝️ {t('pair_welcome_link')}
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}
