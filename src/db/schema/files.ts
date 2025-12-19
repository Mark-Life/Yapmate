/**
 * Files table - references to files stored in Supabase Storage
 * Files are stored in a private bucket, accessed via signed URLs
 */
import { relations } from "drizzle-orm";
import {
  bigint,
  index,
  pgTable,
  text,
  uuid,
} from "drizzle-orm/pg-core";
import { timestamps } from "./columns.helpers";
import { users } from "./users";

export const files = pgTable(
  "files",
  {
    id: uuid().primaryKey().defaultRandom(),
    /** Owner of this file */
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /**
     * Path in Supabase Storage bucket
     * Format: "{userId}/{uuid}/{filename}"
     */
    storagePath: text().notNull(),
    /** Original filename */
    filename: text().notNull(),
    /** MIME type e.g. "image/png", "application/pdf" */
    mimeType: text().notNull(),
    /** File size in bytes */
    size: bigint({ mode: "number" }).notNull(),
    ...timestamps,
  },
  (table) => [
    index("files_user_id_idx").on(table.userId),
    index("files_storage_path_idx").on(table.storagePath),
  ]
);

export const filesRelations = relations(files, ({ one }) => ({
  user: one(users, {
    fields: [files.userId],
    references: [users.id],
  }),
}));

/** Insert type for files table */
export type FileInsert = typeof files.$inferInsert;
/** Select type for files table */
export type FileSelect = typeof files.$inferSelect;

