import type { IsoDate } from './recurrence';

/**
 * Locale-aware date labels via Intl (Hermes ships full Intl on RN 0.81).
 * Date *names* are locale formatting, not theme copy, so they don't go
 * through the lexicon. All formatting pins timeZone: 'UTC' and builds the
 * Date at UTC midnight, so the rendered day never shifts with device TZ.
 */

const atUtc = (date: IsoDate): Date => new Date(`${date}T00:00:00Z`);

const formatter = (options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat =>
  new Intl.DateTimeFormat(undefined, { ...options, timeZone: 'UTC' });

/** 'June 2026' */
export const monthTitle = (date: IsoDate): string =>
  formatter({ month: 'long', year: 'numeric' }).format(atUtc(date));

/** 'Thu, Jun 11' */
export const dayTitle = (date: IsoDate): string =>
  formatter({ weekday: 'short', month: 'short', day: 'numeric' }).format(atUtc(date));

/** 'Mon' … keyed by JS weekday (0 = Sunday). */
export const weekdayShort = (weekday: number): string =>
  // 2023-01-01 was a Sunday; offset from it to hit the requested weekday.
  formatter({ weekday: 'short' }).format(new Date(Date.UTC(2023, 0, 1 + weekday)));

/** Single-letter calendar column header. */
export const weekdayNarrow = (weekday: number): string =>
  formatter({ weekday: 'narrow' }).format(new Date(Date.UTC(2023, 0, 1 + weekday)));

/**
 * 'Wed 5:12 PM' for a timestamptz — intentionally uses the device timezone
 * (it's a moment in time, not a calendar date).
 */
export const timeLabel = (isoTimestamp: string): string =>
  new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(isoTimestamp));
