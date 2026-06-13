import {
  COSMETIC_SLOTS,
  isCosmeticItemKey,
  presetCosmeticByKey,
  type CosmeticItemKey,
  type CosmeticSlot,
} from '../data/cosmetics.ts';

/**
 * avatar_config (adventurer_profiles jsonb) parsing — the render model for
 * AvatarRenderer. Written server-side by the set_equipped_cosmetic /
 * set_avatar_base RPCs (migration 014):
 *
 *   { "base": 0, "slots": { "head": "head-starter", "accessory": "acc-charm" } }
 *
 * Parsing is defensive: unknown shapes, unknown item keys, and items stored
 * under the wrong slot all degrade to "nothing equipped" rather than crashing
 * a kid's dashboard on stale or future data.
 */

export type AvatarConfig = {
  /** Index into the active theme pack's avatarBases. */
  base: number;
  slots: Partial<Record<CosmeticSlot, CosmeticItemKey>>;
};

export const DEFAULT_AVATAR_CONFIG: AvatarConfig = { base: 0, slots: {} };

export const parseAvatarConfig = (raw: unknown): AvatarConfig => {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) {
    return DEFAULT_AVATAR_CONFIG;
  }
  const record = raw as Record<string, unknown>;

  const base =
    typeof record.base === 'number' && Number.isInteger(record.base) && record.base >= 0
      ? record.base
      : 0;

  const slots: AvatarConfig['slots'] = {};
  const rawSlots = record.slots;
  if (typeof rawSlots === 'object' && rawSlots !== null && !Array.isArray(rawSlots)) {
    for (const slot of COSMETIC_SLOTS) {
      const value = (rawSlots as Record<string, unknown>)[slot];
      if (typeof value !== 'string' || !isCosmeticItemKey(value)) continue;
      if (presetCosmeticByKey(value)?.slot !== slot) continue;
      slots[slot] = value;
    }
  }

  return { base, slots };
};
