import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { monthRange, occurrencesFor, shiftMonth, type Recurrence } from '../recurrence.ts';

/**
 * Acceptance-shaped checks: one quest per recurrence type, expanded exactly
 * the way the calendar view does it (monthRange + shiftMonth paging), and
 * the multi-adventurer expansion the quest log applies on top.
 */
describe('acceptance: calendar view across a month boundary', () => {
  const recurrences: Record<string, Recurrence> = {
    daily: { type: 'daily', startDate: '2026-06-20' },
    weekly: { type: 'weekly', days: [1, 3, 5], startDate: '2026-06-20' },
    monthly: { type: 'monthly', day: 31, startDate: '2026-06-20' },
    once: { type: 'once', date: '2026-07-01', window: { start: '16:00', end: '18:00' } },
  };

  const june = monthRange('2026-06-11');
  const july = monthRange(shiftMonth('2026-06-11', 1));

  test('daily: due every day from its start through both months', () => {
    const inJune = occurrencesFor({ id: 'd', recurrence: recurrences.daily }, june);
    const inJuly = occurrencesFor({ id: 'd', recurrence: recurrences.daily }, july);
    assert.equal(inJune.length, 11); // Jun 20–30
    assert.equal(inJuly.length, 31); // every day of July
    assert.equal(inJune[0].date, '2026-06-20');
    assert.equal(inJuly[0].date, '2026-07-01');
  });

  test('weekly Mon/Wed/Fri: correct picks in each month page', () => {
    const inJune = occurrencesFor({ id: 'w', recurrence: recurrences.weekly }, june);
    const inJuly = occurrencesFor({ id: 'w', recurrence: recurrences.weekly }, july);
    // Jun 20 is a Saturday; remaining Mon/Wed/Fri in June:
    assert.deepEqual(
      inJune.map((o) => o.date),
      ['2026-06-22', '2026-06-24', '2026-06-26', '2026-06-29'],
    );
    assert.equal(inJuly[0].date, '2026-07-01'); // Wednesday
    assert.equal(inJuly.length, 14);
  });

  test('monthly day 31: lands on Jun 30 (clamped) and Jul 31', () => {
    const inJune = occurrencesFor({ id: 'm', recurrence: recurrences.monthly }, june);
    const inJuly = occurrencesFor({ id: 'm', recurrence: recurrences.monthly }, july);
    assert.deepEqual(
      inJune.map((o) => o.date),
      ['2026-06-30'],
    );
    assert.deepEqual(
      inJuly.map((o) => o.date),
      ['2026-07-31'],
    );
  });

  test('once: appears only on its July page, window intact', () => {
    const inJune = occurrencesFor({ id: 'o', recurrence: recurrences.once }, june);
    const inJuly = occurrencesFor({ id: 'o', recurrence: recurrences.once }, july);
    assert.deepEqual(inJune, []);
    assert.equal(inJuly.length, 1);
    assert.deepEqual(inJuly[0].window, { start: '16:00', end: '18:00' });
  });

  test('multi-adventurer assignment: one log entry per assignee per due date', () => {
    const assigned = ['adv-1', 'adv-2', 'adv-3'];
    const occurrences = occurrencesFor(
      { id: 'd', recurrence: recurrences.daily },
      { start: '2026-06-29', end: '2026-07-02' },
    );
    const entries = occurrences.flatMap((occurrence) =>
      assigned.map((adventurerId) => ({ adventurerId, date: occurrence.date })),
    );
    assert.equal(entries.length, 4 * 3);
    assert.equal(new Set(entries.map((e) => `${e.adventurerId}|${e.date}`)).size, 12);
  });
});
