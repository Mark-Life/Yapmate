/**
 * Supabase client for Bun server
 * Provides server-side Supabase client with Bun cookie support
 */
import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";

if (typeof process.env.PUBLIC_SUPABASE_URL !== "string") {
  throw new Error("PUBLIC_SUPABASE_URL is not set");
}
if (typeof process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY !== "string") {
  throw new Error("PUBLIC_SUPABASE_PUBLISHABLE_KEY is not set");
}

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY;

/**
 * Bun CookieMap interface for type safety
 */
interface BunCookieMap {
  get(name: string): string | undefined;
  set(
    name: string,
    value: string,
    options?: {
      path?: string;
      maxAge?: number;
      httpOnly?: boolean;
      secure?: boolean;
      sameSite?: "strict" | "lax" | "none";
    }
  ): void;
  delete(name: string, options?: { path?: string }): void;
  entries(): IterableIterator<[string, string]>;
}

/**
 * BunRequest with cookies property
 */
type BunRequest = Request & { cookies: BunCookieMap };

/**
 * Creates Supabase client for Bun server requests.
 * Uses BunRequest cookies API for session management.
 */
export const createClient = (req: Request) => {
  // BunRequest has .cookies property when using routes
  const bunReq = req as BunRequest;

  // Check if cookies are available (they should be when using routes)
  if (!bunReq.cookies) {
    throw new Error(
      "Cookies not available on request. Ensure you're using Bun.serve routes."
    );
  }

  return createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      getAll() {
        const cookies: Array<{ name: string; value: string }> = [];
        // Bun's CookieMap is iterable - use entries() if available, otherwise fallback
        try {
          if (typeof bunReq.cookies.entries === "function") {
            for (const [name, value] of bunReq.cookies.entries()) {
              cookies.push({ name, value });
            }
          } else {
            // Fallback: try to get common Supabase cookie names
            const sbAccessToken = bunReq.cookies.get("sb-access-token");
            const sbRefreshToken = bunReq.cookies.get("sb-refresh-token");
            if (sbAccessToken) {
              cookies.push({ name: "sb-access-token", value: sbAccessToken });
            }
            if (sbRefreshToken) {
              cookies.push({ name: "sb-refresh-token", value: sbRefreshToken });
            }
          }
        } catch (error) {
          console.error("Error reading cookies:", error);
        }
        return cookies;
      },
      setAll(cookiesToSet) {
        // Cookies set via req.cookies.set() are auto-applied to response
        try {
          for (const { name, value, options } of cookiesToSet) {
            bunReq.cookies.set(name, value, {
              path: options?.path ?? "/",
              maxAge: options?.maxAge,
              httpOnly: options?.httpOnly,
              secure: options?.secure,
              sameSite: options?.sameSite as
                | "strict"
                | "lax"
                | "none"
                | undefined,
            });
          }
        } catch (error) {
          console.error("Error setting cookies:", error);
        }
      },
    },
  });
};

/**
 * Gets current user ID from Supabase auth
 * Supports both Bearer token (for mobile apps) and cookies (for web apps)
 */
export const getCurrentUserId = async (
  req: Request
): Promise<string | null> => {
  try {
    // Check for Bearer token in Authorization header (mobile apps)
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7) // Remove 'Bearer ' prefix
      : authHeader;

    if (token) {
      // Use Bearer token authentication
      const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
      const { data: claims, error: claimsError } =
        await supabase.auth.getClaims(token);

      if (claimsError) {
        return null;
      }

      if (claims?.claims?.sub && typeof claims.claims.sub === "string") {
        return claims.claims.sub;
      }

      return null;
    }

    // Fall back to cookie-based authentication (web apps)
    const supabase = createClient(req);
    const { data, error } = await supabase.auth.getUser();

    if (error) {
      return null;
    }

    if (!data?.user?.id || typeof data.user.id !== "string") {
      return null;
    }

    return data.user.id;
  } catch {
    return null;
  }
};

/**
 * Gets user from Bearer token authentication
 */
const getUserFromBearerToken = async (
  token: string
): Promise<{ id: string; email?: string } | null> => {
  const supabase = createSupabaseClient(supabaseUrl, supabaseKey);
  const { data: claims, error: claimsError } =
    await supabase.auth.getClaims(token);

  if (claimsError) {
    return null;
  }

  if (claims?.claims?.sub && typeof claims.claims.sub === "string") {
    return {
      id: claims.claims.sub,
      email: claims.claims.email as string | undefined,
    };
  }

  return null;
};

/**
 * Gets user from cookie-based authentication
 */
const getUserFromCookies = async (
  req: Request
): Promise<{ id: string; email?: string } | null> => {
  const supabase = createClient(req);
  const { data, error } = await supabase.auth.getUser();

  if (error) {
    return null;
  }

  if (!data?.user?.id || typeof data.user.id !== "string") {
    return null;
  }

  return {
    id: data.user.id,
    email: data.user.email,
  };
};

/**
 * Gets current user from Supabase auth
 * Supports both Bearer token (for mobile apps) and cookies (for web apps)
 * Returns user object with email and other user data
 */
export const getCurrentUser = async (
  req: Request
): Promise<{ id: string; email?: string } | null> => {
  try {
    const authHeader = req.headers.get("authorization");
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    if (token) {
      const user = await getUserFromBearerToken(token);
      return user;
    }

    const user = await getUserFromCookies(req);
    return user;
  } catch {
    return null;
  }
};
