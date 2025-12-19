/**
 * Shared column definitions for reuse across tables
 */
import { timestamp } from "drizzle-orm/pg-core";

/**
 * Standard timestamp columns for tracking creation and updates
 */
export const timestamps = {
  createdAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp({ withTimezone: true }).notNull().defaultNow(),
} as const;

