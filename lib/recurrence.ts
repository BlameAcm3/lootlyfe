import { z } from 'zod';

/**
 * Quest recurrence engine — pure functions over the quests.recurrence jsonb.
 *
 * Model decisions:
 * - Dates are local calendar dates as 'YYYY-MM-DD' strings, never Date
 *   objects. All arithmetic runs on UTC epoch-day integers, so a device DST
 *   transition can never skip or double an occurrence.
 * - The client always writes a complete rule (QuestForm fills startDate at
 *   creation); null/invalid recurrence yields no occurrences.
 * - weekly.days uses JS convention: 0 = Sunday … 6 = Saturday.
 * - monthly.day clamps to the last day of shorter months (31 → Feb 28).
 * - Time windows are wall-clock 'HH:MM' strings carried on the occurrence;
 *   status computation compares against an injected { date, minutes } "now",
 *   so the pure layer never touches the device clock.
 */

export type IsoDate = string; // 'YYYY-MM-DD'

export type TimeWindow = { start: string; end: string }; // 'HH:MM' wall clock

export type RecurrenceType = 'once' | 'daily' | 'weekly' | 'monthly';

type RecurrenceShared = {
  startDate?: IsoDate;
  endDate?: IsoDate;
  window?: TimeWindow;
};

export type Recurrence = RecurrenceShared &
  (
    | { type: 'once'; date: IsoDate }
    | { type: 'daily' }
    | { type: 'weekly'; days: number[] }
    | { type: 'monthly'; day: number }
  );

export type DateRange = { start: IsoDate; end: IsoDate }; // inclusive

export type QuestOccurrence = {
  questId: string;
  date: IsoDate;
  window?: TimeWindow;
};

/** Computed, never stored — see occurrenceStatus. */
export type OccurrenceStatus = 'pending' | 'in_progress' | 'completed' | 'expired';

const isoDateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const hhmmSchema = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);

const sharedShape = {
  startDate: isoDateSchema.optional(),
  endDate: isoDateSchema.optional(),
  window: z.object({ start: hhmmSchema, end: hhmmSchema }).optional(),
};

const recurrenceSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('once'), date: isoDateSchema, ...sharedShape }),
  z.object({ type: z.literal('daily'), ...sharedShape }),
  z.object({
    type: z.literal('weekly'),
    days: z.array(z.number().int().min(0).max(6)).min(1),
    ...sharedShape,
  }),
  z.object({ type: z.literal('monthly'), day: z.number().int().min(1).max(31), ...sharedShape }),
]);

/** Validates a quests.recurrence jsonb value; null on anything malformed. */
export const parseRecurrence = (value: unknown): Recurrence | null => {
  const result = recurrenceSchema.safeParse(value);
  return result.success ? result.data : null;
};

// --- DST-proof calendar math on epoch-day integers --------------------------

const MS_PER_DAY = 86_400_000;

const toEpochDay = (date: IsoDate): number => {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / MS_PER_DAY;
};

const fromEpochDay = (epochDay: number): IsoDate =>
  new Date(epochDay * MS_PER_DAY).toISOString().slice(0, 10);

/** 0 = Sunday … 6 = Saturday. 1970-01-01 was a Thursday (4). */
const weekdayOf = (epochDay: number): number => (((epochDay + 4) % 7) + 7) % 7;

const daysInMonth = (year: number, month: number): number =>
  new Date(Date.UTC(year, month, 0)).getUTCDate(); // month is 1-based here

const compareIso = (a: IsoDate, b: IsoDate): number => (a < b ? -1 : a > b ? 1 : 0);

const maxIso = (a: IsoDate, b: IsoDate): IsoDate => (compareIso(a, b) >= 0 ? a : b);
const minIso = (a: IsoDate, b: IsoDate): IsoDate => (compareIso(a, b) <= 0 ? a : b);

// --- Occurrence generation ---------------------------------------------------

type QuestScheduleSource = {
  id: string;
  recurrence: unknown;
};

/**
 * All due instances of a quest inside an inclusive date range. Accepts the
 * raw jsonb (a quests Row works directly); malformed rules yield [].
 */
