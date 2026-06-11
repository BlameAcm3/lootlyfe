import type { Href } from 'expo-router';

/**
 * Canonical hrefs for index routes. expo-router's typed-route generation is
 * non-deterministic about index forms ('/pair' vs '/pair/index' flips between
 * runs); the runtime accepts the canonical path either way, so these are cast
 * once here instead of scattering casts at call sites.
 */
export const ROUTES = {
  adventurerHome: '/(adventurer)' as Href,
  pair: '/pair' as Href,
  pairRevoked: '/pair/revoked' as Href,
  paywall: '/paywall' as Href,
} as const;
