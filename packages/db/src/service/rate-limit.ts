/**
 * Rate limiting service - checks generation limits per user based on subscription tier
 */

import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../client";
import { stripeSubscriptions } from "../schema/stripe";
import { usageRecords } from "../schema/usage";
import { users } from "../schema/users";

/** Subscription tier types */
export type Tier = "free" | "hobby" | "pro" | "unlimited";

/** Maps Stripe product IDs to subscription tiers */
const PRODUCT_TIER_MAP: Record<string, Tier> = {
  prod_TkLv4EDEgXEUg2: "hobby", // $7/mo - Hobby Yapper
  prod_TkMjaoy0j7h6GN: "pro", // $15/mo - Pro Yapper
};

/** Generation limits per tier */
const TIER_LIMITS: Record<Tier, number> = {
  free: 20,
  hobby: 1000,
  pro: 3000,
  unlimited: Number.POSITIVE_INFINITY,
};

/**
 * Counts user chat usage since a specific date
 * Uses usage_records table (persists after chat deletion)
 * @param userId - ID of the user
 * @param periodStart - Start date of the period to count from
 * @returns Number of chat API calls since periodStart
 */
const getUserUsageCountSince = async (
  userId: string,
  periodStart: Date
): Promise<number> => {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(usageRecords)
    .where(
      and(
        eq(usageRecords.userId, userId),
        eq(usageRecords.type, "chat"),
        gte(usageRecords.createdAt, periodStart)
      )
    );

  return Number(result[0]?.count ?? 0);
};

/**
 * Counts user chat usage in the current calendar month (for free users)
 * @param userId - ID of the user
 * @returns Number of chat API calls this month
 */
export const getUserMonthlyUsageCount = async (
  userId: string
): Promise<number> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  return await getUserUsageCountSince(userId, startOfMonth);
};

/** Result of getUserSubscriptionInfo query */
interface SubscriptionInfo {
  unlimitedAccessGrantedAt: Date | null;
  productId: string | null;
  /** Unix timestamp when current billing period ends (renewal date), null for free users */
  currentPeriodEnd: number | null;
  /** Unix timestamp when current billing period started, null for free users */
  currentPeriodStart: number | null;
}

/**
 * Fetches user subscription info in a single query (user + stripe subscription JOIN)
 * @param userId - ID of the user
 * @returns User's unlimited access status, active subscription product ID, and billing period info
 */
const getUserSubscriptionInfo = async (
  userId: string
): Promise<SubscriptionInfo | null> => {
  const result = await db
    .select({
      unlimitedAccessGrantedAt: users.unlimitedAccessGrantedAt,
      // Extract product ID from items JSONB: items->'data'->0->'price'->>'product'
      productId: sql<string>`${stripeSubscriptions.items}->'data'->0->'price'->>'product'`,
      currentPeriodEnd: stripeSubscriptions.currentPeriodEnd,
      currentPeriodStart: stripeSubscriptions.currentPeriodStart,
    })
    .from(users)
    .leftJoin(
      stripeSubscriptions,
      and(
        eq(stripeSubscriptions.customer, users.stripeCustomerId),
        eq(stripeSubscriptions.status, "active")
      )
    )
    .where(eq(users.id, userId))
    .limit(1);

  return result[0] ?? null;
};

/**
 * Derives subscription tier from product ID
 * @param productId - Stripe product ID or null
 * @returns Subscription tier
 */
const deriveTier = (productId: string | null): Tier =>
  productId ? (PRODUCT_TIER_MAP[productId] ?? "free") : "free";

/**
 * Gets the reset date for a user based on their subscription status
 * @param userId - ID of the user
 * @returns ISO string of reset date (subscription renewal for paid users, first of next month for free users)
 */
export const getUserResetDate = async (userId: string): Promise<string> => {
  const info = await getUserSubscriptionInfo(userId);

  if (!info) {
    // User not found - default to next month
    const now = new Date();
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    return nextMonth.toISOString();
  }

  // For subscribed users, use subscription renewal date
  if (info.currentPeriodEnd !== null) {
    // Convert Unix timestamp to Date
    const renewalDate = new Date(info.currentPeriodEnd * 1000);
    return renewalDate.toISOString();
  }

  // For free users, use first of next month
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
};

/**
 * Checks if user is allowed to generate based on subscription tier
 * @param userId - ID of the user
 * @returns Object with allowed status, current count, limit, and tier
 */
export const checkGenerationLimit = async (
  userId: string
): Promise<{
  allowed: boolean;
  count: number;
  limit: number;
  tier: Tier;
}> => {
  // Single query: user + active subscription
  const info = await getUserSubscriptionInfo(userId);

  if (!info) {
    // User not found - deny access
    return { allowed: false, count: 0, limit: 0, tier: "free" };
  }

  // Check unlimited access first (admin/beta override)
  if (info.unlimitedAccessGrantedAt !== null) {
    return {
      allowed: true,
      count: 0,
      limit: TIER_LIMITS.unlimited,
      tier: "unlimited",
    };
  }

  // Derive tier from subscription product
  const tier = deriveTier(info.productId);
  const limit = TIER_LIMITS[tier];

  // Count usage based on subscription status
  // For subscribed users: count from billing period start
  // For free users: count from calendar month start
  let count: number;
  if (info.currentPeriodStart !== null) {
    // Subscribed user - count from billing period start
    const periodStart = new Date(info.currentPeriodStart * 1000);
    count = await getUserUsageCountSince(userId, periodStart);
  } else {
    // Free user - count from calendar month start
    count = await getUserMonthlyUsageCount(userId);
  }

  return {
    allowed: count < limit,
    count,
    limit,
    tier,
  };
};
