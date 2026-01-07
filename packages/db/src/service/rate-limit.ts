/**
 * Rate limiting service - checks message limits per user based on subscription tier
 */

import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../client";
import { chats } from "../schema/chats";
import { messages } from "../schema/messages";
import { stripeSubscriptions } from "../schema/stripe";
import { users } from "../schema/users";

/** Subscription tier types */
export type Tier = "free" | "hobby" | "pro" | "unlimited";

/** Maps Stripe product IDs to subscription tiers */
const PRODUCT_TIER_MAP: Record<string, Tier> = {
  prod_TkLv4EDEgXEUg2: "hobby", // $7/mo - Hobby Yapper
  prod_TkMjaoy0j7h6GN: "pro", // $15/mo - Pro Yapper
};

/** Message limits per tier */
const TIER_LIMITS: Record<Tier, number> = {
  free: 20,
  hobby: 1000,
  pro: 3000,
  unlimited: Number.POSITIVE_INFINITY,
};

/**
 * Counts user messages in the current calendar month
 * @param userId - ID of the user
 * @returns Number of user messages sent this month
 */
export const getUserMonthlyMessageCount = async (
  userId: string
): Promise<number> => {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .innerJoin(chats, eq(messages.chatId, chats.id))
    .where(
      and(
        eq(chats.userId, userId),
        eq(messages.role, "user"),
        gte(messages.createdAt, startOfMonth)
      )
    );

  return Number(result[0]?.count ?? 0);
};

/** Result of getUserSubscriptionInfo query */
interface SubscriptionInfo {
  unlimitedAccessGrantedAt: Date | null;
  productId: string | null;
}

/**
 * Fetches user subscription info in a single query (user + stripe subscription JOIN)
 * @param userId - ID of the user
 * @returns User's unlimited access status and active subscription product ID
 */
const getUserSubscriptionInfo = async (
  userId: string
): Promise<SubscriptionInfo | null> => {
  const result = await db
    .select({
      unlimitedAccessGrantedAt: users.unlimitedAccessGrantedAt,
      // Extract product ID from items JSONB: items->'data'->0->'price'->>'product'
      productId: sql<string>`${stripeSubscriptions.items}->'data'->0->'price'->>'product'`,
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
 * Checks if user is allowed to send a message based on subscription tier
 * @param userId - ID of the user
 * @returns Object with allowed status, current count, limit, and tier
 */
export const checkMessageLimit = async (
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

  // Count messages this month
  const count = await getUserMonthlyMessageCount(userId);

  return {
    allowed: count < limit,
    count,
    limit,
    tier,
  };
};
