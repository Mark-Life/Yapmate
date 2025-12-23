import { rpcClient } from "./rpc-client";

/**
 * Sends a magic link email to the provided address
 * Return type is inferred from the router schema
 */
export const signInWithMagicLink = async (email: string) =>
  await rpcClient.auth.magicLink({ email });
