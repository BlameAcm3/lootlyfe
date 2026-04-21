import { useEffect, useState } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useFamily, useUpdateFamily } from '@/features/families';
import { useDeactivateKid, useKids, useUpdateKid } from '@/features/kids';
import { useStreaks } from '@/features/points';
import { Button, Card, EmptyState, Input, Modal, Pressable, Screen, ScreenHeader, Stack, Text } from '@/shared/components';
import { useTheme } from '@/shared/hooks';
import { useSessionStore } from '@/stores/sessionStore';
import { useModeStore } from '@/stores/modeStore';
import type { Database } from '@/shared/types/database';

type KidRow = Database['public']['Tables']['kids']['Row'];

const emojis = ['🦊', '🦄', '🐯', '🐶', '🐼', '🐸', '🦖', '🐨'];
const colorKeys = ['blue', 'purple', 'orange', 'green', 'pink', 'teal'] as const;
const colorDot: Record<(typeof colorKeys)[number], string> = {
  blue: '#3B82F6',
  purple: '#A855F7',
  orange: '#F97316',
  green: '#22C55E',
  pink: '#EC4899',
  teal: '#14B8A6',
};

export default function ParentFamilyScreen() {
  const router = useRouter();
  const { spacing, radii, colors } = useTheme();
  const familyId = useSessionStore((state) => state.familyId);
  const familyQuery = useFamily();
  const kidsQuery = useKids(familyId);
  const streaksQuery = useStreaks((kidsQuery.data ?? []).map((kid) => kid.id));
  const updateFamilyMutation = useUpdateFamily();
  const updateKidMutation = useUpdateKid(familyId);
  const deactivateKidMutation = useDeactivateKid(familyId);
  const setActiveKid = useModeStore((state) => state.setActiveKid);
  const activeKidId = useModeStore((state) => state.activeKidId);

  const [familyModalOpen, setFamilyModalOpen] = useState(false);
  const [familyName, setFamilyName] = useState('');
  const [familyTz, setFamilyTz] = useState('');
  const [familyPin, setFamilyPin] = useState('');

  const [kidModalOpen, setKidModalOpen] = useState(false);
  const [editingKid, setEditingKid] = useState<KidRow | null>(null);
  const [kidName, setKidName] = useState('');
  const [kidYear, setKidYear] = useState('');
  const [kidEmoji, setKidEmoji] = useState('🦊');
  const [kidColor, setKidColor] = useState<(typeof colorKeys)[number]>('blue');

  const kidCount = kidsQuery.data?.length ?? 0;
  const fid = familyQuery.data?.id;

  useEffect(() => {
    if (!familyQuery.data) return;
    setFamilyName(familyQuery.data.name);
    setFamilyTz(familyQuery.data.timezone);
    setFamilyPin('');
  }, [familyQuery.data]);

  useEffect(() => {
    if (!editingKid) return;
    setKidName(editingKid.display_name);
    setKidYear(String(editingKid.birth_year ?? new Date().getFullYear() - 8));
    setKidEmoji(editingKid.avatar_emoji ?? '🦊');
    setKidColor((editingKid.color_theme as (typeof colorKeys)[number]) ?? 'blue');
  }, [editingKid]);

  const openKidEdit = (kid: KidRow) => {
    setEditingKid(kid);
    setKidModalOpen(true);
  };

  const confirmRemoveKid = (kid: KidRow) => {
    Alert.alert(
      `Remove ${kid.display_name}?`,
      'They will disappear from the app. Past chores and points stay in your account for now.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              await deactivateKidMutation.mutateAsync(kid.id);
              if (activeKidId === kid.id) setActiveKid(null);
            } catch (e) {
              Alert.alert('Could not remove', e instanceof Error ? e.message : 'Try again.');
            }
          },
        },
      ],
    );
  };

  return (
    <Screen scroll>
      <Stack gap="xl">
        <ScreenHeader
          title="Family"
          subtitle="Household details, kids, and streaks in one place."
        />

        <Button
          accessibilityLabel="Open app and account settings"
          label="App & account settings"
          fullWidth
          variant="secondary"
          onPress={() => router.push('/(parent)/settings')}
        />

        <Card style={{ backgroundColor: colors.primaryMuted, borderColor: colors.primary }}>
          <Stack gap="md">
            <Stack gap="xs">
              <Text variant="h3">{familyQuery.data?.name ?? 'Your family'}</Text>
              <Text color="muted">Time zone · {familyQuery.data?.timezone ?? 'UTC'}</Text>
            </Stack>
            {fid ? (
              <Button
                accessibilityLabel="Edit household"
                label="Edit household"
                fullWidth
                variant="secondary"
                onPress={() => setFamilyModalOpen(true)}
              />
            ) : null}
          </Stack>
        </Card>

        <Stack gap="md">
          <Text variant="h2">Kids</Text>
          {kidCount === 0 ? (
            <Card>
              <EmptyState
                title="No kids yet"
                description="Add a profile for each child so you can assign chores and track points."
              />
              <Button
                accessibilityLabel="Add a kid"
                label="Add a kid"
                fullWidth
                onPress={() => router.push('/(parent)/onboarding/add-kid')}
              />
            </Card>
          ) : (
            (kidsQuery.data ?? []).map((kid) => {
              const streak = (streaksQuery.data ?? []).find((item) => item.kid_id === kid.id);
              return (
                <Card key={kid.id}>
                  <Stack gap="md">
                    <Stack gap="xs">
                      <Text variant="h3">
                        {kid.avatar_emoji ?? '🙂'} {kid.display_name}
                      </Text>
                      <Text color="muted">Points balance · {kid.points_balance}</Text>
                      <Text color="muted">Weekly streak · {streak?.current_weekly_streak ?? 0}</Text>
                    </Stack>
                    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
                      <Button
                        accessibilityLabel={`Edit ${kid.display_name}`}
                        label="Edit"
                        size="sm"
                        variant="secondary"
                        onPress={() => openKidEdit(kid)}
                      />
                      <Button
                        accessibilityLabel={`Remove ${kid.display_name}`}
                        label="Remove"
                        size="sm"
                        variant="danger"
                        loading={deactivateKidMutation.isPending}
                        onPress={() => confirmRemoveKid(kid)}
                      />
                    </View>
                  </Stack>
                </Card>
              );
            })
          )}
        </Stack>

        {kidCount > 0 ? (
          <Button
            accessibilityLabel="Add another kid"
            label="Add another kid"
            fullWidth
            variant="secondary"
            onPress={() => router.push('/(parent)/onboarding/add-kid')}
          />
        ) : null}

        <Modal visible={familyModalOpen} onClose={() => setFamilyModalOpen(false)} accessibilityLabel="Close family edit">
          <Stack gap="md">
            <Text variant="h3">Edit household</Text>
            <Input label="Family name" value={familyName} onChangeText={setFamilyName} />
            <Input label="Time zone" value={familyTz} onChangeText={setFamilyTz} placeholder="e.g. America/New_York" />
            <Input
              label="New parent PIN (optional)"
              value={familyPin}
              onChangeText={setFamilyPin}
              secureTextEntry
              keyboardType="number-pad"
              placeholder="Leave blank to keep current PIN"
            />
            <Button
              accessibilityLabel="Save household"
              label="Save"
              fullWidth
              loading={updateFamilyMutation.isPending}
              onPress={async () => {
                if (!fid || !familyName.trim()) return;
                try {
                  await updateFamilyMutation.mutateAsync({
                    familyId: fid,
                    values: {
                      name: familyName.trim(),
                      timezone: familyTz.trim() || undefined,
                      ...(familyPin.trim().length >= 4 ? { parentPin: familyPin.trim() } : {}),
                    },
                  });
                  setFamilyModalOpen(false);
                  setFamilyPin('');
                } catch (e) {
                  Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
                }
              }}
            />
          </Stack>
        </Modal>

        <Modal visible={kidModalOpen} onClose={() => setKidModalOpen(false)} accessibilityLabel="Close kid edit">
          {editingKid ? (
            <Stack gap="md">
              <Text variant="h3">Edit {editingKid.display_name}</Text>
              <Input label="Name" value={kidName} onChangeText={setKidName} />
              <Input label="Birth year" value={kidYear} onChangeText={setKidYear} keyboardType="number-pad" />
              <Text variant="label">Avatar</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm }}>
                {emojis.map((emoji) => {
                  const selected = kidEmoji === emoji;
                  return (
                    <Pressable
                      key={emoji}
                      accessibilityLabel={`Avatar ${emoji}`}
                      onPress={() => setKidEmoji(emoji)}
                      style={{
                        borderRadius: radii.lg,
                        borderWidth: 2,
                        borderColor: selected ? colors.primary : colors.border,
                        backgroundColor: selected ? colors.primaryMuted : colors.bgElevated,
                        paddingHorizontal: spacing.md,
                        paddingVertical: spacing.sm,
                      }}
                    >
                      <Text style={{ fontSize: 28 }}>{emoji}</Text>
                    </Pressable>
                  );
                })}
              </View>
              <Text variant="label">Accent color</Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md }}>
                {colorKeys.map((c) => {
                  const selected = kidColor === c;
                  return (
                    <Pressable
                      key={c}
                      accessibilityLabel={`Color ${c}`}
                      onPress={() => setKidColor(c)}
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: radii.pill,
                        backgroundColor: colorDot[c],
                        borderWidth: selected ? 3 : 0,
                        borderColor: colors.bgElevated,
                      }}
                    />
                  );
                })}
              </View>
              <Button
                accessibilityLabel="Save kid"
                label="Save"
                fullWidth
                loading={updateKidMutation.isPending}
                onPress={async () => {
                  if (!kidName.trim()) return;
                  try {
                    await updateKidMutation.mutateAsync({
                      kidId: editingKid.id,
                      values: {
                        displayName: kidName.trim(),
                        birthYear: Number.parseInt(kidYear, 10),
                        avatarEmoji: kidEmoji,
                        colorTheme: kidColor,
                      },
                    });
                    setKidModalOpen(false);
                    setEditingKid(null);
                  } catch (e) {
                    Alert.alert('Could not save', e instanceof Error ? e.message : 'Try again.');
                  }
                }}
              />
            </Stack>
          ) : null}
        </Modal>
      </Stack>
    </Screen>
  );
}
