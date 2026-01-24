import { createClient } from "./supabase/client";

type AuthResult = {
  success: boolean;
  error?: string;
  /** True when signup succeeded but email confirmation is required */
  needsEmailConfirmation?: boolean;
};

/**
 * Signs in with email and password
 */
export const signInWithPassword = async (
  email: string,
  password: string,
  captchaToken?: string
): Promise<AuthResult> => {
  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email,
    password,
    options: { captchaToken },
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
};

/**
 * Signs up with email and password
 * When email confirmation is enabled in Supabase, session will be null
 * and user needs to confirm email before they can sign in
 */
export const signUpWithPassword = async (
  email: string,
  password: string,
  captchaToken?: string
): Promise<AuthResult> => {
  const supabase = createClient();
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${appUrl}/auth/callback`,
      captchaToken,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }

  // If session is null but user exists, email confirmation is required
  const needsEmailConfirmation = data.user !== null && data.session === null;

  return { success: true, needsEmailConfirmation };
};

/**
 * Sends a magic link email with OTP to the provided address
 */
export const sendMagicLink = async (
  email: string,
  redirectTo?: string,
  captchaToken?: string
): Promise<AuthResult> => {
  const supabase = createClient();
  const appUrl =
    typeof window !== "undefined"
      ? window.location.origin
      : "http://localhost:3000";
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo ?? `${appUrl}/auth/callback`,
      captchaToken,
    },
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
};

/**
 * Verifies OTP code for email authentication
 */
export const verifyOtp = async (
  email: string,
  token: string,
  type: "email" | "magiclink" = "email"
): Promise<AuthResult> => {
  const supabase = createClient();
  const { error } = await supabase.auth.verifyOtp({
    email,
    token,
    type,
  });

  if (error) {
    return { success: false, error: error.message };
  }
  return { success: true };
};

/**
 * @deprecated Use sendMagicLink instead
 * Sends a magic link email to the provided address
 * Kept for backward compatibility
 */
export const signInWithMagicLink = async (email: string) =>
  await sendMagicLink(email);
