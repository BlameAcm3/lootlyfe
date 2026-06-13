import { useEffect } from 'react';
import { useRouter } from 'expo-router';

import { env } from '@/shared/lib/env';
import { FREE_TIER_LIMITS } from '../../../../constants/game';
import { appStorage } from '../../../../lib/storage';
import { paywallHref, type PaywallContext } from '../../../../lib/routes';
import { useCurrentGuild } from '../../../../queries/guildQueries';
import { isPremium, PREMIUM_ENTITLEMENT, type Entitlement } from '../entitlement';

/**
 * useSubscription — the single source of truth for entitlement, free-tier limit
 * checks, and downgrade lock computation (CLAUDE.md > Subscriptions).
 *
 * Entitlement comes from the guild (subscription is per-guild) via the shared
 * useCurrentGuild query, is cached in MMKV so premium survives offline cold
 * starts, and honours the EXPO_PUBLIC_PAYWALL_ENABLED master switch.
 *
 * Limits are UX (the server triggers in migration 017 are the law). Locks
 * implement the downgrade matrix: when a free guild has more rows than the free
 * limit, the NEWEST excess rows are read-only — never deleted.
 */
export type LimitedResource = keyof typeof FREE_TIER_LIMITS;

export type LimitCheck = {
  allowed: boolean;
  limit: number;
  remaining: number;
  atLimit: boolean;
};

type LockableRow = { id: string; created_at: string };

const cacheKey = (guildId: string) => `entitlement:${guildId}`;

/** Best-effort synchronous read (MMKV is sync; SecureStore fallback returns a
 * Promise → no offline seed there, which is fine since Expo Go isn't a release
 * target). */
const readCachedEntitlement = (guildId: string): Entitlement | null => {
  try {
    const value = appStorage.getItem(cacheKey(guildId));
    if (typeof value !== 'string') return null;
    return value === PREMIUM_ENTITLEMENT ? PREMIUM_ENTITLEMENT : 'free';
  } catch {
    return null;
  }
};

const writeCachedEntitlement = (guildId: string, entitlement: Entitlement) => {
  try {
    void appStorage.setItem(cacheKey(guildId), entitlement);
  } catch {
    // non-fatal
  }
};

const normalize = (value: string | null | undefined): Entitlement | null =>
  value === PREMIUM_ENTITLEMENT ? PREMIUM_ENTITLEMENT : value === 'free' ? 'free' : null;

export const useSubscription = () => {
  const router = useRouter();
  const { guild, isLoading } = useCurrentGuild();
  const guildId = guild?.id ?? null;

  const live = normalize(guild?.subscription_entitlement);
  const cached = guildId ? readCachedEntitlement(guildId) : null;
  const entitlement: Entitlement = live ?? cached ?? 'free';

  // Persist the authoritative server value for offline use.
  useEffect(() => {
    if (guildId && live) writeCachedEntitlement(guildId, live);
  }, [guildId, live]);

  const premiumEntitled = isPremium(entitlement);
  // Master switch: when gating is off, unlock everything (QA / TestFlight).
  const isPremiumUnlocked = premiumEntitled || !env.paywallEnabled;

  const checkLimit = (resource: LimitedResource, currentCount: number): LimitCheck => {
    const limit = FREE_TIER_LIMITS[resource];
    if (isPremiumUnlocked) {
      return { allowed: true, limit, remaining: Number.POSITIVE_INFINITY, atLimit: false };
    }
    return {
      allowed: currentCount < limit,
      limit,
      remaining: Math.max(0, limit - currentCount),
      atLimit: currentCount >= limit,
    };
  };

  /**
   * Ids that are read-only on the current (free) tier: the newest rows beyond
   * the free limit. Premium / unlocked → nothing is locked. Deterministic:
   * oldest `limit` rows stay active, the rest lock.
   */
  const lockedIdsFor = <T extends LockableRow>(
    resource: LimitedResource,
    rows: readonly T[],
  ): Set<string> => {
    if (isPremiumUnlocked) return new Set();
    const limit = FREE_TIER_LIMITS[resource];
    if (rows.length <= limit) return new Set();
    const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
    return new Set(sorted.slice(limit).map((row) => row.id));
  };

  const openPaywall = (context: PaywallContext = 'default') => {
    router.push(paywallHref(context));
  };

  return {
    entitlement,
    /** True when premium features should be available (entitled OR gating off). */
    isPremium: isPremiumUnlocked,
    /** Raw server entitlement, ignoring the QA master switch. */
    isEntitled: premiumEntitled,
    isLoading,
    limits: FREE_TIER_LIMITS,
    checkLimit,
    lockedIdsFor,
    openPaywall,
  };
};
