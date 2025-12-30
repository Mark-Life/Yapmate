import type { Session } from "@supabase/supabase-js";
import * as QueryParams from "expo-auth-session/build/QueryParams";
import { supabase } from "./supabase";

type QueryParamsResult = {
  params: Record<string, string | undefined>;
};

type AuthUrlResult = {
  session: Session | null;
  error: Error | null;
};

/**
 * Checks if a URL is an auth callback URL
 * Returns true if URL contains auth-related parameters
 * Handles both deep links (yapmate://auth/callback) and universal links (https://yapmate.com/auth/mobile)
 */
export const isAuthCallbackUrl = (url: string): boolean => {
  try {
    // Quick check: look for auth-related query parameters in the URL string
    // Works for both deep links (yapmate://) and universal links (https://)
    const authParams = [
      "token_hash",
      "type=magiclink",
      "type=email",
      "access_token",
      "refresh_token",
    ];
    return authParams.some((param) => url.includes(param));
  } catch {
    return false;
  }
};

/**
 * Parses query parameters from URL
 */
const parseQueryParams = (url: string): QueryParamsResult | null => {
  try {
    const queryResult = QueryParams.getQueryParams(url);

    if (
      !queryResult ||
      typeof queryResult !== "object" ||
      !("params" in queryResult)
    ) {
      return null;
    }

    const { params } = queryResult;
    if (!params || typeof params !== "object") {
      return null;
    }

    return { params: params as Record<string, string | undefined> };
  } catch {
    return null;
  }
};

/**
 * Extracts auth parameters from parsed query params
 */
const extractAuthParams = (params: Record<string, string | undefined>) => {
  const token_hash =
    typeof params.token_hash === "string" ? params.token_hash : null;
  const type = typeof params.type === "string" ? params.type : null;
  const error = params.error;
  const error_description = params.error_description;

  return { token_hash, type, error, error_description };
};

/**
 * Verifies magic link token and creates session
 */
const verifyMagicLink = async (token_hash: string): Promise<AuthUrlResult> => {
  console.log("Processing magic link with token_hash");

  const { data, error: verifyError } = await supabase.auth.verifyOtp({
    token_hash,
    type: "magiclink",
  });

  if (verifyError) {
    console.error("Error verifying magic link:", verifyError);
    return {
      session: null,
      error: verifyError,
    };
  }

  console.log("Magic link verified successfully");
  return { session: data.session, error: null };
};

/**
 * Creates a session from a magic link URL
 * Handles both token_hash (for magic links) and regular OTP tokens
 * Supports both deep links (yapmate://auth/callback) and universal links (https://yapmate.com/auth/mobile)
 * Returns null session and null error if URL is not an auth callback
 */
export const createSessionFromUrl = async (
  url: string
): Promise<AuthUrlResult> => {
  try {
    // First check if this is an auth callback URL
    // Works for both deep links and universal links
    if (!isAuthCallbackUrl(url)) {
      // Not an auth callback, silently skip
      return { session: null, error: null };
    }

    console.log("Processing auth URL:", url);

    const queryResult = parseQueryParams(url);
    if (!queryResult) {
      return {
        session: null,
        error: new Error("Invalid query result from URL"),
      };
    }

    const { token_hash, type, error, error_description } = extractAuthParams(
      queryResult.params
    );

    if (error) {
      throw new Error(String(error_description ?? error));
    }

    // For magic links, we need to verify the token_hash
    // Supabase sends type=email for magic links, but we verify with type=magiclink
    if (token_hash && (type === "magiclink" || type === "email")) {
      return await verifyMagicLink(token_hash);
    }

    // If we got here, URL had auth params but they weren't valid
    console.log("No valid auth parameters found");
    return {
      session: null,
      error: new Error("No valid auth parameters found"),
    };
  } catch (error) {
    console.error("Error processing auth URL:", error);
    return {
      session: null,
      error: error instanceof Error ? error : new Error("Unknown error"),
    };
  }
};
