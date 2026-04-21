import { useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, View } from 'react-native';
import * as Haptics from 'expo-haptics';

import { useTheme } from '@/shared/hooks/useTheme';
import { Text } from './Text';

export type QuestType = 'quest' | 'mission' | 'challenge';

const QUEST_CONFIG: Record<QuestType, { label: string; icon: string; color: string }> = {
  quest:     { label: 'Quest',     icon: '⚔️',  color: '#8b5cf6' },
  mission:   { label: 'Mission',   icon: '🚀',  color: '#ef4444' },
  challenge: { label: 'Challenge', icon: '⚡',  color: '#22d3ee' },
};

type Props = {
  title: string;
  type: QuestType;
  xp: number;
  /** Gold coins earned (display). */
  coins?: number;
  difficulty: 1 | 2 | 3;
  done: boolean;
  requiresApproval?: boolean;
  steps?: string[];
  onComplete?: () => void;
  kidMode?: boolean;
};

export const QuestCard = ({
  title,
  type,
  xp,
  coins = 0,
  difficulty,
  done,
  requiresApproval,
  steps,
  onComplete,
  kidMode = true,
}: Props) => {
  const { colors } = useTheme();
  const cfg = QUEST_CONFIG[type];
  const [completing, setCompleting] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePress = async () => {
    if (done || completing || !onComplete) return;
    setCompleting(true);
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Animated.sequence([
      Animated.spring(scaleAnim, { toValue: 0.88, useNativeDriver: true, speed: 30 }),
      Animated.spring(scaleAnim, { toValue: 1.12, useNativeDriver: true, speed: 20 }),
      Animated.spring(scaleAnim, { toValue: 1, useNativeDriver: true, speed: 20 }),
    ]).start();
    setTimeout(() => {
      onComplete();
      setCompleting(false);
    }, 400);
  };

  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: done ? 'rgba(255,255,255,0.03)' : colors.bgCard,
          borderColor: done ? 'rgba(255,255,255,0.05)' : colors.border,
          borderRadius: 18,
          opacity: done ? 0.6 : 1,
        },
      ]}
    >
      {/* left stripe */}
      <View
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          bottom: 0,
          width: 3,
          backgroundColor: done ? 'rgba(255,255,255,0.1)' : cfg.color,
          borderTopLeftRadius: 18,
          borderBottomLeftRadius: 18,
        }}
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, paddingLeft: 12 }}>
        <View style={{ flex: 1 }}>
          {/* badges row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 7, flexWrap: 'wrap' }}>
            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
                paddingHorizontal: 8,
                paddingVertical: 2,
                borderRadius: 999,
                backgroundColor: `${cfg.color}1a`,
                borderWidth: 1,
                borderColor: `${cfg.color}40`,
              }}
            >
              <Text style={{ fontSize: 10 }}>{cfg.icon}</Text>
              <Text style={{ fontSize: 10, fontWeight: '800', color: cfg.color, letterSpacing: 0.6, textTransform: 'uppercase' }}>
                {cfg.label}
              </Text>
            </View>
            {requiresApproval && !done && (
              <Text style={{ fontSize: 10, color: colors.gold, fontWeight: '700', letterSpacing: 0.4 }}>
                ✓ PARENT APPROVAL
              </Text>
            )}
          </View>

          {/* title */}
          <Text style={{ fontWeight: '800', fontSize: 15, color: colors.text, marginBottom: 7, lineHeight: 20 }}>
            {done ? '✅ ' : ''}{title}
          </Text>

          {/* rewards row */}
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: colors.primaryLight }}>+{xp} XP</Text>
            {coins > 0 ? (
              <Text style={{ fontSize: 12, fontWeight: '700', color: colors.gold }}>
                +{coins} 🪙
              </Text>
            ) : null}
            {/* difficulty dots */}
            <View style={{ flexDirection: 'row', gap: 3, alignItems: 'center' }}>
              {[1, 2, 3].map((i) => (
                <View
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: i <= difficulty ? colors.primary : 'rgba(255,255,255,0.1)',
                  }}
                />
              ))}
            </View>
          </View>

          {steps && (
            <View style={{ marginTop: 9, flexDirection: 'row', flexWrap: 'wrap', gap: 5 }}>
              {steps.map((s, i) => (
                <View
                  key={i}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.05)',
                    paddingHorizontal: 7,
                    paddingVertical: 2,
                    borderRadius: 5,
                  }}
                >
                  <Text style={{ fontSize: 10, color: colors.textMuted, fontWeight: '600' }}>
                    {i + 1}. {s}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {kidMode && !done && (
          <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
            <Pressable
              onPress={handlePress}
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                backgroundColor: completing ? colors.success : colors.primary,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text style={{ fontSize: 22 }}>{completing ? '✨' : '⚡'}</Text>
            </Pressable>
          </Animated.View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    overflow: 'hidden',
    position: 'relative',
  },
});
