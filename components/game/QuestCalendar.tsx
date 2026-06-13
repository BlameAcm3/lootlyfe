import { useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

import { monthTitle, weekdayNarrow } from '../../lib/dates';
import { cn } from '../../lib/cn';
import {
  addDays,
  isoWeekday,
  monthRange,
  todayIso,
  type IsoDate,
  type OccurrenceStatus,
} from '../../lib/recurrence';

// Static literals so NativeWind compiles each class.
const statusDots: Record<OccurrenceStatus, string> = {
  pending: 'bg-text-muted',
  in_progress: 'bg-accent-info',
  completed: 'bg-accent-progress',
  expired: 'bg-danger',
};

const DOT_ORDER: OccurrenceStatus[] = ['in_progress', 'pending', 'completed', 'expired'];

type QuestCalendarProps = {
  /** Any date inside the rendered month. */
  month: IsoDate;
  /** Statuses present per date, for the day-cell dots. */
  statusesByDate: ReadonlyMap<IsoDate, ReadonlySet<OccurrenceStatus>>;
  selectedDate: IsoDate;
  onSelectDate: (date: IsoDate) => void;
  onShiftMonth: (offset: -1 | 1) => void;
};

/** Month grid with status dots per day; tapping a day drives the day list. */
export const QuestCalendar = ({
  month,
  statusesByDate,
  selectedDate,
  onSelectDate,
  onShiftMonth,
}: QuestCalendarProps) => {
  const today = todayIso();

  const weeks = useMemo(() => {
    const range = monthRange(month);
    const cells: (IsoDate | null)[] = Array.from({ length: isoWeekday(range.start) }, () => null);
    for (let date = range.start; date <= range.end; date = addDays(date, 1)) {
      cells.push(date);
    }
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (IsoDate | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));
    return rows;
  }, [month]);

  return (
    <View className="gap-2">
      <View className="flex-row items-center justify-between">
        <Pressable
          accessibilityRole="button"
          onPress={() => onShiftMonth(-1)}
          className="bg-bg-base h-9 w-9 items-center justify-center rounded-xl"
        >
          <Text className="text-text-primary text-base font-black">‹</Text>
        </Pressable>
        <Text className="text-text-primary text-base font-extrabold">{monthTitle(month)}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => onShiftMonth(1)}
          className="bg-bg-base h-9 w-9 items-center justify-center rounded-xl"
        >
          <Text className="text-text-primary text-base font-black">›</Text>
        </Pressable>
      </View>

      <View className="flex-row">
        {[0, 1, 2, 3, 4, 5, 6].map((weekday) => (
          <Text
            key={weekday}
            className="text-text-muted flex-1 text-center text-[10px] font-bold uppercase"
          >
            {weekdayNarrow(weekday)}
          </Text>
        ))}
      </View>

      {weeks.map((week, weekIndex) => (
        <View key={weekIndex} className="flex-row">
          {week.map((date, dayIndex) => {
            if (!date) return <View key={dayIndex} className="flex-1 p-0.5" />;
            const statuses = statusesByDate.get(date);
            const selected = date === selectedDate;
            return (
              <Pressable
                key={dayIndex}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                onPress={() => onSelectDate(date)}
                className="flex-1 p-0.5"
              >
                <View
                  className={cn(
                    'items-center rounded-xl py-1.5',
                    selected ? 'bg-accent-info' : date === today ? 'bg-bg-base' : undefined,
                  )}
                >
                  <Text
                    className={cn(
                      'text-xs',
                      selected ? 'text-text-inverse font-black' : 'text-text-primary font-semibold',
                    )}
                  >
                    {Number(date.slice(8))}
                  </Text>
                  <View className="h-1.5 flex-row gap-0.5 pt-0.5">
                    {DOT_ORDER.filter((status) => statuses?.has(status)).map((status) => (
                      <View
                        key={status}
                        className={cn('h-1 w-1 rounded-full', statusDots[status])}
                      />
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
};
