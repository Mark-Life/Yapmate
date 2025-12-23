/**
 * oRPC middleware and procedure builders
 * Provides public and protected procedure builders with authentication
 */
import { ORPCError, os } from "@orpc/server";
import { getCurrentUserId } from "@yapmate/server/lib/supabase";

/**
 * Initial context - Request object passed from server
 */
export type InitialContext = {
  req: Request;
};

/**
 * Execution context - Extended with user info after auth middleware
 */
export type ExecutionContext = {
  req: Request;
  userId?: string;
};

/**
 * Base procedure builder with initial context
 */
const base = os.$context<InitialContext>();

/**
 * Auth middleware - extracts user ID from request and injects into context
 * Does not throw - allows public procedures to work
 */
const authMiddleware = base.middleware(async ({ context, next }) => {
  const userId = await getCurrentUserId(context.req);
  return next({
    context: {
      ...context,
      userId: userId ?? undefined,
    },
  });
});

/**
 * Public procedure builder - no auth required
 * User may or may not be authenticated
 */
export const publicProcedure = base.use(authMiddleware);

/**
 * Protected procedure builder - requires authentication
 * Throws UNAUTHORIZED if user is not authenticated
 */
export const protectedProcedure = publicProcedure.use(({ context, next }) => {
  if (!context.userId) {
    throw new ORPCError("UNAUTHORIZED", {
      message: "Authentication required",
    });
  }
  return next({
    context: {
      ...context,
      userId: context.userId,
    },
  });
});
