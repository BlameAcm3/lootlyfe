import type { PropsWithChildren } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '@/shared/hooks/useTheme';

type Props = PropsWithChildren<
  ViewProps & {
    scroll?: boolean;
    keyboardAvoiding?: boolean;
    scrollProps?: ScrollViewProps;
  }
>;

export const Screen = ({
  children,
  style,
  scroll = false,
  keyboardAvoiding = false,
  scrollProps,
  ...props
}: Props) => {
  const { colors, spacing } = useTheme();

  const content = scroll ? (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ flexGrow: 1, padding: spacing.lg }}
      style={{ flex: 1 }}
      {...scrollProps}
    >
      {children}
    </ScrollView>
  ) : (
    <View style={{ flex: 1, padding: spacing.lg }}>{children}</View>
  );

  const wrapped = keyboardAvoiding ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={{ flex: 1 }}
    >
      {content}
    </KeyboardAvoidingView>
  ) : (
    content
  );

  return (
    <SafeAreaView style={[{ backgroundColor: colors.bg, flex: 1 }, style]} {...props}>
      {wrapped}
    </SafeAreaView>
  );
};
