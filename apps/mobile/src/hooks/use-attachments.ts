import type { FileUIPart } from "ai";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import { useCallback, useMemo, useState } from "react";

/**
 * Attachment with local URI for preview and optional data URL for submission
 */
export type Attachment = {
  id: string;
  uri: string; // local file URI for preview
  dataUrl?: string; // base64 data URL (populated on submit)
  mediaType: string;
  filename: string;
};

/**
 * Context for managing attachments
 */
export type AttachmentsContext = {
  files: Attachment[];
  add: (uri: string, mediaType: string, filename: string) => void;
  remove: (id: string) => void;
  clear: () => void;
  prepareForSubmit: () => Promise<FileUIPart[]>;
};

/**
 * Hook for managing file attachments
 * Handles local file URIs and converts them to data URLs for submission
 */
export const useAttachments = (): AttachmentsContext => {
  const [files, setFiles] = useState<Attachment[]>([]);

  /**
   * Adds a new attachment
   */
  const add = useCallback(
    (uri: string, mediaType: string, filename: string) => {
      const newAttachment: Attachment = {
        id: Crypto.randomUUID(),
        uri,
        mediaType,
        filename,
      };
      setFiles((prev) => [...prev, newAttachment]);
    },
    []
  );

  /**
   * Removes an attachment by ID
   */
  const remove = useCallback((id: string) => {
    setFiles((prev) => prev.filter((f) => f.id !== id));
  }, []);

  /**
   * Clears all attachments
   */
  const clear = useCallback(() => {
    setFiles([]);
  }, []);

  /**
   * Converts attachments to FileUIPart[] with data URLs
   * Reads files from local URIs and converts to base64 data URLs
   */
  const prepareForSubmit = useCallback(async (): Promise<FileUIPart[]> => {
    const fileParts: FileUIPart[] = [];

    for (const file of files) {
      try {
        // If already converted, use cached data URL
        if (file.dataUrl) {
          fileParts.push({
            type: "file",
            url: file.dataUrl,
            mediaType: file.mediaType,
            filename: file.filename,
          });
          continue;
        }

        // Read file as base64
        const base64 = await FileSystem.readAsStringAsync(file.uri, {
          encoding: "base64",
        });

        // Convert to data URL format
        const dataUrl = `data:${file.mediaType};base64,${base64}`;

        // Update file with data URL (cache for potential retries)
        setFiles((prev) =>
          prev.map((f) => (f.id === file.id ? { ...f, dataUrl } : f))
        );

        fileParts.push({
          type: "file",
          url: dataUrl,
          mediaType: file.mediaType,
          filename: file.filename,
        });
      } catch (error) {
        console.error(`Failed to read file ${file.filename}:`, error);
        // Skip files that fail to read
      }
    }

    return fileParts;
  }, [files]);

  return useMemo<AttachmentsContext>(
    () => ({
      files,
      add,
      remove,
      clear,
      prepareForSubmit,
    }),
    [files, add, remove, clear, prepareForSubmit]
  );
};
