/**
 * Magic link auth route handler
 * Handles POST for /api/auth/magic-link
 */
import { createClient } from "../../lib/supabase";

export const magicLinkHandler = {
  async POST(req: Request) {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return Response.json(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const appUrl = process.env.PUBLIC_APP_URL ?? "http://localhost:3000";
    const supabase = createClient(req);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${appUrl}/auth/callback` },
    });

    if (error) {
      return Response.json({ success: false, error: error.message });
    }
    return Response.json({ success: true });
  },
};
