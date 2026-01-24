import { deleteUserAccount } from "@yapmate/db/service";
import { getClientIp, isRateLimited } from "@yapmate/server/lib/rate-limit";
import { createClient } from "@yapmate/server/lib/supabase";
import { protectedProcedure, publicProcedure } from "../middleware";
import {
  deleteAccountInputSchema,
  deleteAccountResponseSchema,
  magicLinkInputSchema,
  magicLinkResponseSchema,
} from "../schemas/auth";

/**
 * Auth router - authentication operations
 */
export const auth = {
  /**
   * Send magic link email
   */
  magicLink: publicProcedure
    .input(magicLinkInputSchema)
    .output(magicLinkResponseSchema)
    .handler(async ({ input, context }) => {
      const ip = getClientIp(context.req);

      // 3 requests per minute per IP
      if (isRateLimited(`auth:${ip}`, 3, 60_000)) {
        return { success: false, error: "Too many requests. Try again later." };
      }

      const appUrl = process.env.PUBLIC_APP_URL ?? "http://localhost:3000";
      const supabase = createClient(context.req);

      const { error } = await supabase.auth.signInWithOtp({
        email: input.email,
        options: { emailRedirectTo: `${appUrl}/auth/callback` },
      });

      if (error) {
        return { success: false, error: error.message };
      }
      return { success: true };
    }),

  /**
   * Delete user account
   * Requires email confirmation and authentication
   * Hard deletes all user data except Stripe records (kept for legal/bookkeeping)
   */
  deleteAccount: protectedProcedure
    .input(deleteAccountInputSchema)
    .output(deleteAccountResponseSchema)
    .handler(async ({ input, context }) => {
      if (!context.userId) {
        return {
          success: false,
          error: "Authentication required",
        };
      }

      try {
        await deleteUserAccount(context.userId, input.email);
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error ? error.message : "Failed to delete account",
        };
      }
    }),
};
