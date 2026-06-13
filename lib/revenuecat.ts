import { Platform } from 'react-native';
import type {
  CustomerInfo,
  PurchasesOffering,
  PurchasesPackage,
} from 'react-native-purchases';

import { env } from '@/shared/lib/env';
import { PREMIUM_ENTITLEMENT } from '@/features/subscriptions/entitlement';

/**
 * RevenueCat helpers. Subscription is PER-GUILD: RevenueCat's appUserID is the
 * guild id, so the revenuecat-webhook Edge Function can map purchase events onto
 * guilds.subscription_entitlement. The client never writes entitlement — it only
 * starts purchases here; the server is the source of truth.
 *
 * The native module is unavailable in Expo Go (and the SDK keys may be unset),
 * so every export degrades to a safe no-op, mirroring lib/storage.ts. Entitlement
 * still flows from the server via the webhook + realtime even when this no-ops.
 */
type PurchasesModule = typeof import('react-native-purchases').default;

let cachedModule: PurchasesModule | null | undefined;

const getPurchases = (): PurchasesModule | null => {
  if (cachedModule !== undefined) return cachedModule;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('react-native-purchases') as typeof import('react-native-purchases');
    cachedModule = mod.default;
  } catch {
    cachedModule = null;
  }
  return cachedModule;
};

const apiKey = (): string =>
  Platform.OS === 'ios' ? env.revenueCatIosKey : env.revenueCatAndroidKey;

/** True when purchases can actually run (native module present + key set). */
export const isRevenueCatAvailable = (): boolean =>
  Boolean(getPurchases()) && apiKey().length > 0;

export const hasPremiumEntitlement = (info: CustomerInfo): boolean =>
  Boolean(info.entitlements.active[PREMIUM_ENTITLEMENT]);

/** RevenueCat throws a PurchasesError with userCancelled=true on cancel. */
export const isUserCancelledError = (error: unknown): boolean =>
  typeof error === 'object' &&
  error !== null &&
  (error as { userCancelled?: boolean }).userCancelled === true;

let identifiedGuildId: string | null = null;

/**
 * Configure once, then re-identify on guild change. Safe to call repeatedly
 * (e.g. on every auth/guild change in app/_layout.tsx).
 */
export const configureRevenueCat = async (guildId: string): Promise<void> => {
  const Purchases = getPurchases();
  if (!Purchases || apiKey().length === 0 || !guildId) return;
  try {
    if (identifiedGuildId === null) {
      Purchases.configure({ apiKey: apiKey(), appUserID: guildId });
      identifiedGuildId = guildId;
    } else if (identifiedGuildId !== guildId) {
      await Purchases.logIn(guildId);
      identifiedGuildId = guildId;
    }
  } catch {
    // Non-fatal: server entitlement still works; purchases simply won't start.
  }
};

/** Drop RevenueCat identity on sign-out so the next guild starts clean. */
export const resetRevenueCat = async (): Promise<void> => {
  const Purchases = getPurchases();
  if (!Purchases || identifiedGuildId === null) return;
  try {
    await Purchases.logOut();
  } catch {
    // ignore
  } finally {
    identifiedGuildId = null;
  }
};

/**
 * The dashboard-configured "current" offering (monthly $6.99 / annual $49.99
 * with the 7-day trial). Products and prices live in RevenueCat, not in code.
 */
export const getCurrentOffering = async (): Promise<PurchasesOffering | null> => {
  const Purchases = getPurchases();
  if (!Purchases) return null;
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current ?? null;
  } catch {
    return null;
  }
};

/** Start a purchase. Throws (caller catches userCancelled / failure). */
export const purchasePackage = async (
  pkg: PurchasesPackage,
): Promise<{ isPremium: boolean }> => {
  const Purchases = getPurchases();
  if (!Purchases) throw new Error('revenuecat_unavailable');
  const { customerInfo } = await Purchases.purchasePackage(pkg);
  return { isPremium: hasPremiumEntitlement(customerInfo) };
};

/** Restore a prior purchase onto this guild. Throws on failure. */
export const restorePurchases = async (): Promise<{ isPremium: boolean }> => {
  const Purchases = getPurchases();
  if (!Purchases) throw new Error('revenuecat_unavailable');
  const customerInfo = await Purchases.restorePurchases();
  return { isPremium: hasPremiumEntitlement(customerInfo) };
};
