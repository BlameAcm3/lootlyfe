import { useState } from 'react';
import { View } from 'react-native';

import { Button, Input, Modal, Pressable, Text } from '@/shared/components';
import { useTheme } from '@/shared/hooks';
import { useModeStore } from '@/stores/modeStore';
import { useSessionStore } from '@/stores/sessionStore';
import { useKids } from '@/features/kids';

export const ModeSwitcher = () => {
  const { spacing, radii, colors } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [pin, setPin] = useState('');
  const mode = useModeStore((state) => state.mode);
  const activeKidId = useModeStore((state) => state.activeKidId);
  const setMode = useModeStore((state) => state.setMode);
  const setActiveKid = useModeStore((state) => state.setActiveKid);
  const familyId = useSessionStore((state) => state.familyId);
  const kidsQuery = useKids(familyId);

  const activeKid = kidsQuery.data?.find((kid) => kid.id === activeKidId) ?? null;

  return (
    <View style={{ bottom: spacing['4xl'], position: 'absolute', right: spacing.lg, zIndex: 40 }}>
      <Button
        accessibilityLabel={mode === 'parent' ? 'Enter kid mode' : 'Return to parent mode'}
        label={mode === 'parent' ? 'Enter Kid Mode' : '⚙ Parent'}
        onPress={() => setIsOpen(true)}
      />

      <Modal visible={isOpen} onClose={() => setIsOpen(false)} accessibilityLabel="Close mode switcher">
        {mode === 'parent' ? (
          <View style={{ gap: spacing.sm }}>
            <Text variant="h3">Choose a kid</Text>
            <Text color="muted">Pick who is using the app right now.</Text>
            {(kidsQuery.data ?? []).map((kid) => (
              <Pressable
                key={kid.id}
                accessibilityLabel={`Enter kid mode as ${kid.display_name}`}
                onPress={async () => {
                  setActiveKid(kid.id);
                  await setMode('kid');
                  setIsOpen(false);
                }}
                style={{
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  borderRadius: radii.md,
                  borderWidth: 1,
                  padding: spacing.md,
                }}
              >
                <Text>{kid.avatar_emoji ?? '🙂'} {kid.display_name}</Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <View style={{ gap: spacing.md }}>
            <Text variant="h3">Parent mode</Text>
            <Text color="muted">
              {activeKid ? `${activeKid.avatar_emoji ?? '🙂'} ${activeKid.display_name} is active.` : 'Enter your parent PIN to switch back.'}
            </Text>
            <Input
              accessibilityLabel="Parent PIN"
              label="Parent PIN"
              keyboardType="number-pad"
              secureTextEntry
              value={pin}
              onChangeText={setPin}
            />
            <Button
              accessibilityLabel="Switch to parent mode"
              label="Back to Parent"
              onPress={async () => {
                await setMode('parent', pin);
                setIsOpen(false);
                setPin('');
              }}
            />
          </View>
        )}
      </Modal>
    </View>
  );
};
