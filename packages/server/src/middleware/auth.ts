/**
 * Auth middleware helpers
 * Provides utilities for authentication checks
 */
import { getCurrentUserId } from "../lib/supabase";

/**
 * Requires authentication for a request.
 * Returns the user ID if authenticated, or an unauthorized Response if not.
 * @param req - The incoming request
 * @returns User ID string if authenticated, Response with 401 status if not
 */
export const requireAuth = async (req: Request): Promise<string | Response> => {
  const userId = await getCurrentUserId(req);
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return userId;
};
