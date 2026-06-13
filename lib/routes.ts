import type { Href } from 'expo-router';

/**
 * Canonical hrefs for index routes. expo-router's typed-route generation is
 * non-deterministic about index forms ('/pair' vs '/pair/index' flips between
 * runs); the runtime accepts the canonical path either way, so these are cast
 * once here instead of scattering casts at call sites.
 */
export const ROUTES = {
  adventurerHome: '/(adventurer)' as Href,
  adventurerProfile: '/(adventurer)/profile' as Href,
  adventurerStore: '/(adventurer)/store' as Href,
  adventurerShop: '/(adventurer)/shop' as Href,
  adventurerRedemptions: '/(adventurer)/redemptions' as Href,
  adventurerWishlist: '/(adventurer)/wishlist' as Href,
  pair: '/pair' as Href,
  pairRevoked: '/pair/revoked' as Href,
  paywall: '/paywall' as Href,
} as const;

/**
 * Paywall trigger points. The paywall screen swaps its headline per context so
 * the upsell speaks to whatever the NPC just bumped into (theme lock, a limit,
 * a co-parent invite, history). 'default' is the generic entry (e.g. Settings).
 */
export type PaywallContext =
  | 'theme_lock'
  | 'adventurer_limit'
  | 'quest_limit'
  | 'loot_limit'
  | 'coparent'
  | 'history'
  | 'default';

/** Typed href to the paywall carrying its contextual variant. */
export const paywallHref = (context: PaywallContext = 'default'): Href =>
  ({ pathname: '/paywall', params: { context } }) as Href;
