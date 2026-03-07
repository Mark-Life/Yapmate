/**
 * Background file upload handler
 * Uploads files to Supabase Storage without blocking the request
 */
import type { FileSelect } from "../schema";
import { uploadFileWithRetry } from "./files";

/**
 * Uploads files to storage in background (non-blocking)
 * Logs errors but doesn't throw (fire-and-forget)
 * @param req - Request object for Bun cookie access
 * @param fileRecords - File records to upload
 * @param chatId - ID of the chat
 */
export const uploadFilesInBackground = (
  req: Request,
  fileRecords: FileSelect[],
  chatId: string
): void => {
  // Use Promise.allSettled to handle each file independently
  Promise.allSettled(
    fileRecords.map((file) => uploadFileWithRetry(req, file, chatId))
  )
    .then((results) => {
      const failures = results.filter((r) => r.status === "rejected");
      if (failures.length > 0) {
        console.error(
          `${failures.length} file upload(s) failed for chat ${chatId}:`,
          failures.map((f) =>
            f.status === "rejected" ? f.reason : "unknown error"
          )
        );
      }
    })
    .catch((err) => {
      console.error(`[UPLOAD] Background upload error for chat ${chatId}:`, err);
    });
};
