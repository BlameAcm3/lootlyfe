import { View } from 'react-native';

import { cn } from '../../lib/cn';

type ProgressTone = 'progress' | 'loot' | 'info' | 'achievement';

const tones: Record<ProgressTone, string> = {
  progress: 'bg-accent-progress',
  loot: 'bg-accent-loot',
  info: 'bg-accent-info',
  achievement: 'bg-accent-achievement',
};

type ProgressBarProps = {
  /** 0..1 */
  progress: number;
  tone?: ProgressTone;
  /** Thicker bar for hero placements. */
  size?: 'md' | 'lg';
};

export const ProgressBar = ({ progress, tone = 'progress', size = 'md' }: ProgressBarProps) => {
  const clamped = Math.min(1, Math.max(0, progress));
  return (
    <View
      className={cn(
        'bg-bg-base border-border w-full overflow-hidden rounded-full border',
        size === 'lg' ? 'h-4' : 'h-3',
      )}
    >
      {/* Width is runtime-computed — inline style per the exception list. */}
      <View
        className={cn('h-full rounded-full', tones[tone])}
        style={{ width: `${clamped * 100}%` }}
      />
    </View>
  );
};
