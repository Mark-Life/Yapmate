/**
 * Rate limiting service - checks message limits per user
 */

import { and, eq, gte, sql } from "drizzle-orm";
import { db } from "../client";
import { chats } from "../schema/chats";
import { messages } from "../schema/messages";
import { users } from "../schema/users";

const MESSAGE_LIMIT_PER_MONTH = 20;

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

/**
 * Checks if user has unlimited access granted
 * @param userId - ID of the user
 * @returns true if user has unlimitedAccessGrantedAt set
 */
export const hasUnlimitedAccess = async (userId: string): Promise<boolean> => {
  const result = await db
    .select({ unlimitedAccessGrantedAt: users.unlimitedAccessGrantedAt })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  return result[0]?.unlimitedAccessGrantedAt !== null;
};

/**
 * Checks if user is allowed to send a message based on monthly limit
 * @param userId - ID of the user
 * @returns Object with allowed status, current count, and limit
 */
export const checkMessageLimit = async (
  userId: string
): Promise<{
  allowed: boolean;
  count: number;
  limit: number;
}> => {
  // Check if user has unlimited access first
  const unlimited = await hasUnlimitedAccess(userId);
  if (unlimited) {
    return {
      allowed: true,
      count: 0,
      limit: MESSAGE_LIMIT_PER_MONTH,
    };
  }

  // Count messages this month
  const count = await getUserMonthlyMessageCount(userId);

  return {
    allowed: count < MESSAGE_LIMIT_PER_MONTH,
    count,
    limit: MESSAGE_LIMIT_PER_MONTH,
  };
};
