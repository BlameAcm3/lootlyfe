import { useMemo } from 'react';

import {
  clockNow,
  occurrenceStatus,
  occurrencesFor,
  todayIso,
  type DateRange,
  type IsoDate,
  type OccurrenceStatus,
  type TimeWindow,
} from '../lib/recurrence';
import { useAdventurers, type AdventurerRow } from '../queries/adventurerQueries';
import { useGuildCompletions, useQuests, type QuestRow } from '../queries/questsQueries';

export type QuestLogEntry = {
  /** Stable list key: quest + adventurer + date. */
  key: string;
  quest: QuestRow;
  /** null when the quest has no assignees (still shown so it isn't lost). */
  adventurer: AdventurerRow | null;
  date: IsoDate;
  window?: TimeWindow;
  status: OccurrenceStatus;
};

const completionKey = (questId: string, adventurerId: string, date: IsoDate) =>
  `${questId}|${adventurerId}|${date}`;

/**
 * NPC quest log read model: expands every active quest's recurrence into due
 * instances per assigned adventurer across `range`, stamped with computed
 * status (completions are matched by the device-local date of completed_at).
 */
export const useQuestLog = (guildId: string | null | undefined, range: DateRange) => {
  const questsQuery = useQuests(guildId);
  const adventurersQuery = useAdventurers(guildId);
  const completionsQuery = useGuildCompletions(guildId, range);

  const entries = useMemo((): QuestLogEntry[] => {
    const quests = (questsQuery.data ?? []).filter((quest) => !quest.archived_at);
    const adventurersById = new Map(
      (adventurersQuery.data ?? []).map((adventurer) => [adventurer.id, adventurer]),
    );
    const completed = new Set(
      (completionsQuery.data ?? []).map((completion) =>
        completionKey(
          completion.quest_id,
          completion.adventurer_id,
          todayIso(new Date(completion.completed_at)),
        ),
      ),
    );
    const now = clockNow();

    const result: QuestLogEntry[] = [];
    for (const quest of quests) {
      const assignees =
        quest.assigned_adventurer_ids.length > 0
          ? quest.assigned_adventurer_ids.map((id) => adventurersById.get(id) ?? null)
          : [null];
      for (const occurrence of occurrencesFor(quest, range)) {
        for (const adventurer of assignees) {
          result.push({
            key: `${quest.id}|${adventurer?.id ?? 'none'}|${occurrence.date}`,
            quest,
            adventurer,
            date: occurrence.date,
            window: occurrence.window,
            status: occurrenceStatus(occurrence, {
              completed: adventurer
                ? completed.has(completionKey(quest.id, adventurer.id, occurrence.date))
                : false,
              now,
            }),
          });
        }
      }
    }

    return result.sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.window?.start ?? '').localeCompare(b.window?.start ?? '') ||
        a.quest.title.localeCompare(b.quest.title),
    );
  }, [questsQuery.data, adventurersQuery.data, completionsQuery.data, range]);

  return {
    entries,
    isLoading: questsQuery.isLoading || adventurersQuery.isLoading || completionsQuery.isLoading,
  };
};
