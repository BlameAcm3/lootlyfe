import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AdventurerForm } from '../../../components/forms/AdventurerForm';
import { useLexicon } from '../../../hooks/useLexicon';
import { useCreateAdventurer } from '../../../queries/adventurerQueries';
import { useCurrentGuild } from '../../../queries/guildQueries';

export default function NewAdventurerScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const { guild, isPremium } = useCurrentGuild();
  const mutation = useCreateAdventurer(guild?.id ?? '');

  if (!guild) return null;

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="pt-2">
          <Text className="text-text-primary text-2xl font-extrabold">
            {t('adventurer_new_title')}
          </Text>
        </View>
        <AdventurerForm
          guildIsPremium={isPremium}
          submitting={mutation.isPending}
          onSubmit={async (values) => {
            await mutation.mutateAsync({
              nickname: values.nickname,
              age_bucket: values.ageBucket,
              theme_id: values.themeId,
              variant_id: values.variantId,
            });
            router.back();
          }}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
