/**
 * Supabase Storage service for file operations
 * Handles upload, download, and deletion of files in the user-files bucket
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createClient } from "./index";

const BUCKET_NAME = "user-files";
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Decodes base64 data URL to Buffer
 */
const dataUrlToBuffer = (dataUrl: string): Buffer => {
  const base64Data = dataUrl.split(",")[1];
  if (!base64Data) {
    throw new Error("Invalid data URL format");
  }
  return Buffer.from(base64Data, "base64");
};

/**
 * Uploads a file to Supabase Storage from a base64 data URL
 * @param req - Request object for Bun cookie access
 * @param dataUrl - Base64 data URL (e.g., "data:image/png;base64,...")
 * @param storagePath - Path in storage bucket (format: "{userId}/{chatId}/{fileId}_{filename}")
 * @param mimeType - MIME type of the file
 */
export const uploadFileFromDataUrl = async (
  req: Request,
  dataUrl: string,
  storagePath: string,
  mimeType: string
): Promise<void> => {
  const supabase = createClient(req);
  const buffer = dataUrlToBuffer(dataUrl);

  if (buffer.length > MAX_FILE_SIZE) {
    throw new Error(
      `File exceeds ${MAX_FILE_SIZE / 1024 / 1024}MB limit (got ${(buffer.length / 1024 / 1024).toFixed(2)}MB)`
    );
  }

  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(storagePath, buffer, {
      contentType: mimeType,
      upsert: false,
    });

  if (error) {
    throw new Error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Gets a signed URL for accessing a file
 * Supports both Bearer token (mobile) and cookie (web) authentication
 * @param req - Request object for Bun cookie access or Bearer token
 * @param storagePath - Path in storage bucket
 * @param expiresIn - Seconds until expiry (default 1 hour)
 */
export const getSignedUrl = async (
  req: Request,
  storagePath: string,
  expiresIn = 3600
): Promise<string> => {
  // Check for Bearer token in Authorization header (mobile apps)
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7) // Remove 'Bearer ' prefix
    : authHeader;

  let supabase:
    | ReturnType<typeof createSupabaseClient>
    | ReturnType<typeof createClient>;
  if (token) {
    // Use Bearer token authentication (mobile apps)
    if (typeof process.env.PUBLIC_SUPABASE_URL !== "string") {
      throw new Error("PUBLIC_SUPABASE_URL is not set");
    }
    if (typeof process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY !== "string") {
      throw new Error("PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
    }
    // Create client with auth header - this should work for storage operations
    supabase = createSupabaseClient(
      process.env.PUBLIC_SUPABASE_URL,
      process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );
  } else {
    // Fall back to cookie-based authentication (web apps)
    const cookieClient = createClient(req);
    supabase = cookieClient;
  }

  const { data, error } = await supabase.storage
    .from(BUCKET_NAME)
    .createSignedUrl(storagePath, expiresIn);

  if (error) {
    throw new Error(`Failed to create signed URL: ${error.message}`);
  }

  if (!data?.signedUrl) {
    throw new Error("No signed URL returned from storage");
  }

  return data.signedUrl;
};

/**
 * Deletes a file from storage
 * @param req - Request object for Bun cookie access
 * @param storagePath - Path in storage bucket
 */
export const deleteFile = async (
  req: Request,
  storagePath: string
): Promise<void> => {
  const supabase = createClient(req);
  const { error } = await supabase.storage
    .from(BUCKET_NAME)
    .remove([storagePath]);

  if (error) {
    throw new Error(`Failed to delete file: ${error.message}`);
  }
};
