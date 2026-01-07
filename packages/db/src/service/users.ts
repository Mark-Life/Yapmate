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
