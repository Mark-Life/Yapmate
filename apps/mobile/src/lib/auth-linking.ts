import * as QueryParams from "expo-auth-session/build/QueryParams";
import { supabase } from "./supabase";

/**
 * Creates a session from a magic link URL
 * Handles both token_hash (for magic links) and regular OTP tokens
 */
export const createSessionFromUrl = async (
  url: string
): Promise<{ session: any; error: Error | null }> => {
  try {
    console.log("Processing auth URL:", url);

    // Safely call getQueryParams with proper error handling
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let queryResult: any;
    try {
      queryResult = QueryParams.getQueryParams(url);
    } catch (parseError) {
      console.log("Error parsing URL:", parseError);
      return { session: null, error: parseError as Error };
    }

    // Type guard for the query result
    if (
      !queryResult ||
      typeof queryResult !== "object" ||
      !("params" in queryResult)
    ) {
      console.log("Invalid query result from URL");
      return {
        session: null,
        error: new Error("Invalid query result from URL"),
      };
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const { params } = queryResult;

    if (!params || typeof params !== "object") {
      console.log("No parameters found in URL");
      return {
        session: null,
        error: new Error("No parameters found in URL"),
      };
    }

    // Use type assertions for safer access
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const paramsObj = params as Record<string, any>;

    // Safely extract parameters with type checking
    const token_hash =
      typeof paramsObj.token_hash === "string" ? paramsObj.token_hash : null;
    const type = typeof paramsObj.type === "string" ? paramsObj.type : null;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const error = paramsObj.error;
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const error_description = paramsObj.error_description;

    if (error) {
      throw new Error(String(error_description ?? error));
    }

    // For magic links, we need to verify the token_hash
    if (type === "magiclink" && token_hash) {
      console.log("Processing magic link with token_hash");

      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash,
        type: "magiclink",
      });

      if (verifyError) {
        console.error("Error verifying magic link:", verifyError);
        throw verifyError;
      }

      console.log("Magic link verified successfully");
      return { session: data.session, error: null };
    }

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
