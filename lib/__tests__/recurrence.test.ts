import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  addDays,
  clockNow,
  isoWeekday,
  monthRange,
  occurrenceStatus,
  occurrencesFor,
  parseRecurrence,
  shiftMonth,
  todayIso,
  type ClockNow,
  type Recurrence,
} from '../recurrence.ts';

// A US timezone with DST so any accidental local-time math in the engine
// would surface here. The engine is UTC-epoch-day based, so results must be
// identical regardless of this setting.
process.env.TZ = 'America/New_York';

const quest = (recurrence: Recurrence | null | Record<string, unknown>) => ({
  id: 'q1',
  recurrence,
});

const dates = (occurrences: { date: string }[]) => occurrences.map((o) => o.date);

describe('parseRecurrence', () => {
  test('accepts all four rule types', () => {
    assert.ok(parseRecurrence({ type: 'once', date: '2026-06-15' }));
    assert.ok(parseRecurrence({ type: 'daily' }));
    assert.ok(parseRecurrence({ type: 'weekly', days: [1, 3, 5] }));
    assert.ok(parseRecurrence({ type: 'monthly', day: 31 }));
  });

  test('accepts shared fields', () => {
    assert.ok(
      parseRecurrence({
        type: 'daily',
        startDate: '2026-06-01',
        endDate: '2026-06-30',
        window: { start: '07:00', end: '08:30' },
      }),
    );
  });

  test('rejects malformed rules', () => {
    assert.equal(parseRecurrence(null), null);
    assert.equal(parseRecurrence('daily'), null);
    assert.equal(parseRecurrence({ type: 'weekly', days: [] }), null);
    assert.equal(parseRecurrence({ type: 'weekly', days: [7] }), null);
    assert.equal(parseRecurrence({ type: 'monthly', day: 0 }), null);
    assert.equal(parseRecurrence({ type: 'monthly', day: 32 }), null);
    assert.equal(parseRecurrence({ type: 'once', date: '06/15/2026' }), null);
    assert.equal(
      parseRecurrence({ type: 'daily', window: { start: '24:00', end: '25:00' } }),
      null,
    );
  });
});

describe('occurrencesFor — once', () => {
  test('inside the range yields exactly one instance', () => {
    const occurrences = occurrencesFor(quest({ type: 'once', date: '2026-06-15' }), {
      start: '2026-06-01',
      end: '2026-06-30',
    });
    assert.deepEqual(dates(occurrences), ['2026-06-15']);
    assert.equal(occurrences[0].questId, 'q1');
  });

  test('outside the range yields nothing', () => {
    const occurrences = occurrencesFor(quest({ type: 'once', date: '2026-07-01' }), {
      start: '2026-06-01',
      end: '2026-06-30',
    });
    assert.deepEqual(occurrences, []);
  });

  test('carries the time window', () => {
    const occurrences = occurrencesFor(
      quest({ type: 'once', date: '2026-06-15', window: { start: '16:00', end: '18:00' } }),
      { start: '2026-06-15', end: '2026-06-15' },
    );
    assert.deepEqual(occurrences[0].window, { start: '16:00', end: '18:00' });
  });
});

describe('occurrencesFor — daily', () => {
  test('covers every day of an inclusive range', () => {
    const occurrences = occurrencesFor(quest({ type: 'daily' }), {
      start: '2026-06-08',
      end: '2026-06-12',
    });
    assert.deepEqual(dates(occurrences), [
      '2026-06-08',
      '2026-06-09',
      '2026-06-10',
      '2026-06-11',
      '2026-06-12',
    ]);
  });

  test('crosses a month boundary without gaps or duplicates', () => {
    const occurrences = occurrencesFor(quest({ type: 'daily' }), {
      start: '2026-01-30',
      end: '2026-02-02',
    });
    assert.deepEqual(dates(occurrences), ['2026-01-30', '2026-01-31', '2026-02-01', '2026-02-02']);
  });

  test('crosses a leap-year February boundary', () => {
    const occurrences = occurrencesFor(quest({ type: 'daily' }), {
      start: '2028-02-28',
      end: '2028-03-01',
    });
    assert.deepEqual(dates(occurrences), ['2028-02-28', '2028-02-29', '2028-03-01']);
  });

  test('is clipped by startDate and endDate', () => {
    const occurrences = occurrencesFor(
      quest({ type: 'daily', startDate: '2026-06-10', endDate: '2026-06-11' }),
      { start: '2026-06-01', end: '2026-06-30' },
    );
    assert.deepEqual(dates(occurrences), ['2026-06-10', '2026-06-11']);
  });

  test('yields nothing when bounds and range do not overlap', () => {
    const occurrences = occurrencesFor(quest({ type: 'daily', endDate: '2026-05-31' }), {
      start: '2026-06-01',
      end: '2026-06-30',
    });
    assert.deepEqual(occurrences, []);
  });
});

