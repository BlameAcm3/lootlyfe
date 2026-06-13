import { useMemo, useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { QuestCalendar, QuestLogRow } from '../../../components/game';
import { Button, Card, Modal, SectionHeader } from '../../../components/ui';
import { useLexicon } from '../../../hooks/useLexicon';
import { useQuestLog, type QuestLogEntry } from '../../../hooks/useQuestLog';
import { cn } from '../../../lib/cn';
import { dayTitle } from '../../../lib/dates';
import type { LexiconKey } from '../../../lib/lexicon';
import {
  addDays,
  monthRange,
  shiftMonth,
  todayIso,
  type IsoDate,
  type OccurrenceStatus,
} from '../../../lib/recurrence';
import { useCurrentGuild } from '../../../queries/guildQueries';
import { isActiveCustomQuest, useQuests } from '../../../queries/questsQueries';
import { useSubscription } from '@/features/subscriptions';

type LogView = 'today' | 'week' | 'month' | 'byAdventurer';
type StatusFilter = OccurrenceStatus | 'all';

const VIEW_KEYS: Record<LogView, LexiconKey> = {
  today: 'quest_log_view_today',
  week: 'quest_log_view_week',
  month: 'quest_log_view_month',
  byAdventurer: 'quest_log_view_by_adventurer',
};

const STATUS_FILTERS: { id: StatusFilter; labelKey: LexiconKey }[] = [
  { id: 'all', labelKey: 'filter_all' },
  { id: 'pending', labelKey: 'quest_status_pending' },
  { id: 'in_progress', labelKey: 'quest_status_in_progress' },
  { id: 'completed', labelKey: 'quest_status_completed' },
  { id: 'expired', labelKey: 'quest_status_expired' },
];

function FilterChip({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ selected }}
      onPress={onPress}
      className={cn('rounded-full px-3.5 py-1.5', selected ? 'bg-accent-info' : 'bg-surface')}
    >
      <Text
        className={cn(
          'text-xs',
          selected ? 'text-text-inverse font-bold' : 'text-text-muted font-semibold',
        )}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EntryList({
  entries,
  emptyText,
  onPressEntry,
}: {
  entries: QuestLogEntry[];
  emptyText: string;
  onPressEntry: (entry: QuestLogEntry) => void;
}) {
  if (entries.length === 0) {
    return (
      <Card className="items-center gap-2 p-6">
        <Text className="text-3xl">🗒️</Text>
        <Text className="text-text-muted text-center text-sm">{emptyText}</Text>
      </Card>
    );
  }
  return (
    <View className="gap-2">
      {entries.map((entry) => (
        <QuestLogRow key={entry.key} entry={entry} onPress={() => onPressEntry(entry)} />
      ))}
    </View>
  );
}

export default function QuestLogScreen() {
  const { t } = useLexicon();
  const router = useRouter();
  const { guild } = useCurrentGuild();
  const { checkLimit, openPaywall, limits } = useSubscription();
  const questsQuery = useQuests(guild?.id);

  const today = todayIso();
  const [view, setView] = useState<LogView>('today');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [month, setMonth] = useState<IsoDate>(today);
  const [selectedDate, setSelectedDate] = useState<IsoDate>(today);
  const [limitNudgeVisible, setLimitNudgeVisible] = useState(false);

  const range = useMemo(() => {
    if (view === 'today') return { start: today, end: today };
    if (view === 'month') return monthRange(month);
    return { start: today, end: addDays(today, 6) }; // week + byAdventurer
  }, [view, month, today]);

  const { entries } = useQuestLog(guild?.id, range);

  const filtered = useMemo(
    () => (statusFilter === 'all' ? entries : entries.filter((e) => e.status === statusFilter)),
    [entries, statusFilter],
  );

  const statusesByDate = useMemo(() => {
    const map = new Map<IsoDate, Set<OccurrenceStatus>>();
    for (const entry of filtered) {
      const set = map.get(entry.date) ?? new Set<OccurrenceStatus>();
      set.add(entry.status);
      map.set(entry.date, set);
    }
    return map;
  }, [filtered]);

  const quests = questsQuery.data ?? [];
  const activeCustomCount = quests.filter(isActiveCustomQuest).length;
  const archivedQuests = quests.filter((quest) => quest.archived_at);

  const handleNewQuest = () => {
    // Client check is UX; the BEFORE INSERT trigger (migration 017) is the law.
    if (!checkLimit('custom_quests', activeCustomCount).allowed) {
      setLimitNudgeVisible(true);
      return;
    }
    router.push('/(parent)/quests/new');
  };

  const openEntry = (entry: QuestLogEntry) =>
    router.push({ pathname: '/(parent)/quests/[id]', params: { id: entry.quest.id } });

  const groupedByDate = useMemo(() => {
    const groups = new Map<IsoDate, QuestLogEntry[]>();
    for (const entry of filtered) {
      groups.set(entry.date, [...(groups.get(entry.date) ?? []), entry]);
    }
    return [...groups.entries()];
  }, [filtered]);

  const groupedByAdventurer = useMemo(() => {
    const groups = new Map<string, { label: string; entries: QuestLogEntry[] }>();
    for (const entry of filtered) {
      const id = entry.adventurer?.id ?? 'none';
      const group = groups.get(id) ?? {
        label: entry.adventurer?.nickname ?? t('quest_unassigned_label'),
        entries: [],
      };
      group.entries.push(entry);
      groups.set(id, group);
    }
    return [...groups.values()];
  }, [filtered, t]);

  return (
    <SafeAreaView style={{ flex: 1 }} className="bg-bg-base" edges={['top']}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 48 }}>
        <View className="flex-row items-center justify-between pt-2">
          <Text className="text-text-primary text-3xl font-black">{t('quest_plural')}</Text>
          <Button label={`+ ${t('quest_new_action')}`} size="sm" onPress={handleNewQuest} />
        </View>

        <Button
          label={t('browse_presets_action')}
          variant="ghost"
          size="sm"
          onPress={() => router.push('/(parent)/quests/presets')}
        />

        {/* View switcher */}
        <View className="flex-row flex-wrap gap-2">
          {(Object.keys(VIEW_KEYS) as LogView[]).map((option) => (
            <FilterChip
              key={option}
              label={t(VIEW_KEYS[option])}
              selected={view === option}
              onPress={() => setView(option)}
            />
          ))}
        </View>

        {/* Status filter */}
        <View className="flex-row flex-wrap gap-2">
          {STATUS_FILTERS.map((option) => (
            <FilterChip
              key={option.id}
              label={t(option.labelKey)}
              selected={statusFilter === option.id}
              onPress={() => setStatusFilter(option.id)}
            />
          ))}
        </View>

        {view === 'today' ? (
          <EntryList entries={filtered} emptyText={t('quest_log_empty')} onPressEntry={openEntry} />
        ) : null}

        {view === 'week' ? (
          groupedByDate.length === 0 ? (
            <EntryList entries={[]} emptyText={t('quest_log_empty')} onPressEntry={openEntry} />
          ) : (
            groupedByDate.map(([date, dayEntries]) => (
              <View key={date} className="gap-2">
                <SectionHeader title={dayTitle(date)} />
                <EntryList
                  entries={dayEntries}
                  emptyText={t('quest_log_empty')}
                  onPressEntry={openEntry}
                />
              </View>
            ))
          )
        ) : null}

        {view === 'month' ? (
          <View className="gap-3">
            <Card>
              <QuestCalendar
                month={month}
                statusesByDate={statusesByDate}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onShiftMonth={(offset) => {
                  const next = shiftMonth(month, offset);
                  setMonth(next);
                  setSelectedDate(next);
                }}
              />
            </Card>
            <SectionHeader title={dayTitle(selectedDate)} />
            <EntryList
              entries={filtered.filter((entry) => entry.date === selectedDate)}
              emptyText={t('quest_log_empty')}
              onPressEntry={openEntry}
            />
          </View>
        ) : null}

        {view === 'byAdventurer' ? (
          groupedByAdventurer.length === 0 ? (
            <EntryList entries={[]} emptyText={t('quest_log_empty')} onPressEntry={openEntry} />
          ) : (
            groupedByAdventurer.map((group) => (
              <View key={group.label} className="gap-2">
                <SectionHeader title={group.label} />
                <EntryList
                  entries={group.entries}
                  emptyText={t('quest_log_empty')}
                  onPressEntry={openEntry}
                />
              </View>
            ))
          )
        ) : null}

        {archivedQuests.length > 0 ? (
          <View className="gap-2 pt-4">
            <SectionHeader title={t('archived_section_label')} />
            {archivedQuests.map((quest) => (
              <Pressable
                key={quest.id}
                accessibilityRole="button"
                onPress={() =>
                  router.push({ pathname: '/(parent)/quests/[id]', params: { id: quest.id } })
                }
                style={{ opacity: 0.55 }}
              >
                <Card className="flex-row items-center justify-between">
                  <Text className="text-text-primary text-sm font-bold" numberOfLines={1}>
                    {quest.title}
                  </Text>
                  <Text className="text-text-muted text-xl">›</Text>
                </Card>
              </Pressable>
            ))}
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={limitNudgeVisible} onClose={() => setLimitNudgeVisible(false)}>
        <View className="gap-3">
          <Text className="text-text-primary text-lg font-extrabold">{t('quest_limit_title')}</Text>
          <Text className="text-text-muted text-sm leading-5">
            {t('quest_limit_body', { limit: limits.custom_quests })}
          </Text>
          <Button
            label={t('upgrade_action')}
            variant="gold"
            onPress={() => {
              setLimitNudgeVisible(false);
              openPaywall('quest_limit');
            }}
          />
          <Button
            label={t('not_now_action')}
            variant="ghost"
            onPress={() => setLimitNudgeVisible(false)}
          />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
