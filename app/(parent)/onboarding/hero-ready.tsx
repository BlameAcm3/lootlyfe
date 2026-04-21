import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useFamily } from '@/features/families';
import { RpgGradientButton, StarfieldBackground, Text } from '@/shared/components';
import { useTheme } from '@/shared/hooks';
import { MINIMAL_ONBOARDING } from '@/shared/lib/featureFlags';

export default function HeroReadyScreen() {
  const router = useRouter();
  const { colors } = useTheme();
  const params = useLocalSearchParams<{ kidName?: string | string[]; avatar?: string | string[] }>();
  const familyQuery = useFamily();

  const rawName = params.kidName;
  const name = (Array.isArray(rawName) ? rawName[0] : rawName) ?? 'Hero';
  const guildRaw = familyQuery.data?.name ?? 'Your guild';
  const guildLabel = guildRaw.replace(/^The\s+/i, '').trim() || guildRaw;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 28 }}>
        <StarfieldBackground />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <LinearGradient
            colors={['#5b21b6', '#22d3ee']}
            style={{
              width: 100,
              height: 100,
              borderRadius: 50,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 24,
              shadowColor: '#8b5cf6',
              shadowOpacity: 0.5,
              shadowRadius: 20,
              elevation: 12,
            }}
          >
            <Text style={{ fontSize: 48 }}>
              {(() => {
                const a = params.avatar;
                const v = Array.isArray(a) ? a[0] : a;
                return typeof v === 'string' ? v : '🧙';
              })()}
            </Text>
          </LinearGradient>
          <Text
            style={{
              fontWeight: '900',
              fontSize: 26,
              color: colors.goldLight,
              textAlign: 'center',
              marginBottom: 12,
            }}
          >
            {name} is ready!
          </Text>
          <Text style={{ fontSize: 15, color: colors.textMuted, textAlign: 'center', marginBottom: 28 }}>
            The <Text style={{ fontWeight: '800', color: colors.text }}>{guildLabel}</Text> guild is live.
          </Text>

          <View
            style={{
              width: '100%',
              borderRadius: 18,
              borderWidth: 1,
              borderColor: colors.borderStrong,
              backgroundColor: colors.bgCard,
              padding: 18,
              marginBottom: 8,
            }}
          >
            <Text style={{ fontSize: 12, color: colors.primaryLight, fontWeight: '700', marginBottom: 8 }}>
              Starting bonus unlocked
            </Text>
            <Text style={{ fontSize: 16, fontWeight: '800', color: colors.text }}>
              +100 XP · +50 🪙
            </Text>
            <Text style={{ fontSize: 12, color: colors.textMuted, marginTop: 6 }}>
              Bonus is visual for now — real points come from completed quests.
            </Text>
          </View>
        </View>

        <RpgGradientButton
          accessibilityLabel="Begin adventure"
          label="Begin adventure 🚀"
          onPress={() =>
            router.replace(MINIMAL_ONBOARDING ? '/(parent)/(tabs)' : '/(parent)/onboarding/starter-chores')
          }
        />
      </View>
    </SafeAreaView>
  );
}
