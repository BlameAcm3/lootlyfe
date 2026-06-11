import { useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';

import { AGE_BUCKETS, type AgeBucket } from '../../constants/game';
import { useLexicon } from '../../hooks/useLexicon';
import { themePacks, type ThemeId } from '../../themes';
import { Badge, Button, Card, Input } from '../ui';

export type AdventurerFormValues = {
  nickname: string;
  ageBucket: AgeBucket;
  themeId: ThemeId;
  variantId: string;
};

type AdventurerFormProps = {
  initial?: Partial<AdventurerFormValues>;
  /** Premium packs are selectable only when the guild entitlement is premium. */
  guildIsPremium: boolean;
  submitting?: boolean;
  onSubmit: (values: AdventurerFormValues) => void;
};

const isAgeBucket = (value: string): value is AgeBucket =>
  (AGE_BUCKETS as readonly string[]).includes(value);

export const AdventurerForm = ({
  initial,
  guildIsPremium,
  submitting,
  onSubmit,
}: AdventurerFormProps) => {
  const { t } = useLexicon();
  const [nickname, setNickname] = useState(initial?.nickname ?? '');
  const [ageBucket, setAgeBucket] = useState<AgeBucket>(initial?.ageBucket ?? '5-8');
  const [themeId, setThemeId] = useState<ThemeId>(initial?.themeId ?? 'high-fantasy');
  const [variantId, setVariantId] = useState(initial?.variantId ?? 'default');
  const [error, setError] = useState<string | null>(null);

  const selectedPack = themePacks[themeId];
  const selectedVariant = selectedPack.variants.find((variant) => variant.id === variantId) ?? null;
  const avatarSource =
    selectedPack.assets.avatarBases[selectedVariant?.avatarBases[0] ?? 0] ??
    selectedPack.assets.avatarBases[0];

  const handleSubmit = () => {
    if (!nickname.trim()) {
      setError(t('adventurer_nickname_required'));
      return;
    }
    setError(null);
    onSubmit({ nickname: nickname.trim(), ageBucket, themeId, variantId });
  };

  return (
    <Card className="gap-5">
      {/* Avatar placeholder — AvatarRenderer arrives with the avatar pass. */}
      <View className="items-center">
        <Image source={avatarSource} className="bg-bg-base h-20 w-20 rounded-full" />
      </View>

      <Input
        accessibilityLabel={t('adventurer_nickname_label')}
        label={t('adventurer_nickname_label')}
        value={nickname}
        onChangeText={(value) => {
          setNickname(value);
          setError(null);
        }}
        error={error ?? undefined}
      />

      <View className="gap-2">
        <Text className="text-text-muted text-xs font-semibold">{t('adventurer_age_label')}</Text>
        <View className="flex-row gap-2">
          {AGE_BUCKETS.map((bucket) => (
            <Pressable
              key={bucket}
              accessibilityRole="radio"
              accessibilityState={{ selected: bucket === ageBucket }}
              onPress={() => setAgeBucket(bucket)}
              className={
                bucket === ageBucket
                  ? 'bg-accent-info rounded-full px-4 py-2'
                  : 'bg-bg-base rounded-full px-4 py-2'
              }
            >
              <Text
                className={
                  bucket === ageBucket
                    ? 'text-text-inverse text-sm font-bold'
                    : 'text-text-muted text-sm font-semibold'
                }
              >
                {bucket}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-text-muted text-xs font-semibold">{t('adventurer_theme_label')}</Text>
        <View className="gap-2">
          {Object.values(themePacks).map((pack) => {
            const locked = pack.premium && !guildIsPremium;
            const selected = pack.id === themeId;
            return (
              <Pressable
                key={pack.id}
                accessibilityRole="radio"
                accessibilityState={{ selected, disabled: locked }}
                disabled={locked}
                onPress={() => {
                  setThemeId(pack.id as ThemeId);
                  setVariantId('default');
                }}
                className={
                  selected
                    ? 'border-accent-info bg-bg-base flex-row items-center justify-between rounded-2xl border-2 p-3'
                    : 'border-border bg-bg-base flex-row items-center justify-between rounded-2xl border p-3'
                }
                style={locked ? { opacity: 0.5 } : undefined}
              >
                <View className="flex-row items-center gap-3">
                  <Image source={pack.assets.avatarBases[0]} className="h-8 w-8 rounded-full" />
                  <Text className="text-text-primary text-sm font-bold">{pack.name}</Text>
                </View>
                {locked ? <Badge label={`🔒 ${t('premium_lock_label')}`} tone="achievement" /> : null}
              </Pressable>
            );
          })}
        </View>
      </View>

      <View className="gap-2">
        <Text className="text-text-muted text-xs font-semibold">
          {t('adventurer_variant_label')}
        </Text>
        <View className="flex-row flex-wrap gap-2">
          {[
            { id: 'default', name: t('variant_default_label') },
            ...selectedPack.variants.map((variant) => ({ id: variant.id, name: variant.name })),
          ].map((option) => (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: option.id === variantId }}
              onPress={() => setVariantId(option.id)}
              className={
                option.id === variantId
                  ? 'bg-accent-achievement rounded-full px-4 py-2'
                  : 'bg-bg-base rounded-full px-4 py-2'
              }
            >
              <Text
                className={
                  option.id === variantId
                    ? 'text-text-inverse text-sm font-bold'
                    : 'text-text-muted text-sm font-semibold'
                }
              >
                {option.name}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>

      <Button
        accessibilityLabel={t('adventurer_save_action')}
        label={t('adventurer_save_action')}
        size="lg"
        disabled={submitting}
        onPress={handleSubmit}
      />
    </Card>
  );
};

export { isAgeBucket };
