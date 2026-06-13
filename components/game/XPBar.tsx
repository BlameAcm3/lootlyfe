import { Text, View } from 'react-native';

import { ProgressBar } from '../ui/ProgressBar';
import { useLexicon } from '../../hooks/useLexicon';

type XPBarProps = {
  xp: number;
  xpToNext: number;
  level: number;
};

export const XPBar = ({ xp, xpToNext, level }: XPBarProps) => {
  const { t } = useLexicon();
  // xpToNext === 0 means the level cap: full bar, no next-level label.
  const progress = xpToNext > 0 ? xp / xpToNext : 1;

  return (
    <View className="gap-1.5">
      <View className="flex-row items-center justify-between">
        <Text className="text-text-primary text-xs font-bold">
          {t('level')} {level}
        </Text>
        {xpToNext > 0 ? (
          <Text className="text-text-muted text-xs">
            {t('xp_to_next', { xp: Math.max(0, xpToNext - xp), level: level + 1 })}
          </Text>
        ) : null}
      </View>
      <ProgressBar progress={progress} tone="progress" />
    </View>
  );
};
