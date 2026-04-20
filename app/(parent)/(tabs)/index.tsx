import { useRouter } from 'expo-router';

import { useApproveChoreInstance, useTodaysFamilyInstances } from '@/features/chore-instances';
import { useSession } from '@/features/auth';
import { useKids } from '@/features/kids';
import { Button, Card, EmptyState, Screen, Stack, Text } from '@/shared/components';
import { useSessionStore } from '@/stores/sessionStore';

export default function ParentHomeScreen() {
  const router = useRouter();
  const familyId = useSessionStore((state) => state.familyId);
  const { user } = useSession();
  const kidsQuery = useKids(familyId);
  const instancesQuery = useTodaysFamilyInstances(familyId);
  const approveMutation = useApproveChoreInstance(familyId);

  const groups = (kidsQuery.data ?? []).map((kid) => ({
    kid,
    items: (instancesQuery.data ?? []).filter((instance) => instance.kid_id === kid.id),
  }));
  const needsApproval = (instancesQuery.data ?? []).filter(
    (instance) => instance.status === 'completed_unverified',
  );

  return (
    <Screen scroll>
      <Stack gap="lg">
        <Text variant="h1">Today</Text>
        <Button
          accessibilityLabel="Quick add chore"
          label="Quick add chore"
          onPress={() => router.push('/(parent)/(tabs)/chores')}
        />

        {groups.length === 0 ? (
          <EmptyState
            title="No kids yet"
            description="Add a kid in Family to start assigning chores."
          />
        ) : (
          groups.map((group) => (
            <Card key={group.kid.id}>
              <Stack gap="sm">
                <Text variant="h3">{group.kid.avatar_emoji ?? '🙂'} {group.kid.display_name}</Text>
                {group.items.length === 0 ? (
                  <Text color="muted">No chores due today.</Text>
                ) : (
                  group.items.map((item) => (
                    <Text key={item.id}>
                      • {(item.chores as { title?: string } | null)?.title ?? 'Chore'} - {item.status}
                    </Text>
                  ))
                )}
              </Stack>
            </Card>
          ))
        )}

        <Stack gap="sm">
          <Text variant="h2">Needs approval</Text>
          {needsApproval.length === 0 ? (
            <EmptyState title="All caught up" description="No chore approvals waiting right now." />
          ) : (
            needsApproval.map((item) => (
              <Card key={item.id}>
                <Stack gap="sm">
                  <Text>
                    {(item.chores as { title?: string } | null)?.title ?? 'Chore'} by{' '}
                    {(item.kids as { display_name?: string } | null)?.display_name ?? 'Kid'}
                  </Text>
                  <Button
                    accessibilityLabel="Approve completed chore"
                    label="Approve"
                    size="sm"
                    loading={approveMutation.isPending}
                    onPress={async () => {
                      if (!user?.id) return;
                      await approveMutation.mutateAsync(item.id);
                    }}
                  />
                </Stack>
              </Card>
            ))
          )}
        </Stack>
      </Stack>
    </Screen>
  );
}
