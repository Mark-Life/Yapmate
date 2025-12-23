/**
 * Files service - CRUD operations for file records
 * Handles file metadata storage and coordination with Supabase Storage
 */

import {
  deleteFile as deleteStorageFile,
  getSignedUrl,
  uploadFileFromDataUrl,
} from "@yapmate/server/lib/supabase/files";
import { eq, inArray } from "drizzle-orm";
import { db } from "../client";
import type { FileSelect } from "../schema/files";
import { type FileInsert, files } from "../schema/files";

// ─── Read Operations ─────────────────────────────────────────────────────────

/**
 * Gets a file record by ID
 */
export const getFileById = async (
  fileId: string
): Promise<FileSelect | null> => {
  const [file] = await db.select().from(files).where(eq(files.id, fileId));
  return file ?? null;
};

/**
 * Gets multiple files by their IDs
 */
export const getFilesByIds = (fileIds: string[]): Promise<FileSelect[]> => {
  if (fileIds.length === 0) {
    return Promise.resolve([]);
  }
  return db.select().from(files).where(inArray(files.id, fileIds));
};

/**
 * Gets accessible URL for a file (signed URL or dataUrl fallback)
 * @param req - Request object for Bun cookie access
 * @param file - File record from database
 */
export const getFileAccessUrl = async (
  req: Request,
  file: FileSelect
): Promise<string> => {
  if (file.storagePath) {
    return await getSignedUrl(req, file.storagePath);
  }
  if (file.dataUrl) {
    return file.dataUrl;
  }
  throw new Error(`File ${file.id} has no accessible data`);
};

// ─── Write Operations ────────────────────────────────────────────────────────

/**
 * Creates a file record with dataUrl (before upload to storage)
 * @param data - File metadata (userId, dataUrl, filename, mimeType, size)
 */
export const createPendingFile = async (
  data: Omit<FileInsert, "storagePath" | "status">
): Promise<FileSelect> => {
  const [file] = await db
    .insert(files)
    .values({ ...data, status: "pending" })
    .returning();
  return file;
};

/**
 * Marks file as uploaded and clears dataUrl
 * @param fileId - ID of the file
 * @param storagePath - Path in Supabase Storage
 */
export const markFileUploaded = async (
  fileId: string,
  storagePath: string
): Promise<void> => {
  await db
    .update(files)
    .set({
      storagePath,
      status: "uploaded",
      dataUrl: null,
      updatedAt: new Date(),
    })
    .where(eq(files.id, fileId));
};

/**
 * Marks file as failed (keeps dataUrl for fallback)
 * @param fileId - ID of the file
 */
export const markFileFailed = async (fileId: string): Promise<void> => {
  await db
    .update(files)
    .set({ status: "failed", updatedAt: new Date() })
    .where(eq(files.id, fileId));
};

/**
 * Uploads file to storage with retry logic
 * @param req - Request object for Bun cookie access
 * @param file - File record to upload
 * @param chatId - ID of the chat (for storage path)
 * @returns Storage path on success
 */
export const uploadFileWithRetry = async (
  req: Request,
  file: FileSelect,
  chatId: string
): Promise<string> => {
  if (!file.dataUrl) {
    throw new Error("No dataUrl to upload");
  }

  const storagePath = `${file.userId}/${chatId}/${file.id}_${file.filename}`;

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      await uploadFileFromDataUrl(
        req,
        file.dataUrl,
        storagePath,
        file.mimeType
      );
      await markFileUploaded(file.id, storagePath);
      return storagePath;
    } catch (e) {
      lastError = e instanceof Error ? e : new Error(String(e));
      // Wait 1 second before retry
      if (attempt === 0) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }
  }

  // Both attempts failed
  await markFileFailed(file.id);
  throw lastError ?? new Error("Upload failed after retries");
};

/**
 * Deletes a file record and optionally removes from storage
 * @param req - Request object for Bun cookie access
 * @param fileId - ID of the file to delete
 * @param removeFromStorage - Whether to also delete from Supabase Storage
 */
export const deleteFile = async (
  req: Request,
  fileId: string,
  removeFromStorage = true
): Promise<void> => {
  const file = await getFileById(fileId);
  if (!file) {
    return;
  }

  if (removeFromStorage && file.storagePath) {
    try {
      await deleteStorageFile(req, file.storagePath);
    } catch (e) {
      // Log but don't fail if storage deletion fails
      console.error(`Failed to delete file from storage: ${e}`);
    }
  }

  await db.delete(files).where(eq(files.id, fileId));
};
