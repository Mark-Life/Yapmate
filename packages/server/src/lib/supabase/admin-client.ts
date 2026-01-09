/**
 * Supabase Admin Client
 * Uses service role key for admin operations (user deletion, etc.)
 * Keep this separate from regular client to avoid accidental misuse
 */

import { createClient as createSupabaseClient } from "@supabase/supabase-js";

if (typeof process.env.PUBLIC_SUPABASE_URL !== "string") {
  throw new Error("PUBLIC_SUPABASE_URL is not set");
}
if (typeof process.env.SUPABASE_SERVICE_ROLE_KEY !== "string") {
  throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set");
}

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * Creates Supabase admin client with service role key
 * Has full access to all operations - use with caution
 */
export const createAdminClient = () =>
  createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
