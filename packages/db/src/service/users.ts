/**
 * User service - user-related database operations
 */
import { eq } from "drizzle-orm";
import { db } from "../client";
import { users } from "../schema/users";

/**
 * Updates user's Stripe customer ID
 * @param userId - User ID to update
 * @param stripeCustomerId - Stripe customer ID (cus_xxx)
 */
export const updateStripeCustomerId = async (
  userId: string,
  stripeCustomerId: string
): Promise<void> => {
  await db.update(users).set({ stripeCustomerId }).where(eq(users.id, userId));
};

/**
 * Gets user's Stripe customer ID
 * @param userId - User ID to query
 * @returns Stripe customer ID or null if not set
 */
export const getStripeCustomerId = async (
  userId: string
): Promise<string | null> => {
  const result = await db
    .select({ stripeCustomerId: users.stripeCustomerId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0]?.stripeCustomerId ?? null;
};
