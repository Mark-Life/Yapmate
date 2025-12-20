/**
 * Files table - references to files stored in Supabase Storage
 * Files are stored in a private bucket, accessed via signed URLs
 */
import { relations, sql } from "drizzle-orm";
import { bigint, check, index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./columns.helpers";
import { users } from "./users";

/** File upload status */
export const FILE_STATUSES = ["pending", "uploaded", "failed"] as const;
export type FileStatus = (typeof FILE_STATUSES)[number];

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
     * Format: "{userId}/{chatId}/{fileId}_{filename}"
     * NULL while upload is pending
     */
    storagePath: text(),
    /**
     * Base64 data URL for immediate persistence
     * Cleared after successful upload to storage
     */
    dataUrl: text(),
    /** Original filename */
    filename: text().notNull(),
    /** MIME type e.g. "image/png", "application/pdf" */
    mimeType: text().notNull(),
    /** File size in bytes */
    size: bigint({ mode: "number" }).notNull(),
    /** Upload status */
    status: text().$type<FileStatus>().notNull().default("pending"),
    ...timestamps,
  },
  (table) => [
    index("files_user_id_idx").on(table.userId),
    index("files_storage_path_idx").on(table.storagePath),
    index("files_status_idx").on(table.status),
    // Either storagePath or dataUrl must exist (file data must be somewhere)
    check(
      "file_data_exists",
      sql`${table.storagePath} IS NOT NULL OR ${table.dataUrl} IS NOT NULL`
    ),
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
