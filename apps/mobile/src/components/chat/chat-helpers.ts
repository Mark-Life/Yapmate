import { rpcClient } from "@/lib/rpc-client";

/**
 * Creates a new chat via API
 * Return type is inferred from the router
 */
export const createChat = async (id: string, title: string) =>
  await rpcClient.chats.create({ id, title });

/**
 * Determines the default model for a chat
 * Basic version: returns hardcoded fallback model
 */
export const determineDefaultModel = (): string =>
  "google/gemini-2.5-flash-lite";
