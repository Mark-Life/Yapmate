import { createORPCClient } from "@orpc/client";
import { RPCLink } from "@orpc/client/fetch";
import type { RouterClient } from "@orpc/server";
import type { Router } from "./router";

/**
 * Create typed oRPC client for browser
 */
export const createClient = (baseUrl: string): RouterClient<Router> => {
  const link = new RPCLink({
    url: `${baseUrl}/rpc`,
  });
  return createORPCClient(link);
};
