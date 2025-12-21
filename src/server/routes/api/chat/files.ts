/**
 * File processing utilities for chat messages
 */

import type { UIMessage } from "ai";
import type { FileSelect } from "@/server/lib/db/schema/files";
import { createPendingFile } from "@/server/lib/db/service/files";

/**
 * Processes file parts from a message and creates file records
 */
export const processFileParts = async (
  fileParts: UIMessage["parts"],
  userId: string
): Promise<FileSelect[]> => {
  const fileRecords: FileSelect[] = [];

  for (const filePart of fileParts) {
    if (filePart.type !== "file") {
      continue;
    }

    const fileData = filePart as {
      url?: string;
      mediaType?: string;
      filename?: string;
    };

    if (!fileData.url?.startsWith("data:")) {
      continue;
    }

    const base64Data = fileData.url.split(",")[1];
    const size = base64Data ? Math.ceil((base64Data.length * 3) / 4) : 0;

    const fileRecord = await createPendingFile({
      userId,
      dataUrl: fileData.url,
      filename: fileData.filename || "file",
      mimeType: fileData.mediaType || "application/octet-stream",
      size,
    });

    fileRecords.push(fileRecord);
  }

  return fileRecords;
};

/**
 * Processes file parts and maps them to part indices
 */
export const processMessageFiles = async (
  message: UIMessage,
  userId: string
): Promise<{
  fileRecords: FileSelect[];
  fileIdByPartIndex: Map<number, string>;
}> => {
  const fileParts = message.parts.filter((p) => p.type === "file");
  let fileRecords: FileSelect[] = [];
  const fileIdByPartIndex = new Map<number, string>();

  if (fileParts.length > 0) {
    fileRecords = await processFileParts(fileParts, userId);

    let fileIndex = 0;
    for (let i = 0; i < message.parts.length; i++) {
      if (message.parts[i].type === "file" && fileIndex < fileRecords.length) {
        fileIdByPartIndex.set(i, fileRecords[fileIndex].id);
        fileIndex += 1;
      }
    }
  }

  return { fileRecords, fileIdByPartIndex };
};
