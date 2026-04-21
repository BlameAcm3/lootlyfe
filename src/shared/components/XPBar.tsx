import { useEffect, useRef } from 'react';
import { Animated, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '@/shared/hooks/useTheme';
import { Text } from './Text';

type Props = {
  xp: number;
  xpToNext: number;
  animate?: boolean;
};

export const XPBar = ({ xp, xpToNext, animate = false }: Props) => {
  const { colors } = useTheme();
  const target = Math.min(xpToNext > 0 ? xp / xpToNext : 1, 1);
  const widthAnim = useRef(new Animated.Value(animate ? 0 : target)).current;

  useEffect(() => {
    if (animate) {
      Animated.timing(widthAnim, {
        toValue: target,
        duration: 1100,
        useNativeDriver: false,
      }).start();
    } else {
      widthAnim.setValue(target);
    }
  }, [animate, target, widthAnim]);

  return (
    <View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
        <Text style={{ fontSize: 11, color: colors.textMuted, fontWeight: '700', letterSpacing: 0.8 }}>XP</Text>
        <Text style={{ fontSize: 11, color: colors.textMuted }}>
          {xp.toLocaleString()} / {xpToNext.toLocaleString()}
        </Text>
      </View>
      <View
        style={{
          height: 8,
          backgroundColor: 'rgba(255,255,255,0.07)',
          borderRadius: 999,
          overflow: 'hidden',
        }}
      >
        <Animated.View
          style={{
            height: '100%',
            width: widthAnim.interpolate({
              inputRange: [0, 1],
              outputRange: ['0%', '100%'],
            }),
            borderRadius: 999,
            overflow: 'hidden',
          }}
        >
          <LinearGradient
            colors={['#a855f7', '#22d3ee']}
            start={{ x: 0, y: 0.5 }}
            end={{ x: 1, y: 0.5 }}
            style={{ flex: 1, height: '100%' }}
          />
        </Animated.View>
      </View>
    </View>
  );
};
