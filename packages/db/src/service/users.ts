/**
 * User service - user-related database operations
 */

import { createAdminClient } from "@yapmate/server/lib/supabase/admin-client";
import { deleteFilesAdmin } from "@yapmate/server/lib/supabase/files";
import { eq } from "drizzle-orm";
import { db } from "../client";
import { users } from "../schema/users";
import { getFilesByUserId } from "./files";

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

/**
 * Gets user by ID
 * @param userId - User ID to query
 * @returns User record or null if not found
 */
export const getUserById = async (
  userId: string
): Promise<typeof users.$inferSelect | null> => {
  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return user ?? null;
};

/**
 * Deletes user account and all associated data
 * Hard delete - removes all user data except Stripe records (kept for legal/bookkeeping)
 *
 * Steps:
 * 1. Delete all user files from Supabase Storage
 * 2. Delete user from Supabase Auth
 * 3. Delete user record from database (cascades handle chats, messages, parts, usage records, files)
 *
 * Note: Stripe customer and subscription records are NOT deleted (legal requirement)
 *
 * @param userId - User ID to delete
 * @param userEmail - User email for verification
 * @throws Error if user not found or email doesn't match
 */
export const deleteUserAccount = async (
  userId: string,
  userEmail: string
): Promise<void> => {
  // Verify user exists and email matches
  const user = await getUserById(userId);
  if (!user) {
    throw new Error("User not found");
  }

  if (user.email !== userEmail) {
    throw new Error("Email does not match user account");
  }

  // Step 1: Delete all files from storage
  const userFiles = await getFilesByUserId(userId);
  const storagePaths = userFiles
    .map((file) => file.storagePath)
    .filter((path): path is string => Boolean(path));

  if (storagePaths.length > 0) {
    try {
      await deleteFilesAdmin(storagePaths);
    } catch (error) {
      // Log but continue - files will be cleaned up by cascade anyway
      console.error(`Failed to delete some files from storage: ${error}`);
    }
  }

  // Step 2: Delete user from Supabase Auth (using admin client)
  const supabaseAdmin = createAdminClient();
  const { error: authError } =
    await supabaseAdmin.auth.admin.deleteUser(userId);

  if (authError) {
    throw new Error(`Failed to delete user from auth: ${authError.message}`);
  }

  // Step 3: Delete user record from database
  // Cascades will automatically delete:
  // - chats (onDelete: cascade)
  // - messages (onDelete: cascade from chats)
  // - parts (onDelete: cascade from messages)
  // - files (onDelete: cascade)
  // - usageRecords (onDelete: cascade)
  await db.delete(users).where(eq(users.id, userId));

  // Note: Stripe records (stripe_customers, stripe_subscriptions, etc.) are NOT deleted
  // These are kept for legal/bookkeeping purposes as required by law
};

/**
 * Gets user settings
 * @param userId - User ID to query
 * @returns User settings object with hideEmailInUi
 */
export const getUserSettings = async (
  userId: string
): Promise<{
  hideEmailInUi: boolean;
}> => {
  const result = await db
    .select({ hideEmailInUi: users.hideEmailInUi })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!result[0]) {
    throw new Error("User not found");
  }

  return {
    hideEmailInUi: result[0].hideEmailInUi,
  };
};

/**
 * Updates user settings
 * @param userId - User ID to update
 * @param settings - Settings object with hideEmailInUi
 */
export const updateUserSettings = async (
  userId: string,
  settings: { hideEmailInUi: boolean }
): Promise<void> => {
  await db
    .update(users)
    .set({ hideEmailInUi: settings.hideEmailInUi })
    .where(eq(users.id, userId));
};
