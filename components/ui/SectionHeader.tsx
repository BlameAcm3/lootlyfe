import { Text, View } from 'react-native';

type SectionHeaderProps = {
  title: string;
  /** Optional right-aligned action slot. */
  action?: React.ReactNode;
};

export const SectionHeader = ({ title, action }: SectionHeaderProps) => (
  <View className="flex-row items-center justify-between pt-2">
    <Text className="text-text-muted text-xs font-extrabold uppercase tracking-widest">
      {title}
    </Text>
    {action ?? null}
  </View>
);
