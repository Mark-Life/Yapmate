/**
 * Usage records service - CRUD operations for API usage tracking
 */
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "../client";
import {
  type UsageRecordInsert,
  type UsageRecordSelect,
  usageRecords,
} from "../schema/usage";

// ─── Write Operations ────────────────────────────────────────────────────────

/**
 * Inserts a usage record after API call completion
 * @param record - Usage record data to insert
 */
export const saveUsageRecord = async (
  record: UsageRecordInsert
): Promise<void> => {
  await db.insert(usageRecords).values(record);
};

// ─── Read Operations ─────────────────────────────────────────────────────────

/**
 * Gets user's total usage for a date range
 * @param userId - ID of the user
 * @param startDate - Start of the period
 * @param endDate - End of the period
 * @returns Total cost and total tokens
 */
export const getUserUsageForPeriod = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ totalCost: number; totalTokens: number }> => {
  const result = await db
    .select({
      totalCost: sql<number>`COALESCE(SUM(${usageRecords.costUsd}::numeric), 0)`,
      totalTokens: sql<number>`COALESCE(SUM(${usageRecords.totalTokens}), 0)`,
    })
    .from(usageRecords)
    .where(
      and(
        eq(usageRecords.userId, userId),
        gte(usageRecords.createdAt, startDate),
        lte(usageRecords.createdAt, endDate)
      )
    );

  return {
    totalCost: Number(result[0]?.totalCost ?? 0),
    totalTokens: Number(result[0]?.totalTokens ?? 0),
  };
};

/**
 * Gets user's usage grouped by model for a date range
 * @param userId - ID of the user
 * @param startDate - Start of the period
 * @param endDate - End of the period
 * @returns Array of model usage stats
 */
export const getUserUsageByModel = async (
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<Array<{ model: string | null; cost: number; tokens: number }>> => {
  const result = await db
    .select({
      model: usageRecords.model,
      cost: sql<number>`COALESCE(SUM(${usageRecords.costUsd}::numeric), 0)`,
      tokens: sql<number>`COALESCE(SUM(${usageRecords.totalTokens}), 0)`,
    })
    .from(usageRecords)
    .where(
      and(
        eq(usageRecords.userId, userId),
        gte(usageRecords.createdAt, startDate),
        lte(usageRecords.createdAt, endDate)
      )
    )
    .groupBy(usageRecords.model)
    .orderBy(desc(sql<number>`SUM(${usageRecords.costUsd}::numeric)`));

  return result.map((r) => ({
    model: r.model,
    cost: Number(r.cost),
    tokens: Number(r.tokens),
  }));
};

/**
 * Gets all usage records for a user, ordered by most recent
 * @param userId - ID of the user
 * @param limit - Maximum number of records to return
 * @returns Array of usage records
 */
export const getUserUsageRecords = (
  userId: string,
  limit = 100
): Promise<UsageRecordSelect[]> =>
  db
    .select()
    .from(usageRecords)
    .where(eq(usageRecords.userId, userId))
    .orderBy(desc(usageRecords.createdAt))
    .limit(limit);

/**
 * Gets usage records for a specific chat
 * @param chatId - ID of the chat
 * @returns Array of usage records
 */
export const getChatUsageRecords = (
  chatId: string
): Promise<UsageRecordSelect[]> =>
  db
    .select()
    .from(usageRecords)
    .where(eq(usageRecords.chatId, chatId))
    .orderBy(usageRecords.createdAt);
