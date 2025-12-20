/**
 * Main Bun server entry point
 * Sets up routes and starts the server
 */
import { serve } from "bun";
import index from "../client/index.html";
import { chatHandler } from "./routes/api/chat";
import { chatsHandler } from "./routes/api/chats";
import { messagesHandler } from "./routes/api/messages";
import { callbackHandler } from "./routes/auth/callback";
import { magicLinkHandler } from "./routes/auth/magic-link";

const server = serve({
  port: process.env.PORT ?? 3000,

  routes: {
    // Frontend SPA routes - HTML import bundles React app
    "/": index,
    "/login": index,
    "/chat/*": index,

    // Auth routes
    "/auth/callback": callbackHandler.GET,

    // API routes
    "/api/chats": chatsHandler,
    "/api/chats/:id/messages": messagesHandler,
    "/api/chat": chatHandler,
    "/api/auth/magic-link": magicLinkHandler,
  },

  // Fallback for unmatched routes
  fetch(req) {
    return new Response("Not Found", { status: 404 });
  },

  development: process.env.NODE_ENV !== "production",
});

console.log(`🚀 Server running at ${server.url}`);
