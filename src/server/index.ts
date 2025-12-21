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

const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const server = serve({
  port,

  routes: {
    // Frontend SPA routes - HTML import bundles React app
    "/": index,
    "/login": index,

    // Auth routes
    "/auth/callback": callbackHandler.GET,

    // API routes
    "/api/chats": chatsHandler,
    "/api/chats/:id/messages": messagesHandler,
    "/api/chat": chatHandler,
    "/api/auth/magic-link": magicLinkHandler,

    // SPA fallback - catches /chat/:id and any other client routes
    "/*": index,
  },

  // Fallback for unmatched routes
  fetch(_req) {
    return new Response("Not Found", { status: 404 });
  },

  // Development mode configuration
  ...(process.env.NODE_ENV !== "production"
    ? {
        development: {
          // Enable Hot Module Reloading
          hmr: true,

          // Echo console logs from the browser to the terminal
          console: true,
        },
      }
    : {}),
});

console.log(`🚀 Server running at ${server.url}`);
