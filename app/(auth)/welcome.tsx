import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';

import { RpgGradientButton, StarfieldBackground, Text } from '@/shared/components';
import { useTheme } from '@/shared/hooks';

export default function WelcomeScreen() {
  const router = useRouter();
  const { colors } = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.bg }}>
      <View style={{ flex: 1, paddingHorizontal: 24, justifyContent: 'space-between', paddingBottom: 28 }}>
        <StarfieldBackground />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 24 }}>
          <LinearGradient
            colors={['#7c3aed', '#22d3ee']}
            style={{
              width: 112,
              height: 112,
              borderRadius: 56,
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 28,
              shadowColor: '#8b5cf6',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.55,
              shadowRadius: 24,
              elevation: 16,
            }}
          >
            <Text style={{ fontSize: 52 }}>⚔️</Text>
          </LinearGradient>
          <Text style={{ fontWeight: '800', fontSize: 20, color: colors.text, marginBottom: 6 }}>Welcome to</Text>
          <Text
            style={{
              fontWeight: '900',
              fontSize: 38,
              letterSpacing: -0.5,
              marginBottom: 16,
              color: colors.goldLight,
            }}
          >
            Lootlyfe
          </Text>
          <Text
            style={{
              textAlign: 'center',
              fontSize: 15,
              lineHeight: 22,
              color: colors.textMuted,
              paddingHorizontal: 12,
            }}
          >
            Turn everyday chores into epic quests. Earn loot. Level up. Become legendary.
          </Text>
        </View>
        <RpgGradientButton
          accessibilityLabel="Start your quest"
          label="Start your quest →"
          onPress={() => router.push('/(auth)/sign-in')}
        />
      </View>
    </SafeAreaView>
  );
}
