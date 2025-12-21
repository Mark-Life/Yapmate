import { createServerClient, type SetAllCookies } from "@supabase/ssr";
import { cookies } from "next/headers";

if (typeof process.env.PUBLIC_SUPABASE_URL !== "string") {
  throw new Error("PUBLIC_SUPABASE_URL is not set");
}
if (typeof process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY !== "string") {
  throw new Error("PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
}

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Parameters<SetAllCookies>[0]) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // The `setAll` method was called from a Server Component.
          // This can be ignored if you have middleware refreshing
          // user sessions.
        }
      },
    },
  });
}

/**
 * Gets the current authenticated user ID from Supabase auth
 * @returns User ID if authenticated, null otherwise
 */
export async function getCurrentUserId(): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();

  if (!data?.claims?.sub) {
    return null;
  }

  const userId = data.claims.sub;
  if (typeof userId !== "string" || userId.length === 0) {
    return null;
  }

  return userId;
}
