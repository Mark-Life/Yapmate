import { createBrowserClient } from "@supabase/ssr";

/**
 * Gets Supabase URL from environment or throws error
 * Supports both NEXT_PUBLIC_ prefix (for migration) and PUBLIC_ prefix
 * Bun replaces process.env.* references at build time for client code
 */
const getSupabaseUrl = (): string => {
  const url =
    process.env.PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url || typeof url !== "string") {
    throw new Error(
      "PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is not set"
    );
  }
  return url;
};

/**
 * Gets Supabase publishable key from environment or throws error
 * Supports both NEXT_PUBLIC_ prefix (for migration) and PUBLIC_ prefix
 * Bun replaces process.env.* references at build time for client code
 */
const getSupabaseKey = (): string => {
  const key =
    process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!key || typeof key !== "string") {
    throw new Error(
      "PUBLIC_SUPABASE_PUBLISHABLE_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set"
    );
  }
  return key;
};

/**
 * Creates a Supabase browser client
 */
export const createClient = () =>
  createBrowserClient(getSupabaseUrl(), getSupabaseKey());
