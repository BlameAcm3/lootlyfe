import {
  Pressable as RNPressable,
  type PressableProps as RNPressableProps,
  type AccessibilityRole,
} from 'react-native';

type Props = RNPressableProps & {
  accessibilityLabel: string;
  accessibilityRole?: AccessibilityRole;
};

export const Pressable = ({
  accessibilityRole = 'button',
  accessibilityState,
  disabled,
  ...props
}: Props) => {
  const normalizedDisabled = disabled ?? false;

  return (
    <RNPressable
      accessibilityRole={accessibilityRole}
      accessibilityState={{ ...accessibilityState, disabled: normalizedDisabled }}
      disabled={normalizedDisabled}
      {...props}
    />
  );
};
