import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import {
  ACHIEVEMENT_POINTS_PER_LEVEL_UP,
  STREAK_TIER_MULTIPLIERS,
  STREAK_TIER_THRESHOLDS,
  XP_CURVE,
} from '../../constants/game.ts';
import {
  achievementPointsForLevelUp,
  averageGoldReward,
  calculateQuestReward,
  levelFromXp,
  questsAwayFromLoot,
  streakMultiplier,
  totalXpForLevel,
  xpForLevel,
  xpProgress,
} from '../game-math.ts';

describe('xpForLevel', () => {
  test('known curve values (base 100, growth 1.15, rounded per level)', () => {
    assert.equal(xpForLevel(1), 100);
    assert.equal(xpForLevel(2), 115);
    assert.equal(xpForLevel(3), 132); // 132.25 rounds down
    assert.equal(xpForLevel(4), 152); // 152.0875
    assert.equal(xpForLevel(5), 175); // 174.900625
    assert.equal(xpForLevel(10), 352); // 351.788...
    assert.equal(xpForLevel(20), 1423); // 1423.177...
    assert.equal(xpForLevel(49), 81940); // 100 * 1.15^48 = 81940.39...
  });

  test('strictly increasing below the cap', () => {
    for (let level = 1; level < XP_CURVE.levelCap - 1; level += 1) {
      assert.ok(xpForLevel(level + 1) > xpForLevel(level), `level ${level}`);
    }
  });

  test('returns 0 at and beyond the cap, and for invalid levels', () => {
    assert.equal(xpForLevel(XP_CURVE.levelCap), 0);
    assert.equal(xpForLevel(XP_CURVE.levelCap + 1), 0);
    assert.equal(xpForLevel(0), 0);
    assert.equal(xpForLevel(-3), 0);
  });
});

describe('totalXpForLevel', () => {
  test('level 1 starts at 0; level 2 at 100; level 3 at 215', () => {
    assert.equal(totalXpForLevel(1), 0);
    assert.equal(totalXpForLevel(2), 100);
    assert.equal(totalXpForLevel(3), 215);
    assert.equal(totalXpForLevel(4), 347);
  });

  test('clamps above the cap (no XP requirement past 50)', () => {
    assert.equal(totalXpForLevel(XP_CURVE.levelCap + 5), totalXpForLevel(XP_CURVE.levelCap));
  });
});

describe('levelFromXp', () => {
  test('boundary values: exact threshold reaches the level, one less does not', () => {
    for (let level = 2; level <= XP_CURVE.levelCap; level += 1) {
      const threshold = totalXpForLevel(level);
      assert.equal(levelFromXp(threshold), level, `at threshold for ${level}`);
      assert.equal(levelFromXp(threshold - 1), level - 1, `just below threshold for ${level}`);
    }
  });

  test('zero and negative XP are level 1', () => {
    assert.equal(levelFromXp(0), 1);
    assert.equal(levelFromXp(-50), 1);
  });

  test('caps at level 50 no matter the XP', () => {
    assert.equal(levelFromXp(totalXpForLevel(XP_CURVE.levelCap)), XP_CURVE.levelCap);
    assert.equal(levelFromXp(1e12), XP_CURVE.levelCap);
    assert.equal(levelFromXp(Number.MAX_SAFE_INTEGER), XP_CURVE.levelCap);
  });

  test('round-trips with totalXpForLevel across the whole curve', () => {
    for (let level = 1; level <= XP_CURVE.levelCap; level += 1) {
      assert.equal(levelFromXp(totalXpForLevel(level)), level);
    }
  });
});

describe('xpProgress', () => {
  test('mid-level progress', () => {
    // 250 XP: level 2 (100..215 is level 2), 35 into level, 115 needed.
    assert.deepEqual(xpProgress(250), { level: 3, into: 35, toNext: 132 });
    assert.deepEqual(xpProgress(0), { level: 1, into: 0, toNext: 100 });
    assert.deepEqual(xpProgress(99), { level: 1, into: 99, toNext: 100 });
    assert.deepEqual(xpProgress(100), { level: 2, into: 0, toNext: 115 });
  });

  test('at the cap the bar reports no further requirement', () => {
    const atCap = xpProgress(totalXpForLevel(XP_CURVE.levelCap) + 999);
    assert.equal(atCap.level, XP_CURVE.levelCap);
    assert.equal(atCap.toNext, 0);
    assert.equal(atCap.into, 0);
  });
});

