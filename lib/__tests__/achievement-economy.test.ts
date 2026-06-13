import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { COSMETIC_SLOTS, PRESET_COSMETICS } from '../../data/cosmetics.ts';
import { PRESET_ACHIEVEMENTS } from '../../data/preset-achievements.ts';

/**
 * Catalog invariants the DB seeds in migration 014 rely on (counts and ids
 * are cross-checked against the live seeds by
 * supabase/snippets/acceptance_achievement_economy.sql).
 */
describe('preset achievements catalog', () => {
  test('at least 15 achievements, ids unique', () => {
    assert.ok(PRESET_ACHIEVEMENTS.length >= 15, `only ${PRESET_ACHIEVEMENTS.length}`);
    const ids = PRESET_ACHIEVEMENTS.map((a) => a.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('every achievement grants positive points', () => {
    for (const achievement of PRESET_ACHIEVEMENTS) {
      assert.ok(achievement.points > 0, achievement.id);
      assert.ok(achievement.threshold >= 1, achievement.id);
    }
  });

  test('thresholds and points both ascend within each kind (no inversions)', () => {
    const kinds = new Set(PRESET_ACHIEVEMENTS.map((a) => a.kind));
    for (const kind of kinds) {
      const tier = PRESET_ACHIEVEMENTS.filter((a) => a.kind === kind);
      const sorted = [...tier].sort((a, b) => a.threshold - b.threshold);
      for (let i = 1; i < sorted.length; i += 1) {
        assert.ok(sorted[i].threshold > sorted[i - 1].threshold, `${kind} thresholds`);
        assert.ok(sorted[i].points > sorted[i - 1].points, `${kind} points`);
      }
    }
  });

  test('covers the spec moments: first quest, 7-day streak, 100 quests, first redemption, level milestones, perfect week', () => {
    const ids = new Set<string>(PRESET_ACHIEVEMENTS.map((a) => a.id));
    for (const required of [
      'first-quest',
      'streak-7',
      'quests-100',
      'first-redemption',
      'level-5',
      'level-10',
      'required-week',
    ]) {
      assert.ok(ids.has(required), required);
    }
  });
});

describe('preset cosmetics catalog', () => {
  test('keys unique, every slot represented', () => {
    const keys = PRESET_COSMETICS.map((c) => c.key);
    assert.equal(new Set(keys).size, keys.length);
    for (const slot of COSMETIC_SLOTS) {
      assert.ok(
        PRESET_COSMETICS.some((c) => c.slot === slot),
        `slot ${slot} has no items`,
      );
    }
  });

  test('item keys match their declared slot prefix convention', () => {
    const prefix = { head: 'head-', body: 'body-', accessory: 'acc-' } as const;
    for (const cosmetic of PRESET_COSMETICS) {
      assert.ok(cosmetic.key.startsWith(prefix[cosmetic.slot]), cosmetic.key);
    }
  });
});
