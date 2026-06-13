import { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { LootForm, type LootFormValues } from '../../../components/forms/LootForm';
import { Button, Modal } from '../../../components/ui';
import { useLexicon } from '../../../hooks/useLexicon';
import { useCurrentGuild } from '../../../queries/guildQueries';
import {
  useDeleteLootItem,
  useLootItems,
  useUpdateLootItem,
  type LootItemRow,
} from '../../../queries/lootQueries';

const toInitial = (item: LootItemRow): Partial<LootFormValues> => ({
  name: item.name,
  description: item.description ?? '',
  goldCost: item.gold_cost,
  stock: item.stock,
});

export default function EditLootScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { guild } = useCurrentGuild();
  const itemsQuery = useLootItems(guild?.id);
  const updateMutation = useUpdateLootItem(guild?.id ?? '');
  const deleteMutation = useDeleteLootItem(guild?.id ?? '');
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);

  const item = (itemsQuery.data ?? []).find((row) => row.id === id);
  if (!guild || !item) return null;

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="pt-2">
          <Text className="text-text-primary text-2xl font-extrabold">{t('loot_edit_title')}</Text>
        </View>

        <LootForm
          initial={toInitial(item)}
          submitting={updateMutation.isPending}
          onSubmit={async (values) => {
            await updateMutation.mutateAsync({
              id: item.id,
              patch: {
                name: values.name,
                description: values.description || null,
                gold_cost: values.goldCost,
                stock: values.stock,
              },
            });
            router.back();
          }}
        />

        <Button
          label={t('loot_delete_action')}
          variant="danger"
          disabled={deleteMutation.isPending}
          onPress={() => setDeleteConfirmVisible(true)}
        />
      </ScrollView>

      <Modal visible={deleteConfirmVisible} onClose={() => setDeleteConfirmVisible(false)}>
        <View className="gap-3">
          <Text className="text-text-primary text-lg font-extrabold">
            {t('loot_delete_action')}
          </Text>
          <Text className="text-text-muted text-sm leading-5">{t('loot_delete_confirm_body')}</Text>
          <Button
            label={t('loot_delete_action')}
            variant="danger"
            disabled={deleteMutation.isPending}
            onPress={async () => {
              await deleteMutation.mutateAsync(item.id);
              setDeleteConfirmVisible(false);
              router.back();
            }}
          />
          <Button
            label={t('cancel_action')}
            variant="ghost"
            onPress={() => setDeleteConfirmVisible(false)}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
