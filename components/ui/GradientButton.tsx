import { Pressable, Text, type PressableProps } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

import { useTheme } from '../../hooks/useTheme';

type GradientButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
};

/** Hero CTA: info→achievement gradient from the active palette. */
export const GradientButton = ({ label, ...props }: GradientButtonProps) => {
  const { palette } = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => (pressed ? { opacity: 0.8 } : undefined)}
      {...props}
    >
      <LinearGradient
        colors={[palette['accent-info'], palette['accent-achievement']]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={{ borderRadius: 16, paddingVertical: 16, alignItems: 'center' }}
      >
        <Text className="text-text-inverse text-base font-extrabold">{label}</Text>
      </LinearGradient>
    </Pressable>
  );
};
