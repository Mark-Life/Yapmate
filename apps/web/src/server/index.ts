/**
 * Main Bun server entry point
 * Sets up routes and starts the server
 */

import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { chatHandler } from "@yapmate/server/routes/api/chat/handler";
import {
  chatsHandler,
  lastAssistantModelHandler,
} from "@yapmate/server/routes/api/chats";
import {
  lastModelHandler,
  messagesHandler,
} from "@yapmate/server/routes/api/messages";
import { modelsHandler } from "@yapmate/server/routes/api/models";
import { stopHandler } from "@yapmate/server/routes/api/stop";
import { streamResumeHandler } from "@yapmate/server/routes/api/stream";
import { transcribeHandler } from "@yapmate/server/routes/api/transcribe";
import { callbackHandler } from "@yapmate/server/routes/auth/callback";
import { magicLinkHandler } from "@yapmate/server/routes/auth/magic-link";
import type { BunFile } from "bun";
import { serve } from "bun";
import index from "../client/index.html";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const isProduction = process.env.NODE_ENV === "production";

/** Files that should never be served (server bundles) */
const BLOCKED_FILES = new Set(["index.js", "index.js.map"]);

/** Pattern to detect file extensions in URL paths */
const FILE_EXTENSION_PATTERN = /\.[a-zA-Z0-9]+$/;

/**
 * Check if error is ENOENT (file not found)
 */
const isNotFoundError = (error: unknown): boolean =>
  error instanceof Error && "code" in error && error.code === "ENOENT";

/**
 * Recursively discover all files in a directory and create route mappings
 * Based on: https://github.com/Mark-Life/bun-full-stack-app-example
 */
const discoverPublicAssets = async (
  dir: string
): Promise<Record<string, BunFile>> => {
  const assets: Record<string, BunFile> = {};

  const scanDirectory = async (currentDir: string, baseDir: string) => {
    try {
      const entries = await readdir(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(currentDir, entry.name);

        if (entry.isDirectory()) {
          await scanDirectory(fullPath, baseDir);
        } else if (entry.isFile() && !BLOCKED_FILES.has(entry.name)) {
          const relativePath = relative(baseDir, fullPath);
          const urlPath = `/${relativePath.split(sep).join("/")}`;
          assets[urlPath] = Bun.file(fullPath);
        }
      }
    } catch (error) {
      if (!isNotFoundError(error)) {
        console.warn(`Failed to scan directory ${currentDir}:`, error);
      }
    }
  };

  await scanDirectory(dir, dir);
  return assets;
};

/**
 * Discover public assets at startup
 * In production: scan current directory (dist/)
 * In development: scan public/ directory
 */
const publicAssetsDir = isProduction ? "." : "./public";
const publicAssets = await discoverPublicAssets(publicAssetsDir);
const publicAssetCount = Object.keys(publicAssets).length;
if (publicAssetCount > 0) {
  console.log(`📦 Discovered ${publicAssetCount} public assets`);
}

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
    "/api/transcribe": transcribeHandler,
    "/api/auth/magic-link": magicLinkHandler,

    // Health check endpoint
    "/health": () => Response.json({ status: "ok" }),

    // Static assets - discovered at startup
    ...publicAssets,

    // Serve /public/* for relative paths in HTML that reference ../../public/
    "/public/*": (req) => {
      const url = new URL(req.url);
      const fileName = url.pathname.replace("/public/", "");
      const filePath = isProduction ? `./${fileName}` : `./public/${fileName}`;
      const file = Bun.file(filePath);
      return new Response(file);
    },
  },

  /**
   * SPA fallback handler - runs for routes not matched above.
   * Returns HTML for client-side routing, 404 for missing static files.
   */
  fetch(req) {
    const url = new URL(req.url);
    const hasFileExtension = FILE_EXTENSION_PATTERN.test(url.pathname);

    // Static file not found - return 404
    if (hasFileExtension) {
      return new Response("Not Found", { status: 404 });
    }

    // SPA fallback for client-side routing
    const htmlPath = isProduction ? "./index.html" : "./src/client/index.html";
    return new Response(Bun.file(htmlPath), {
      headers: { "Content-Type": "text/html" },
    });
  },

  // Development mode configuration
  ...(isProduction
    ? {}
    : {
        development: {
          hmr: true,
          console: true,
        },
      }),
});

console.log(`🚀 Server running at ${server.url}`);
