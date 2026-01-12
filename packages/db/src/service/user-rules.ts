/**
 * User Rules service - CRUD operations for user-defined rules
 * Rules can be selected per-chat and prepended as user messages
 */

import { and, eq, inArray, sql } from "drizzle-orm";
import { db } from "../client";
import type {
  UserRuleInsert,
  UserRuleSelect,
  UserRuleUpdate,
} from "../schema/user-rules";
import { userRules } from "../schema/user-rules";

/**
 * Get all user rules ordered by order field
 * @param userId - The user ID
 * @returns Array of user rule records
 */
export const getUserRules = async (userId: string): Promise<UserRuleSelect[]> =>
  db
    .select()
    .from(userRules)
    .where(eq(userRules.userId, userId))
    .orderBy(userRules.order, userRules.createdAt);

/**
 * Get specific user rules by IDs (for chat)
 * Only returns rules that belong to the user and are enabled
 * @param userId - The user ID
 * @param ruleIds - Array of rule IDs to fetch
 * @returns Array of user rule records
 */
export const getUserRulesByIds = (
  userId: string,
  ruleIds: string[]
): Promise<UserRuleSelect[]> => {
  if (ruleIds.length === 0) {
    return Promise.resolve([]);
  }

  return db
    .select()
    .from(userRules)
    .where(
      and(
        eq(userRules.userId, userId),
        inArray(userRules.id, ruleIds),
        eq(userRules.enabled, true)
      )
    )
    .orderBy(userRules.order);
};

/**
 * Get next order value for a new rule
 * @param userId - The user ID
 * @returns Next order value
 */
const getNextOrder = async (userId: string): Promise<number> => {
  const result = await db
    .select({ maxOrder: sql<number>`max(${userRules.order})` })
    .from(userRules)
    .where(eq(userRules.userId, userId));

  const maxOrder = result[0]?.maxOrder ?? 0;
  return maxOrder + 1;
};

/**
 * Create a new user rule
 * @param userId - The user ID
 * @param input - Rule data (title, content)
 * @returns Created rule record
 */
export const createUserRule = async (
  userId: string,
  input: Pick<UserRuleInsert, "title" | "content">
): Promise<UserRuleSelect> => {
  const order = await getNextOrder(userId);

  const [rule] = await db
    .insert(userRules)
    .values({
      userId,
      title: input.title,
      content: input.content,
      order,
      enabled: true,
    })
    .returning();

  return rule;
};

/**
 * Update a user rule
 * @param id - Rule ID
 * @param userId - The user ID (for ownership validation)
 * @param data - Update data
 * @returns Updated rule record
 * @throws Error if rule not found or not owned by user
 */
export const updateUserRule = async (
  id: string,
  userId: string,
  data: UserRuleUpdate
): Promise<UserRuleSelect> => {
  const [rule] = await db
    .update(userRules)
    .set(data)
    .where(and(eq(userRules.id, id), eq(userRules.userId, userId)))
    .returning();

  if (!rule) {
    throw new Error("Rule not found or access denied");
  }

  return rule;
};

/**
 * Delete a user rule
 * @param id - Rule ID
 * @param userId - The user ID (for ownership validation)
 * @throws Error if rule not found or not owned by user
 */
export const deleteUserRule = async (
  id: string,
  userId: string
): Promise<void> => {
  const result = await db
    .delete(userRules)
    .where(and(eq(userRules.id, id), eq(userRules.userId, userId)))
    .returning({ id: userRules.id });

  if (result.length === 0) {
    throw new Error("Rule not found or access denied");
  }
};

/**
 * Reorder user rules based on array of rule IDs
 * The order in the array determines the new order (first = order 1, second = order 2, etc.)
 * @param userId - The user ID (for ownership validation)
 * @param orderedIds - Array of rule IDs in desired order
 * @throws Error if any rule not found or not owned by user
 */
export const reorderUserRules = async (
  userId: string,
  orderedIds: string[]
): Promise<UserRuleSelect[]> => {
  // Verify all rules belong to user
  const existingRules = await db
    .select()
    .from(userRules)
    .where(
      and(eq(userRules.userId, userId), inArray(userRules.id, orderedIds))
    );

  if (existingRules.length !== orderedIds.length) {
    throw new Error("One or more rules not found or access denied");
  }

  // Update order for each rule based on position in array
  const updates = orderedIds.map((id, index) => ({
    id,
    order: index + 1,
  }));

  // Perform batch update
  const updatedRules: UserRuleSelect[] = [];
  for (const { id, order } of updates) {
    const [updated] = await db
      .update(userRules)
      .set({ order })
      .where(and(eq(userRules.id, id), eq(userRules.userId, userId)))
      .returning();
    if (updated) {
      updatedRules.push(updated);
    }
  }

  return updatedRules;
};
