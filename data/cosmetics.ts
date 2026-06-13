import type { LexiconKey } from '../lib/lexicon';

/**
 * Client-side presentation data for the cosmetic catalog. The DB
 * (cosmetic_items, seeded in migration 014) is the source of truth for
 * costs, premium gating, and seasons — this file maps each row's stable
 * `item_key` to its themed name (lexicon) and themed art (the `cosmetics`
 * map in each theme pack's asset manifest). Keys here MUST match the
 * migration 014 seeds.
 */

export const COSMETIC_SLOTS = ['head', 'body', 'accessory'] as const;
export type CosmeticSlot = (typeof COSMETIC_SLOTS)[number];

export const COSMETIC_SLOT_LABEL_KEYS: Record<CosmeticSlot, LexiconKey> = {
  head: 'slot_head',
  body: 'slot_body',
  accessory: 'slot_accessory',
};

type PresetCosmeticShape = {
  key: string;
  slot: CosmeticSlot;
  nameKey: LexiconKey;
};

export const PRESET_COSMETICS = [
  { key: 'head-starter', slot: 'head', nameKey: 'cosmetic_head_starter_name' },
  { key: 'head-guard', slot: 'head', nameKey: 'cosmetic_head_guard_name' },
  { key: 'head-crown', slot: 'head', nameKey: 'cosmetic_head_crown_name' },
  { key: 'head-mythic', slot: 'head', nameKey: 'cosmetic_head_mythic_name' },
  { key: 'body-starter', slot: 'body', nameKey: 'cosmetic_body_starter_name' },
  { key: 'body-scout', slot: 'body', nameKey: 'cosmetic_body_scout_name' },
  { key: 'body-knight', slot: 'body', nameKey: 'cosmetic_body_knight_name' },
  { key: 'body-mythic', slot: 'body', nameKey: 'cosmetic_body_mythic_name' },
  { key: 'acc-starter', slot: 'accessory', nameKey: 'cosmetic_acc_starter_name' },
  { key: 'acc-charm', slot: 'accessory', nameKey: 'cosmetic_acc_charm_name' },
  { key: 'acc-banner', slot: 'accessory', nameKey: 'cosmetic_acc_banner_name' },
  { key: 'acc-mythic', slot: 'accessory', nameKey: 'cosmetic_acc_mythic_name' },
] as const satisfies readonly PresetCosmeticShape[];

export type PresetCosmetic = (typeof PRESET_COSMETICS)[number];
export type CosmeticItemKey = PresetCosmetic['key'];

const byKey = new Map<string, PresetCosmetic>(PRESET_COSMETICS.map((item) => [item.key, item]));

/** Presentation entry for a catalog row, or null for unknown keys (a newer
 * server catalog than this app build — render nothing rather than crash). */
export const presetCosmeticByKey = (key: string): PresetCosmetic | null => byKey.get(key) ?? null;

export const isCosmeticItemKey = (key: string): key is CosmeticItemKey => byKey.has(key);
