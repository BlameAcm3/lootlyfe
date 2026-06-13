import { useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';

import { Button, Card } from '../../components/ui';
import { useLexicon } from '../../hooks/useLexicon';
import { useGuildDataExport } from '../../queries/guildQueries';

/**
 * COPPA data-access right: shows the guild's full data export (JSON) with a
 * copy-to-clipboard action. The Edge Function (export-guild-data) compiles it
 * RLS-scoped to the signed-in NPC's guild.
 */
export default function DataExportScreen() {
  const { t } = useLexicon();
  const { data, isLoading, isError } = useGuildDataExport(true);
  const [copied, setCopied] = useState(false);

  const onCopy = async () => {
    if (!data) return;
    await Clipboard.setStringAsync(data);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base">
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="gap-1 pt-2">
          <Text className="text-text-primary text-2xl font-extrabold">{t('data_export_title')}</Text>
          <Text className="text-text-muted text-sm">{t('data_export_subtitle')}</Text>
        </View>

        {isLoading ? (
          <Text className="text-text-muted text-sm">{t('data_export_loading')}</Text>
        ) : isError || !data ? (
          <Text className="text-danger text-sm">{t('data_export_error')}</Text>
        ) : (
          <>
            <Button
              label={copied ? t('data_export_copied') : t('data_export_copy_action')}
              variant="gold"
              onPress={onCopy}
            />
            <Card>
              <Text selectable className="text-text-muted font-mono text-xs leading-5">
                {data}
              </Text>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
