"use server";

import { createClient } from "@/lib/supabase/server";

export type MagicLinkResult =
  | { success: true }
  | { success: false; error: string };

/**
 * Sends a magic link email to the provided address
 */
export const signInWithMagicLink = async (
  email: string
): Promise<MagicLinkResult> => {
  const appUrl =
    process.env.VERCEL_BRANCH_URL ??
    process.env.VERCEL_URL ??
    "http://localhost:3000";
  console.log("appUrl", appUrl);
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  return { success: true };
};