describe('occurrencesFor — DST transitions', () => {
  // US DST 2026: spring forward Sun 2026-03-08, fall back Sun 2026-11-01.
  test('spring-forward day appears exactly once', () => {
    const occurrences = occurrencesFor(quest({ type: 'daily' }), {
      start: '2026-03-07',
      end: '2026-03-10',
    });
    assert.deepEqual(dates(occurrences), ['2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10']);
  });

  test('fall-back day appears exactly once', () => {
    const occurrences = occurrencesFor(quest({ type: 'daily' }), {
      start: '2026-10-31',
      end: '2026-11-02',
    });
    assert.deepEqual(dates(occurrences), ['2026-10-31', '2026-11-01', '2026-11-02']);
  });

  test('weekly Sunday pick lands on both DST Sundays', () => {
    const spring = occurrencesFor(quest({ type: 'weekly', days: [0] }), {
      start: '2026-03-02',
      end: '2026-03-09',
    });
    assert.deepEqual(dates(spring), ['2026-03-08']);
    const fall = occurrencesFor(quest({ type: 'weekly', days: [0] }), {
      start: '2026-10-26',
      end: '2026-11-02',
    });
    assert.deepEqual(dates(fall), ['2026-11-01']);
  });
});

describe('occurrencesFor — weekly', () => {
  test('multi-day picks across a month boundary', () => {
    // 2026-01-28 is a Wednesday. Mon/Wed/Fri picks:
    const occurrences = occurrencesFor(quest({ type: 'weekly', days: [1, 3, 5] }), {
      start: '2026-01-28',
      end: '2026-02-04',
    });
    assert.deepEqual(dates(occurrences), ['2026-01-28', '2026-01-30', '2026-02-02', '2026-02-04']);
  });

  test('single weekday yields one instance per week', () => {
    // June 2026: Mondays are 1, 8, 15, 22, 29.
    const occurrences = occurrencesFor(quest({ type: 'weekly', days: [1] }), {
      start: '2026-06-01',
      end: '2026-06-30',
    });
    assert.deepEqual(dates(occurrences), [
      '2026-06-01',
      '2026-06-08',
      '2026-06-15',
      '2026-06-22',
      '2026-06-29',
    ]);
  });

  test('weekend picks wrap the Saturday→Sunday boundary', () => {
    // 2026-06-06 Saturday, 2026-06-07 Sunday.
    const occurrences = occurrencesFor(quest({ type: 'weekly', days: [0, 6] }), {
      start: '2026-06-05',
      end: '2026-06-08',
    });
    assert.deepEqual(dates(occurrences), ['2026-06-06', '2026-06-07']);
  });
});

describe('occurrencesFor — monthly', () => {
  test('day 31 clamps to short months', () => {
    const occurrences = occurrencesFor(quest({ type: 'monthly', day: 31 }), {
      start: '2026-01-01',
      end: '2026-04-30',
    });
    assert.deepEqual(dates(occurrences), ['2026-01-31', '2026-02-28', '2026-03-31', '2026-04-30']);
  });

  test('day 31 lands on Feb 29 in a leap year', () => {
    const occurrences = occurrencesFor(quest({ type: 'monthly', day: 31 }), {
      start: '2028-02-01',
      end: '2028-02-29',
    });
    assert.deepEqual(dates(occurrences), ['2028-02-29']);
  });

  test('skips a partial first month whose due day already passed', () => {
    const occurrences = occurrencesFor(quest({ type: 'monthly', day: 10 }), {
      start: '2026-01-15',
      end: '2026-02-20',
    });
    assert.deepEqual(dates(occurrences), ['2026-02-10']);
  });

  test('crosses a year boundary', () => {
    const occurrences = occurrencesFor(quest({ type: 'monthly', day: 15 }), {
      start: '2026-12-01',
      end: '2027-01-31',
    });
    assert.deepEqual(dates(occurrences), ['2026-12-15', '2027-01-15']);
  });
});

