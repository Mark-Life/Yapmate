/**
 * Main Bun server entry point
 * Sets up routes and starts the server
 */

import { serve } from "bun";
import index from "@/client/index.html";
import { chatHandler } from "./routes/api/chat/handler";
import { chatsHandler, lastAssistantModelHandler } from "./routes/api/chats";
import { lastModelHandler, messagesHandler } from "./routes/api/messages";
import { modelsHandler } from "./routes/api/models";
import { stopHandler } from "./routes/api/stop";
import { streamResumeHandler } from "./routes/api/stream";
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
    "/api/chats/last-model": lastAssistantModelHandler.GET,
    "/api/chats/:id/messages": messagesHandler,
    "/api/chats/:id/last-model": lastModelHandler.GET,
    "/api/chat": chatHandler,
    "/api/chat/stop": stopHandler,
    "/api/chat/:id/stream": streamResumeHandler.GET,
    "/api/models": modelsHandler,
    "/api/auth/magic-link": magicLinkHandler,

    // Health check endpoint
    "/health": () => Response.json({ status: "ok" }),

    // PWA files - serve from dist in production, public in development
    "/site.webmanifest": async () => {
      const manifestPath =
        process.env.NODE_ENV === "production"
          ? "./dist/site.webmanifest"
          : "./public/site.webmanifest";
      const file = Bun.file(manifestPath);
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": "application/manifest+json" },
        });
      }
      return new Response("Not Found", { status: 404 });
    },
    "/sw.js": async () => {
      const swPath =
        process.env.NODE_ENV === "production"
          ? "./dist/sw.js"
          : "./public/sw.js";
      const file = Bun.file(swPath);
      if (await file.exists()) {
        return new Response(file, {
          headers: { "Content-Type": "application/javascript" },
        });
      }
      return new Response("Not Found", { status: 404 });
    },

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
