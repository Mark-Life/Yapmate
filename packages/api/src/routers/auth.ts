import { createClient } from "@yapmate/server/lib/supabase";
import { publicProcedure } from "../middleware";
import { magicLinkInputSchema, magicLinkResponseSchema } from "../schemas/auth";

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
};
