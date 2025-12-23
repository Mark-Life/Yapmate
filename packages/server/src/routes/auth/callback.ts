/**
 * Auth callback route handler
 * Handles GET for /auth/callback
 */
import type { EmailOtpType } from "@supabase/supabase-js";
import { createClient } from "../../lib/supabase";

export const callbackHandler = {
  async GET(req: Request) {
    const url = new URL(req.url);
    const tokenHash = url.searchParams.get("token_hash");
    const type = url.searchParams.get("type") as EmailOtpType | null;
    const next = url.searchParams.get("next") ?? "/";
    const origin = url.origin;

    if (!(tokenHash && type)) {
      return Response.redirect(
        `${origin}/login?error=missing_verification_params`
      );
    }

    const supabase = createClient(req);
    const { error } = await supabase.auth.verifyOtp({
      type,
      token_hash: tokenHash,
    });

    if (error) {
      return Response.redirect(`${origin}/login?error=unable_to_verify_token`);
    }

    return Response.redirect(`${origin}${next}`);
  },
};