describe('occurrencesFor — guards', () => {
  test('null or malformed recurrence yields nothing', () => {
    assert.deepEqual(occurrencesFor(quest(null), { start: '2026-06-01', end: '2026-06-30' }), []);
    assert.deepEqual(
      occurrencesFor(quest({ type: 'sometimes' }), { start: '2026-06-01', end: '2026-06-30' }),
      [],
    );
  });

  test('inverted range yields nothing', () => {
    assert.deepEqual(
      occurrencesFor(quest({ type: 'daily' }), { start: '2026-06-30', end: '2026-06-01' }),
      [],
    );
  });
});

describe('occurrenceStatus', () => {
  const now: ClockNow = { date: '2026-06-11', minutes: 12 * 60 }; // noon

  test('completed wins over everything', () => {
    assert.equal(
      occurrenceStatus(
        { date: '2026-06-01', window: { start: '06:00', end: '07:00' } },
        { completed: true, now },
      ),
      'completed',
    );
  });

  test('past days are expired, future days pending', () => {
    assert.equal(occurrenceStatus({ date: '2026-06-10' }, { completed: false, now }), 'expired');
    assert.equal(occurrenceStatus({ date: '2026-06-12' }, { completed: false, now }), 'pending');
  });

  test('today without a window is in progress', () => {
    assert.equal(
      occurrenceStatus({ date: '2026-06-11' }, { completed: false, now }),
      'in_progress',
    );
  });

  test('today with a window: pending before, in progress during, expired after', () => {
    const occ = { date: '2026-06-11', window: { start: '16:00', end: '18:00' } };
    assert.equal(
      occurrenceStatus(occ, { completed: false, now: { date: '2026-06-11', minutes: 15 * 60 } }),
      'pending',
    );
    assert.equal(
      occurrenceStatus(occ, { completed: false, now: { date: '2026-06-11', minutes: 17 * 60 } }),
      'in_progress',
    );
    assert.equal(
      occurrenceStatus(occ, { completed: false, now: { date: '2026-06-11', minutes: 19 * 60 } }),
      'expired',
    );
  });

  test('window boundaries are inclusive', () => {
    const occ = { date: '2026-06-11', window: { start: '16:00', end: '18:00' } };
    assert.equal(
      occurrenceStatus(occ, { completed: false, now: { date: '2026-06-11', minutes: 16 * 60 } }),
      'in_progress',
    );
    assert.equal(
      occurrenceStatus(occ, { completed: false, now: { date: '2026-06-11', minutes: 18 * 60 } }),
      'in_progress',
    );
  });
});

describe('calendar helpers', () => {
  test('addDays crosses month and year boundaries', () => {
    assert.equal(addDays('2026-01-31', 1), '2026-02-01');
    assert.equal(addDays('2026-12-31', 1), '2027-01-01');
    assert.equal(addDays('2026-03-01', -1), '2026-02-28');
  });

  test('isoWeekday matches known anchors', () => {
    assert.equal(isoWeekday('2026-03-08'), 0); // Sunday
    assert.equal(isoWeekday('2026-06-11'), 4); // Thursday
  });

  test('monthRange covers February correctly', () => {
    assert.deepEqual(monthRange('2026-02-14'), { start: '2026-02-01', end: '2026-02-28' });
    assert.deepEqual(monthRange('2028-02-14'), { start: '2028-02-01', end: '2028-02-29' });
  });

  test('shiftMonth wraps year boundaries both ways', () => {
    assert.equal(shiftMonth('2026-12-05', 1), '2027-01-01');
    assert.equal(shiftMonth('2026-01-05', -1), '2025-12-01');
    assert.equal(shiftMonth('2026-06-15', 0), '2026-06-01');
  });

  test('todayIso and clockNow read a provided Date', () => {
    const at = new Date(2026, 5, 11, 7, 30); // local components, TZ-independent
    assert.equal(todayIso(at), '2026-06-11');
    assert.deepEqual(clockNow(at), { date: '2026-06-11', minutes: 7 * 60 + 30 });
  });
});
