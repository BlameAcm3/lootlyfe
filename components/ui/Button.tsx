import { Pressable, Text, type PressableProps } from 'react-native';

import { cn } from '../../lib/cn';

type ButtonVariant = 'primary' | 'gold' | 'danger' | 'ghost';
type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = Omit<PressableProps, 'children'> & {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
};

// Class maps must stay static string literals so NativeWind can compile them.
const containerVariants: Record<ButtonVariant, string> = {
  primary: 'bg-accent-info',
  gold: 'bg-accent-loot',
  danger: 'bg-danger',
  ghost: 'bg-surface border-border border',
};

const labelVariants: Record<ButtonVariant, string> = {
  primary: 'text-text-inverse',
  gold: 'text-text-inverse',
  danger: 'text-text-inverse',
  ghost: 'text-text-primary',
};

const containerSizes: Record<ButtonSize, string> = {
  sm: 'px-3.5 py-2 rounded-xl',
  md: 'px-5 py-3 rounded-2xl',
  lg: 'px-6 py-4 rounded-2xl',
};

const labelSizes: Record<ButtonSize, string> = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

/**
 * Primary tap target. Press feedback is a quick scale+dim (game-juice over
 * spinners); disabled fades. Colors come exclusively from theme tokens.
 */
export const Button = ({ label, variant = 'primary', size = 'md', disabled, ...props }: ButtonProps) => (
  <Pressable
    accessibilityRole="button"
    disabled={disabled}
    className={cn(
      'items-center justify-center',
      containerVariants[variant],
      containerSizes[size],
      disabled && 'opacity-40',
    )}
    style={({ pressed }) =>
      pressed ? { opacity: 0.85, transform: [{ scale: 0.97 }] } : undefined
    }
    {...props}
  >
    <Text className={cn('font-extrabold tracking-wide', labelVariants[variant], labelSizes[size])}>
      {label}
    </Text>
  </Pressable>
);
