import { Modal as RNModal, Pressable, View, type ModalProps as RNModalProps } from 'react-native';

import { SCRIM_COLOR, themeVars } from '../../constants/theme';
import { useTheme } from '../../hooks/useTheme';

type ModalProps = Pick<RNModalProps, 'visible' | 'children'> & {
  onClose: () => void;
};

/**
 * Modal shell: scrim + themed sheet with a grab handle. RN's Modal renders
 * outside the ThemeScope View tree, so the active palette's CSS variables are
 * re-applied to the sheet here.
 */
export const Modal = ({ visible, onClose, children }: ModalProps) => {
  const { palette } = useTheme();

  return (
    <RNModal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable
        accessibilityRole="button"
        onPress={onClose}
        className="flex-1 items-center justify-center p-6"
        style={{ backgroundColor: SCRIM_COLOR }}
      >
        <Pressable
          // Swallow taps so touching the sheet doesn't dismiss.
          onPress={(event) => event.stopPropagation()}
          className="bg-surface-raised border-border w-full max-w-md rounded-3xl border p-5"
          style={themeVars(palette)}
        >
          <View className="bg-border mb-4 h-1.5 w-10 self-center rounded-full" />
          {children}
        </Pressable>
      </Pressable>
    </RNModal>
  );
};
