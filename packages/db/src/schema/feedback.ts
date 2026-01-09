/**
 * Feedback table - stores user feedback submissions
 */
import { jsonb, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./columns.helpers";
import { users } from "./users";

const feedbackCategories = ["bug", "feature", "general"] as const;
export const feedbackCategoryEnum = pgEnum(
  "feedback_category",
  feedbackCategories
);

/**
 * Type for feedback context JSONB field
 * Enforced at application level
 */
export type FeedbackContext = {
  /** Current chat ID if on a chat page */
  chatId?: string;
  /** Current URL path */
  url?: string;
  /** Browser user agent */
  userAgent?: string;
};

export const feedback = pgTable("feedback", {
  id: uuid().primaryKey().defaultRandom(),
  /** User who submitted the feedback */
  userId: uuid()
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  /** Feedback category */
  category: feedbackCategoryEnum().notNull(),
  /** Feedback message content */
  message: text().notNull(),
  /** Additional context (chatId, url, userAgent, etc.) */
  context: jsonb().$type<FeedbackContext>(),
  ...timestamps,
});

/** Insert type for feedback table */
export type FeedbackInsert = typeof feedback.$inferInsert;
/** Select type for feedback table */
export type FeedbackSelect = typeof feedback.$inferSelect;
