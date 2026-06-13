import { useState } from 'react';
import { Text, View } from 'react-native';

import { useLexicon } from '../../hooks/useLexicon';
import { Button, Card, Input } from '../ui';

export type LootFormValues = {
  name: string;
  description: string;
  goldCost: number;
  /** null = unlimited */
  stock: number | null;
};

type LootFormProps = {
  initial?: Partial<LootFormValues>;
  submitting?: boolean;
  onSubmit: (values: LootFormValues) => void;
};

type FieldErrors = Partial<Record<'name' | 'cost' | 'stock', string>>;

/**
 * NPC reward builder: name, description, gold cost, and optional stock (blank
 * means unlimited). Used for both custom rewards and preset-prefilled ones.
 */
export const LootForm = ({ initial, submitting, onSubmit }: LootFormProps) => {
  const { t } = useLexicon();

  const [name, setName] = useState(initial?.name ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [cost, setCost] = useState(String(initial?.goldCost ?? 25));
  const [stock, setStock] = useState(
    initial?.stock === null || initial?.stock === undefined ? '' : String(initial.stock),
  );
  const [errors, setErrors] = useState<FieldErrors>({});

  const handleSubmit = () => {
    const next: FieldErrors = {};
    const costValue = Number(cost);
    const trimmedStock = stock.trim();
    const stockValue = trimmedStock === '' ? null : Number(trimmedStock);

    if (!name.trim()) next.name = t('loot_form_name_required');
    if (!Number.isInteger(costValue) || costValue < 0) next.cost = t('loot_form_cost_invalid');
    if (stockValue !== null && (!Number.isInteger(stockValue) || stockValue < 0)) {
      next.stock = t('loot_form_stock_invalid');
    }

    setErrors(next);
    if (Object.keys(next).length > 0) return;

    onSubmit({
      name: name.trim(),
      description: description.trim(),
      goldCost: costValue,
      stock: stockValue,
    });
  };

  return (
    <Card className="gap-5">
      <Input
        accessibilityLabel={t('loot_form_name_label')}
        label={t('loot_form_name_label')}
        value={name}
        onChangeText={(value) => {
          setName(value);
          setErrors((current) => ({ ...current, name: undefined }));
        }}
        error={errors.name}
      />

      <Input
        accessibilityLabel={t('loot_form_description_label')}
        label={t('loot_form_description_label')}
        value={description}
        onChangeText={setDescription}
        multiline
      />

      <View className="flex-row gap-3">
        <View className="flex-1">
          <Input
            accessibilityLabel={t('loot_form_cost_label')}
            label={t('loot_form_cost_label')}
            value={cost}
            onChangeText={(value) => {
              setCost(value);
              setErrors((current) => ({ ...current, cost: undefined }));
            }}
            keyboardType="number-pad"
            error={errors.cost}
          />
        </View>
        <View className="flex-1">
          <Input
            accessibilityLabel={t('loot_form_stock_label')}
            label={t('loot_form_stock_label')}
            value={stock}
            onChangeText={(value) => {
              setStock(value);
              setErrors((current) => ({ ...current, stock: undefined }));
            }}
            keyboardType="number-pad"
            placeholder={t('loot_unlimited_label')}
            error={errors.stock}
          />
        </View>
      </View>
      <Text className="text-text-muted text-xs">{t('loot_form_stock_hint')}</Text>

      <Button
        accessibilityLabel={t('loot_save_action')}
        label={t('loot_save_action')}
        size="lg"
        disabled={submitting}
        onPress={handleSubmit}
      />
    </Card>
  );
};
