import { useState } from 'react';

import { ChoreForm, useChores, useCreateChore, useUpdateChore } from '@/features/chores';
import { useKids } from '@/features/kids';
import { Button, Card, EmptyState, Modal, Pressable, Screen, ScreenHeader, Stack, Text } from '@/shared/components';
import { useSessionStore } from '@/stores/sessionStore';

export default function ParentChoresScreen() {
  const familyId = useSessionStore((state) => state.familyId);
  const choresQuery = useChores(familyId);
  const kidsQuery = useKids(familyId);
  const createMutation = useCreateChore(familyId);
  const updateMutation = useUpdateChore(familyId);
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const kidOptions = (kidsQuery.data ?? []).map((kid) => ({ id: kid.id, name: kid.display_name }));
  const editingChore = (choresQuery.data ?? []).find((chore) => chore.id === editingId);

  return (
    <Screen scroll>
      <Stack gap="xl">
        <ScreenHeader
          title="Quest templates"
          subtitle="Reusable quests for your heroes. Lootlyfe rolls today’s tasks from schedules and assignments."
        />

        <Button
          accessibilityLabel="Add chore"
          label="New chore template"
          fullWidth
          onPress={() => setIsOpen(true)}
        />

        {(choresQuery.data ?? []).length === 0 ? (
          <Card>
            <EmptyState
              title="No chore templates yet"
              description="Create your first template, assign it to kids, and pick a schedule. You can also finish onboarding to load starter chores."
            />
          </Card>
        ) : (
          (choresQuery.data ?? []).map((chore) => (
            <Pressable
              key={chore.id}
              accessibilityLabel={`Edit chore ${chore.title}`}
              onPress={() => {
                setEditingId(chore.id);
                setIsOpen(true);
              }}
            >
              <Card>
                <Stack gap="xs">
                  <Text variant="h3">{chore.title}</Text>
                  <Text color="muted">
                    {chore.points} points · {chore.schedule_type.replace('_', ' ')}
                  </Text>
                </Stack>
              </Card>
            </Pressable>
          ))
        )}

        <Modal
          visible={isOpen}
          onClose={() => {
            setIsOpen(false);
            setEditingId(null);
          }}
          accessibilityLabel="Close chore form"
        >
          <ChoreForm
            submitLabel={editingChore ? 'Update chore' : 'Create chore'}
            loading={createMutation.isPending || updateMutation.isPending}
            kidOptions={kidOptions}
            initialValues={
              editingChore
                ? {
                    title: editingChore.title,
                    description: editingChore.description ?? '',
                    points: editingChore.points,
                    scheduleType:
                      editingChore.schedule_type === 'custom' ? 'weekly' : editingChore.schedule_type,
                    weeklyDays:
                      (editingChore.schedule_config as { days?: number[] } | null)?.days ?? [1, 3, 5],
                    assignedKidIds: ((editingChore.chore_assignments as Array<{ kid_id: string }> | null) ?? []).map(
                      (assignment) => assignment.kid_id,
                    ),
                    requiresApproval: editingChore.requires_approval,
                  }
                : undefined
            }
            onSubmit={async (values) => {
              if (editingChore) {
                await updateMutation.mutateAsync({ choreId: editingChore.id, values });
              } else {
                await createMutation.mutateAsync(values);
              }
              setIsOpen(false);
              setEditingId(null);
            }}
          />
        </Modal>
      </Stack>
    </Screen>
  );
}
