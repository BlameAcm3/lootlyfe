import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, GradientButton, StarfieldBackground } from '../components/ui';
import { useLexicon } from '../hooks/useLexicon';
import { useOnboardingStore } from '../store/useOnboardingStore';
import type { LexiconKey } from '../lib/lexicon';

type Pane = {
  emoji: string;
  titleKey: LexiconKey;
  bodyKey: LexiconKey;
  noteKey?: LexiconKey;
};

/**
 * 4-screen onboarding walkthrough: 3 metaphor panes + the notification
 * permission PRIMER (no actual permission request — that happens later at the
 * first relevant moment). Shown once per install; skippable.
 */
const panes: Pane[] = [
  { emoji: '🏰', titleKey: 'walkthrough_step1_title', bodyKey: 'walkthrough_step1_body' },
  { emoji: '⚔️', titleKey: 'walkthrough_step2_title', bodyKey: 'walkthrough_step2_body' },
  { emoji: '🎁', titleKey: 'walkthrough_step3_title', bodyKey: 'walkthrough_step3_body' },
  {
    emoji: '🔔',
    titleKey: 'walkthrough_notify_title',
    bodyKey: 'walkthrough_notify_body',
    noteKey: 'walkthrough_notify_note',
  },
];

export default function WalkthroughScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const markWalkthroughSeen = useOnboardingStore((state) => state.markWalkthroughSeen);
  const [index, setIndex] = useState(0);

  const pane = panes[index];
  const isLast = index === panes.length - 1;

  const finish = () => {
    markWalkthroughSeen();
    router.replace('/(parent)/(tabs)');
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <StarfieldBackground />
      <View className="flex-1 p-6">
        <View className="items-end">
          {!isLast ? (
            <Pressable accessibilityRole="button" onPress={finish} className="px-2 py-1">
              <Text className="text-text-muted text-sm font-semibold">{t('walkthrough_skip')}</Text>
            </Pressable>
          ) : null}
        </View>

        <View className="flex-1 items-center justify-center gap-5 px-4">
          <Text className="text-7xl">{pane.emoji}</Text>
          <Text className="text-text-primary text-center text-2xl font-extrabold">
            {t(pane.titleKey)}
          </Text>
          <Text className="text-text-muted text-center text-base leading-6">{t(pane.bodyKey)}</Text>
          {pane.noteKey ? (
            <Text className="text-text-muted text-center text-xs italic">{t(pane.noteKey)}</Text>
          ) : null}
        </View>

        <View className="gap-5 pb-2">
          <View className="flex-row justify-center gap-2">
            {panes.map((_, dotIndex) => (
              <View
                key={dotIndex}
                className={
                  dotIndex === index
                    ? 'bg-accent-info h-2 w-6 rounded-full'
                    : 'bg-text-muted h-2 w-2 rounded-full opacity-40'
                }
              />
            ))}
          </View>
          {isLast ? (
            <GradientButton
              accessibilityLabel={t('walkthrough_done')}
              label={t('walkthrough_done')}
              onPress={finish}
            />
          ) : (
            <Button
              label={t('walkthrough_next')}
              size="lg"
              onPress={() => setIndex(index + 1)}
            />
          )}
        </View>
      </View>
    </SafeAreaView>
  );
}
