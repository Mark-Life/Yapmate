/**
 * User Rules table - stores user-defined custom instructions/rules
 * Rules can be selected per-chat and prepended as user messages
 */

import {
  boolean,
  index,
  integer,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import {
  createInsertSchema,
  createSelectSchema,
  createUpdateSchema,
} from "drizzle-zod";
import type { z } from "zod";
import { timestamps } from "./columns.helpers";
import { users } from "./users";

export const userRules = pgTable(
  "user_rules",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Owner of this rule */
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Display name (e.g., "General", "Writing", "Coding") */
    title: text().notNull(),
    /** The rule text/instructions */
    content: text().notNull(),
    /** For ordering rules in UI */
    order: integer().notNull(),
    /** Can be disabled without deleting */
    enabled: boolean().default(true).notNull(),
    // projectId: uuid() - add later for project rules
    ...timestamps,
  },
  (table) => [index("user_rules_user_id_idx").on(table.userId)]
);

// ===============================
// Drizzle-Zod Schemas (derive from table)
// ===============================

/** Select schema - validates data queried from database */
export const userRuleSelectSchema = createSelectSchema(userRules);

/** Insert schema with field constraints */
export const userRuleInsertSchema = createInsertSchema(userRules, {
  title: (schema) => schema.min(1).max(100),
  content: (schema) => schema.min(1).max(10_000),
}).omit({
  id: true,
  userId: true,
  order: true,
  enabled: true,
  createdAt: true,
  updatedAt: true,
});

/** Update schema - all fields optional except constraints */
export const userRuleUpdateSchema = createUpdateSchema(userRules, {
  title: (schema) => schema.min(1).max(100).optional(),
  content: (schema) => schema.min(1).max(10_000).optional(),
}).omit({ id: true, userId: true, createdAt: true });

// Types derived from schemas
export type UserRuleSelect = z.infer<typeof userRuleSelectSchema>;
export type UserRuleInsert = z.infer<typeof userRuleInsertSchema>;
export type UserRuleUpdate = z.infer<typeof userRuleUpdateSchema>;
