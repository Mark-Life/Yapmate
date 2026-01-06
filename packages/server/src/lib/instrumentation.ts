/**
 * Langfuse tracing initialization
 * Provides direct SDK access for explicit trace management
 */

import { Langfuse } from "langfuse";

const isProduction = process.env.NODE_ENV === "production";
const environment = isProduction ? "production" : "development";

if (!process.env.PUBLIC_LANGFUSE_PUBLIC_KEY) {
  throw new Error("PUBLIC_LANGFUSE_PUBLIC_KEY is not set");
}
if (!process.env.LANGFUSE_SECRET_KEY) {
  throw new Error("LANGFUSE_SECRET_KEY is not set");
}

/**
 * Langfuse client instance for explicit trace management
 * Use this to create traces with custom IDs for feedback linking
 */
export const langfuse = new Langfuse({
  publicKey: process.env.PUBLIC_LANGFUSE_PUBLIC_KEY,
  secretKey: process.env.LANGFUSE_SECRET_KEY,
  baseUrl: process.env.PUBLIC_LANGFUSE_BASE_URL,
  release: environment,
});

console.log(`📊 Langfuse tracing initialized (env: ${environment})`);
