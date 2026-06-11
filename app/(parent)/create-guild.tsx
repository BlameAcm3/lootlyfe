import { useState } from 'react';
import { useRouter } from 'expo-router';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { StarfieldBackground } from '../../components/ui';
import { Button, Card, Input } from '../../components/ui';
import { CRESTS } from '../../data/crests';
import { useLexicon } from '../../hooks/useLexicon';
import { useCreateGuild } from '../../queries/guildQueries';

export default function CreateGuildScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const mutation = useCreateGuild();
  const [name, setName] = useState('');
  const [crestId, setCrestId] = useState(CRESTS[0].id);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!name.trim()) {
      setError(t('guild_name_placeholder'));
      return;
    }
    setError(null);
    try {
      await mutation.mutateAsync({ name: name.trim(), crest: crestId });
      router.replace('/(parent)/(tabs)/family');
    } catch (creationError) {
      // Surface the real cause in dev logs; users get the friendly copy.
      console.warn('create_guild failed', creationError);
      setError(t('error_generic'));
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
          <View className="items-center gap-1 pt-6">
            <Text className="text-5xl">{CRESTS.find((c) => c.id === crestId)?.emoji}</Text>
            <Text className="text-text-primary text-3xl font-extrabold">
              {t('guild_create_title')}
            </Text>
            <Text className="text-text-muted max-w-xs text-center text-sm">
              {t('guild_create_subtitle')}
            </Text>
          </View>

          <Card className="gap-4">
            <Input
              accessibilityLabel={t('guild_name_label')}
              label={t('guild_name_label')}
              placeholder={t('guild_name_placeholder')}
              value={name}
              onChangeText={(value) => {
                setName(value);
                setError(null);
              }}
            />

            <View className="gap-2">
              <Text className="text-text-muted text-xs font-semibold">{t('guild_crest_label')}</Text>
              <View className="flex-row flex-wrap gap-2.5">
                {CRESTS.map((crest) => (
                  <Pressable
                    key={crest.id}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: crest.id === crestId }}
                    onPress={() => setCrestId(crest.id)}
                    className={
                      crest.id === crestId
                        ? 'border-accent-info bg-bg-base h-14 w-14 items-center justify-center rounded-2xl border-2'
                        : 'border-border bg-bg-base h-14 w-14 items-center justify-center rounded-2xl border opacity-70'
                    }
                  >
                    <Text className="text-2xl">{crest.emoji}</Text>
                  </Pressable>
                ))}
              </View>
            </View>

            {error ? <Text className="text-danger text-xs">{error}</Text> : null}

            <Button
              accessibilityLabel={t('guild_create_action')}
              label={t('guild_create_action')}
              size="lg"
              disabled={mutation.isPending}
              onPress={handleCreate}
            />
          </Card>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
