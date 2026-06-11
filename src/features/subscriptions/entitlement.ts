/**
 * Canonical entitlement string per AGENTS.md (renamed from `legendary_guild`).
 * RevenueCat entitlement id and the DB entitlement value both use this.
 */
export const PREMIUM_ENTITLEMENT = 'premium';

export type Entitlement = 'free' | typeof PREMIUM_ENTITLEMENT;

export const isPremium = (entitlement: string | null | undefined): boolean =>
  entitlement === PREMIUM_ENTITLEMENT;
