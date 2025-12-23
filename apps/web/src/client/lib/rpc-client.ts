/**
 * oRPC client instance for frontend
 * Pre-configured with current origin, can be imported throughout the app
 */
import { createClient } from "@yapmate/api/client";

/**
 * Get the base URL for the RPC client
 * Uses window.location.origin in browser, throws error if used on server
 */
const getBaseUrl = (): string => {
  if (typeof window === "undefined") {
    throw new Error("RPC client can only be used in browser environment");
  }
  return window.location.origin;
};

/**
 * Pre-configured oRPC client instance
 * Use this throughout the app instead of creating new clients
 */
export const rpcClient = createClient(getBaseUrl());
