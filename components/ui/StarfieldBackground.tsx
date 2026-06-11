import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../hooks/useTheme';

/** Subtle star speckles for RPG screens (deterministic from index). */
export const StarfieldBackground = () => {
  const { palette } = useTheme();

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
      {stars.map((star, index) => (
        <View
          key={index}
          style={{
            position: 'absolute',
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.s,
            height: star.s,
            borderRadius: star.s,
            backgroundColor: palette['text-primary'],
            opacity: star.o,
          }}
        />
      ))}
    </View>
  );
};
