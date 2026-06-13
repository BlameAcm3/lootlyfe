import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

import { DEFAULT_AVATAR_CONFIG, parseAvatarConfig } from '../avatar.ts';

describe('parseAvatarConfig', () => {
  test('non-object input degrades to the default config', () => {
    assert.deepEqual(parseAvatarConfig(null), DEFAULT_AVATAR_CONFIG);
    assert.deepEqual(parseAvatarConfig(undefined), DEFAULT_AVATAR_CONFIG);
    assert.deepEqual(parseAvatarConfig('hax'), DEFAULT_AVATAR_CONFIG);
    assert.deepEqual(parseAvatarConfig([1, 2]), DEFAULT_AVATAR_CONFIG);
  });

  test('empty jsonb (the column default) yields base 0, nothing equipped', () => {
    assert.deepEqual(parseAvatarConfig({}), { base: 0, slots: {} });
  });

  test('valid config passes through', () => {
    const parsed = parseAvatarConfig({
      base: 2,
      slots: { head: 'head-crown', accessory: 'acc-charm' },
    });
    assert.equal(parsed.base, 2);
    assert.deepEqual(parsed.slots, { head: 'head-crown', accessory: 'acc-charm' });
  });

  test('invalid base values clamp to 0', () => {
    assert.equal(parseAvatarConfig({ base: -1 }).base, 0);
    assert.equal(parseAvatarConfig({ base: 1.5 }).base, 0);
    assert.equal(parseAvatarConfig({ base: 'two' }).base, 0);
  });

  test('unknown item keys and wrong-slot items are dropped, valid ones kept', () => {
    const parsed = parseAvatarConfig({
      slots: {
        head: 'acc-charm', // accessory item stored under head: dropped
        body: 'body-future-item', // unknown to this build: dropped
        accessory: 'acc-banner',
      },
    });
    assert.deepEqual(parsed.slots, { accessory: 'acc-banner' });
  });
});
