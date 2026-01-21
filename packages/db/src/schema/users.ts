/**
 * Users table - reference to Supabase Auth users
 * We store minimal info here, auth is handled by Supabase
 */
import { boolean, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./columns.helpers";

export const users = pgTable("users", {
  /** Supabase Auth user ID */
  id: uuid().primaryKey(),
  /** User email from Supabase Auth */
  email: text().notNull(),
  /** User's first name */
  firstName: text(),
  /** User's last name */
  lastName: text(),

  /** Stripe Customer ID (e.g., cus_xxx) - no FK, stripe schema is external */
  stripeCustomerId: text(),

  /** Timestamp when unlimited access was granted (null = subject to limits) */
  unlimitedAccessGrantedAt: timestamp({ withTimezone: true }),

  /** Whether to blur/hide email in UI (privacy mode) */
  hideEmailInUi: boolean().default(false).notNull(),

  /** Whether to use serif font for AI assistant messages */
  useSerifFont: boolean().default(true).notNull(),

  ...timestamps,
});

/** Insert type for users table */
export type UserInsert = typeof users.$inferInsert;
/** Select type for users table */
export type UserSelect = typeof users.$inferSelect;
