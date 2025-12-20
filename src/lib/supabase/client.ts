import { createBrowserClient } from "@supabase/ssr";

if (typeof process.env.NEXT_PUBLIC_SUPABASE_URL !== "string") {
  throw new Error("NEXT_PUBLIC_SUPABASE_URL is not set");
}
if (typeof process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY !== "string") {
  throw new Error("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export function createClient() {
  return createBrowserClient(supabaseUrl, supabaseKey);
}
