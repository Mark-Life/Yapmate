/**
 * oRPC client instance for mobile app
 * Pre-configured with API base URL and Supabase auth headers
 */
import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { Router } from "@yapmate/api/router";
import { supabase } from "./supabase";

/**
 * Get the base URL for the RPC client
 * Uses EXPO_PUBLIC_API_URL environment variable
 */
const getBaseUrl = (): string => {
  if (process.env.NODE_ENV === "development") {
    return "http://localhost:3000";
  }
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error(
      "EXPO_PUBLIC_API_URL is not set. Please set it in your .env file."
    );
  }
  return apiUrl;
};

/**
 * Custom fetch wrapper that adds Supabase session token as Authorization header
 * React Native doesn't send cookies automatically, so we need to add the token manually
 */
const createAuthenticatedFetch = () => {
  return async (url: string | URL | Request, init?: RequestInit) => {
    // Get current session token
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Add Authorization header if token exists
    const headers = new Headers(init?.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }

    // Call native fetch with updated headers
    return fetch(url, {
      ...init,
      headers,
    });
  };
};

/**
 * Pre-configured oRPC client instance with authentication
 * Use this throughout the app instead of creating new clients
 */
export const rpcClient: RouterClient<Router> = createORPCClient(
  new RPCLink({
    url: `${getBaseUrl()}/rpc`,
    fetch: createAuthenticatedFetch(),
  })
);
