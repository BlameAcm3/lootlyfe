import type { PropsWithChildren } from 'react';
import { Modal as RNModal, View } from 'react-native';

import { Pressable } from '@/shared/components/Pressable';
import { useTheme } from '@/shared/hooks/useTheme';

type Props = PropsWithChildren<{
  visible: boolean;
  onClose: () => void;
  accessibilityLabel: string;
}>;

export const Modal = ({ visible, onClose, accessibilityLabel, children }: Props) => {
  const { colors, radii, spacing } = useTheme();
  return (
    <RNModal animationType="fade" transparent visible={visible} onRequestClose={onClose}>
      <View
        style={{
          alignItems: 'center',
          backgroundColor: 'rgba(0,0,0,0.35)',
          flex: 1,
          justifyContent: 'center',
          padding: spacing.lg,
        }}
      >
        <Pressable
          accessibilityLabel={accessibilityLabel}
          accessibilityRole="button"
          onPress={onClose}
          style={{ bottom: 0, left: 0, position: 'absolute', right: 0, top: 0 }}
        />
        <View
          accessibilityViewIsModal
          style={{
            backgroundColor: colors.bgElevated,
            borderRadius: radii.lg,
            maxWidth: 520,
            padding: spacing.lg,
            width: '100%',
          }}
        >
          {children}
        </View>
      </View>
    </RNModal>
  );
};
