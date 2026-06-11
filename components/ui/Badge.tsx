import { Text, View } from 'react-native';

import { cn } from '../../lib/cn';

type BadgeTone = 'loot' | 'progress' | 'info' | 'danger' | 'achievement' | 'muted';

// Static literals so NativeWind can compile each class.
const tones: Record<BadgeTone, string> = {
  loot: 'bg-accent-loot',
  progress: 'bg-accent-progress',
  info: 'bg-accent-info',
  danger: 'bg-danger',
  achievement: 'bg-accent-achievement',
  muted: 'bg-text-muted',
};

type BadgeProps = {
  label: string;
  tone?: BadgeTone;
};

export const Badge = ({ label, tone = 'info' }: BadgeProps) => (
  <View className={cn('self-start rounded-full px-2.5 py-1', tones[tone])}>
    <Text className="text-text-inverse text-xs font-bold">{label}</Text>
  </View>
);