export const occurrencesFor = (quest: QuestScheduleSource, range: DateRange): QuestOccurrence[] => {
  const rule = parseRecurrence(quest.recurrence);
  if (!rule || compareIso(range.start, range.end) > 0) return [];

  const start = rule.startDate ? maxIso(range.start, rule.startDate) : range.start;
  const end = rule.endDate ? minIso(range.end, rule.endDate) : range.end;
  if (compareIso(start, end) > 0) return [];

  const make = (date: IsoDate): QuestOccurrence =>
    rule.window ? { questId: quest.id, date, window: rule.window } : { questId: quest.id, date };

  if (rule.type === 'once') {
    return compareIso(rule.date, start) >= 0 && compareIso(rule.date, end) <= 0
      ? [make(rule.date)]
      : [];
  }

  const occurrences: QuestOccurrence[] = [];
  const firstDay = toEpochDay(start);
  const lastDay = toEpochDay(end);

  if (rule.type === 'monthly') {
    // Walk months, not days: due on min(rule.day, length of month).
    let [year, month] = start.split('-').map(Number);
    const [endYear, endMonth] = end.split('-').map(Number);
    while (year < endYear || (year === endYear && month <= endMonth)) {
      const day = Math.min(rule.day, daysInMonth(year, month));
      const date: IsoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      if (compareIso(date, start) >= 0 && compareIso(date, end) <= 0) {
        occurrences.push(make(date));
      }
      month += 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
    }
    return occurrences;
  }

  const weekdays = rule.type === 'weekly' ? new Set(rule.days) : null;
  for (let day = firstDay; day <= lastDay; day += 1) {
    if (weekdays && !weekdays.has(weekdayOf(day))) continue;
    occurrences.push(make(fromEpochDay(day)));
  }
  return occurrences;
};

// --- Status ------------------------------------------------------------------

export type ClockNow = {
  date: IsoDate;
  /** Minutes since local midnight. */
  minutes: number;
};

const windowMinutes = (hhmm: string): number => {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
};

/**
 * Computed status of one due instance:
 * - completed: a completion exists for this quest+adventurer+date
 * - expired:   the day (or its time window) passed without completion
 * - in_progress: due today and actionable now
 * - pending:   due in the future, or today before the window opens
 */
export const occurrenceStatus = (
  occurrence: Pick<QuestOccurrence, 'date' | 'window'>,
  options: { completed: boolean; now: ClockNow },
): OccurrenceStatus => {
  if (options.completed) return 'completed';
  const cmp = compareIso(occurrence.date, options.now.date);
  if (cmp < 0) return 'expired';
  if (cmp > 0) return 'pending';
  if (!occurrence.window) return 'in_progress';
  if (options.now.minutes < windowMinutes(occurrence.window.start)) return 'pending';
  if (options.now.minutes > windowMinutes(occurrence.window.end)) return 'expired';
  return 'in_progress';
};

// --- Calendar/range helpers (pure) -------------------------------------------

export const addDays = (date: IsoDate, days: number): IsoDate =>
  fromEpochDay(toEpochDay(date) + days);

export const isoWeekday = (date: IsoDate): number => weekdayOf(toEpochDay(date));

/** Calendar month containing `date`, as an inclusive range. */
export const monthRange = (date: IsoDate): DateRange => {
  const [year, month] = date.split('-').map(Number);
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return {
    start: `${prefix}-01`,
    end: `${prefix}-${String(daysInMonth(year, month)).padStart(2, '0')}`,
  };
};

/** First day of the month `offset` months away (offset may be negative). */
export const shiftMonth = (date: IsoDate, offset: number): IsoDate => {
  const [year, month] = date.split('-').map(Number);
  const total = year * 12 + (month - 1) + offset;
  const newYear = Math.floor(total / 12);
  const newMonth = (total % 12) + 1;
  return `${newYear}-${String(newMonth).padStart(2, '0')}-01`;
};

// --- Device clock adapters (the only impure lines in this module) ------------

/** The device's local calendar date as 'YYYY-MM-DD'. */
export const todayIso = (at: Date = new Date()): IsoDate => {
  const year = at.getFullYear();
  const month = String(at.getMonth() + 1).padStart(2, '0');
  const day = String(at.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const clockNow = (at: Date = new Date()): ClockNow => ({
  date: todayIso(at),
  minutes: at.getHours() * 60 + at.getMinutes(),
});
