import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  /** 1–3 */
  step: number;
};

export const OnboardingHeroBar = ({ step }: Props) => {
  const pct = step / 3;

  return (
    <View style={{ marginBottom: 8 }}>
      <View
        style={{
          height: 4,
          borderRadius: 999,
          backgroundColor: 'rgba(255,255,255,0.08)',
          overflow: 'hidden',
        }}
      >
        <LinearGradient
          colors={['#22d3ee', '#6366f1', '#a855f7']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={{
            height: '100%',
            width: `${pct * 100}%`,
            borderRadius: 999,
          }}
        />
      </View>
    </View>
  );
};