describe('streakMultiplier', () => {
  test('every tier boundary, inclusive lower bound', () => {
    assert.equal(streakMultiplier(0), 1);
    assert.equal(streakMultiplier(1), 1);
    assert.equal(streakMultiplier(2), 1);
    assert.equal(streakMultiplier(3), 1.1);
    assert.equal(streakMultiplier(6), 1.1);
    assert.equal(streakMultiplier(7), 1.25);
    assert.equal(streakMultiplier(13), 1.25);
    assert.equal(streakMultiplier(14), 1.5);
    assert.equal(streakMultiplier(29), 1.5);
    assert.equal(streakMultiplier(30), 2);
    assert.equal(streakMultiplier(365), 2);
  });

  test('negative days behave like zero', () => {
    assert.equal(streakMultiplier(-1), 1);
  });

  test('tier tables stay aligned (guards constant edits)', () => {
    assert.equal(STREAK_TIER_MULTIPLIERS.length, STREAK_TIER_THRESHOLDS.length + 1);
    for (let i = 0; i < STREAK_TIER_THRESHOLDS.length - 1; i += 1) {
      assert.ok(STREAK_TIER_THRESHOLDS[i] < STREAK_TIER_THRESHOLDS[i + 1]);
    }
  });
});

describe('calculateQuestReward', () => {
  const quest = (gold: number, xp: number) => ({ gold_reward: gold, xp_reward: xp });

  test('no streak: base values pass through', () => {
    assert.deepEqual(calculateQuestReward(quest(5, 10), 0), { gold: 5, xp: 10, multiplier: 1 });
  });

  test('multiplier applies to both gold and XP with per-value rounding', () => {
    // 1.1x: 5 → 5.5 → 6 (half up), 3 → 3.3 → 3
    assert.deepEqual(calculateQuestReward(quest(5, 3), 3), { gold: 6, xp: 3, multiplier: 1.1 });
    // 1.25x: 15 → 18.75 → 19, 10 → 12.5 → 13
    assert.deepEqual(calculateQuestReward(quest(15, 10), 7), {
      gold: 19,
      xp: 13,
      multiplier: 1.25,
    });
    // 2x at 30 days
    assert.deepEqual(calculateQuestReward(quest(8, 20), 30), { gold: 16, xp: 40, multiplier: 2 });
  });

  test('zero-reward quests stay zero at any multiplier', () => {
    assert.deepEqual(calculateQuestReward(quest(0, 0), 30), { gold: 0, xp: 0, multiplier: 2 });
  });
});

describe('achievementPointsForLevelUp', () => {
  test('one level, multiple levels, and no-op transitions', () => {
    assert.equal(achievementPointsForLevelUp(3, 4), ACHIEVEMENT_POINTS_PER_LEVEL_UP);
    assert.equal(achievementPointsForLevelUp(3, 6), 3 * ACHIEVEMENT_POINTS_PER_LEVEL_UP);
    assert.equal(achievementPointsForLevelUp(5, 5), 0);
    assert.equal(achievementPointsForLevelUp(5, 4), 0); // levels never go down
  });
});

describe('averageGoldReward', () => {
  test('mean of base gold rewards; 0 on an empty list', () => {
    assert.equal(averageGoldReward([]), 0);
    assert.equal(averageGoldReward([{ gold_reward: 10 }]), 10);
    assert.equal(averageGoldReward([{ gold_reward: 5 }, { gold_reward: 15 }]), 10);
  });
});

describe('questsAwayFromLoot', () => {
  test('already affordable returns 0', () => {
    assert.equal(questsAwayFromLoot(40, 40, 10), 0);
    assert.equal(questsAwayFromLoot(40, 100, 10), 0);
  });

  test('rounds the shortfall up to whole quests', () => {
    // need 60 more at 10/quest → 6 quests
    assert.equal(questsAwayFromLoot(100, 40, 10), 6);
    // need 61 more at 10/quest → ceil(6.1) = 7
    assert.equal(questsAwayFromLoot(101, 40, 10), 7);
    // need 1 more at 8/quest → ceil(0.125) = 1
    assert.equal(questsAwayFromLoot(41, 40, 8), 1);
  });

  test('null when there is no reward to average against', () => {
    assert.equal(questsAwayFromLoot(100, 40, 0), null);
  });
});
