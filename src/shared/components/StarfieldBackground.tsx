import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '@/shared/hooks/useTheme';

/** Subtle star speckles for RPG screens (deterministic from index). */
export const StarfieldBackground = () => {
  const { colors } = useTheme();

  const stars = useMemo(() => {
    const out: { x: number; y: number; s: number; o: number }[] = [];
    for (let i = 0; i < 48; i++) {
      const seed = (i * 7919 + 104729) % 1000;
      out.push({
        x: (seed * 7) % 100,
        y: (seed * 13) % 100,
        s: 1 + (seed % 2),
        o: 0.15 + (seed % 20) / 100,
      });
    }
    return out;
  }, []);

  return (
    <View style={[StyleSheet.absoluteFill, { overflow: 'hidden' }]} pointerEvents="none">
      {stars.map((st, i) => (
        <View
          key={i}
          style={{
            position: 'absolute',
            left: `${st.x}%`,
            top: `${st.y}%`,
            width: st.s,
            height: st.s,
            borderRadius: st.s,
            backgroundColor: colors.text,
            opacity: st.o,
          }}
        />
      ))}
    </View>
  );
};
