/**
 * Main Bun server entry point
 * Sets up routes and starts the server
 */

import { readdir } from "node:fs/promises";
import { join, relative, sep } from "node:path";
import { RPCHandler } from "@orpc/server/fetch";
import { router } from "@yapmate/api/router";
import { chatHandler } from "@yapmate/server/routes/api/chat/handler";
import { streamResumeHandler } from "@yapmate/server/routes/api/stream";
import { transcribeHandler } from "@yapmate/server/routes/api/transcribe";
import { callbackHandler } from "@yapmate/server/routes/auth/callback";
import type { BunFile, HTMLBundle } from "bun";
import { serve } from "bun";

/**
 * HTML import for development (HMR support)
 * In production builds, this is replaced with `null` by the build plugin
 * See: build.ts excludeHtmlPlugin
 */
import devIndexHtml from "../client/index.html";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const isProduction = process.env.NODE_ENV === "production";

/**
 * Get allowed CORS origins based on environment
 * In development: allows localhost origins for React Native Web and web app
 * In production: uses CORS_ORIGIN env var or defaults to same-origin
 */
const getAllowedOrigins = (): string[] => {
  if (isProduction) {
    const corsOrigin = process.env.CORS_ORIGIN;
    return corsOrigin ? [corsOrigin] : [];
  }
  // Development: allow common localhost ports
  return [
    "http://localhost:3000",
    "http://localhost:8081", // React Native Web default
  ];
};

/**
 * Check if origin is allowed
 */
const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) {
    return false;
  }
  const allowed = getAllowedOrigins();
  return allowed.includes(origin);
};

/**
 * Add CORS headers to response
 */
const addCorsHeaders = (req: Request, response: Response): Response => {
  const origin = req.headers.get("origin");
  const headers = new Headers(response.headers);

  if (origin && isOriginAllowed(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Credentials", "true");
  }

  headers.set(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, DELETE, OPTIONS, PATCH"
  );
  headers.set(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Requested-With"
  );
  headers.set("Access-Control-Max-Age", "86400");

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
};

/**
 * Handle CORS preflight requests
 */
const handleCorsPreflight = (req: Request): Response | null => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin");
    const headers = new Headers();

    if (origin && isOriginAllowed(origin)) {
      headers.set("Access-Control-Allow-Origin", origin);
      headers.set("Access-Control-Allow-Credentials", "true");
    }

    headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS, PATCH"
    );
    headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization, X-Requested-With"
    );
    headers.set("Access-Control-Max-Age", "86400");

    return new Response(null, { status: 204, headers });
  }
  return null;
};

/**
 * Get the HTML bundle for SPA routes
 * - Production: Serve pre-built HTML from dist/client/index.html
 * - Development: Use HTML import for HMR and on-demand bundling
 */
const index: BunFile | HTMLBundle = isProduction
  ? Bun.file("./client/index.html")
  : devIndexHtml;

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
 * In production: scan client build output (dist/client/)
 * In development: scan public/ directory
 */
const publicAssetsDir = isProduction ? "./client" : "./public";
const publicAssets = await discoverPublicAssets(publicAssetsDir);
const publicAssetCount = Object.keys(publicAssets).length;
if (publicAssetCount > 0) {
  console.log(`📦 Discovered ${publicAssetCount} public assets`);
}

/** oRPC handler for type-safe API */
const rpcHandler = new RPCHandler(router);

const server = serve({
  port,

  routes: {
    // Frontend SPA routes - HTML import bundles React app
    "/": index,
    "/login": index,
    "/chat": index,
    "/chat/*": index,

    // Auth routes
    "/auth/callback": callbackHandler.GET,

    // API routes - streaming and file uploads (kept as HTTP)
    "/api/chat": async (req) => {
      const preflightResponse = handleCorsPreflight(req);
      if (preflightResponse) {
        return preflightResponse;
      }
      const response = await chatHandler.POST(req);
      return addCorsHeaders(req, response);
    },
    "/api/chat/:id/stream": async (req) => {
      const preflightResponse = handleCorsPreflight(req);
      if (preflightResponse) {
        return preflightResponse;
      }
      const response = await streamResumeHandler.GET(req);
      return addCorsHeaders(req, response);
    },
    "/api/transcribe": async (req) => {
      const preflightResponse = handleCorsPreflight(req);
      if (preflightResponse) {
        return preflightResponse;
      }
      const response = await transcribeHandler.POST(req);
      return addCorsHeaders(req, response);
    },

    // Health check endpoint
    "/health": () => Response.json({ status: "ok" }),

    // oRPC routes
    "/rpc/*": async (req) => {
      // Handle CORS preflight
      const preflightResponse = handleCorsPreflight(req);
      if (preflightResponse) {
        return preflightResponse;
      }

      const { matched, response } = await rpcHandler.handle(req, {
        prefix: "/rpc",
        context: { req },
      });
      if (matched) {
        return addCorsHeaders(req, response);
      }
      return addCorsHeaders(req, new Response("Not Found", { status: 404 }));
    },

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

    // SPA catch-all fallback - must be last in routes
    // Serves bundled HTML for client-side routing (React router handles 404)
    "/*": index,
  },

  /**
   * Fallback for unmatched static files (e.g., missing .js, .css, .png)
   * The catch-all "/*" route above handles SPA routing
   */
  fetch(req) {
    const url = new URL(req.url);
    const hasFileExtension = FILE_EXTENSION_PATTERN.test(url.pathname);

    if (hasFileExtension) {
      return new Response("Not Found", { status: 404 });
    }

    // This shouldn't be reached since "/*" catches all non-file routes
    return new Response("Not Found", { status: 404 });
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
