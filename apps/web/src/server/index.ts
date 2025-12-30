/**
 * Main Bun server entry point
 * Sets up routes and starts the server
 */

import { readdir } from "node:fs/promises";
import { networkInterfaces } from "node:os";
import { join, relative, sep } from "node:path";
import { RPCHandler } from "@orpc/server/fetch";
import { router } from "@yapmate/api/router";
import { getCurrentUserId } from "@yapmate/server/lib/supabase";
import {
  addConnection,
  initializeRedisBridge,
  removeConnection,
  type WsClientData,
} from "@yapmate/server/lib/websocket";
import { chatHandler } from "@yapmate/server/routes/api/chat/handler";
import { streamResumeHandler } from "@yapmate/server/routes/api/stream";
import { transcribeHandler } from "@yapmate/server/routes/api/transcribe";
import { callbackHandler } from "@yapmate/server/routes/auth/callback";
import type { BunFile, HTMLBundle, Server, ServerWebSocket } from "bun";
import { serve } from "bun";

/**
 * HTML import for development (HMR support)
 * In production builds, this is replaced with `null` by the build plugin
 * See: build.ts excludeHtmlPlugin
 */
import devIndexHtml from "../client/index.html";

const port = process.env.PORT ? Number(process.env.PORT) : 3000;
const isProduction = process.env.NODE_ENV === "production";

/** Pattern to match private IP addresses and localhost */
const PRIVATE_IP_PATTERN =
  /^(192\.168\.|10\.|172\.(1[6-9]|2[0-9]|3[01])\.|127\.0\.0\.1|localhost)/;

/**
 * Get local network IP addresses
 * Returns array of IPs like ["192.168.1.100", "10.0.0.5"]
 */
const getLocalNetworkIPs = (): string[] => {
  const interfaces = networkInterfaces();
  const ips: string[] = [];

  for (const name of Object.keys(interfaces)) {
    const nets = interfaces[name];
    if (!nets) {
      continue;
    }

    for (const net of nets) {
      // Skip internal (loopback) and non-IPv4 addresses
      if (net.family === "IPv4" && !net.internal) {
        ips.push(net.address);
      }
    }
  }

  return ips;
};

/**
 * Check if origin is from local network (private IP ranges)
 */
const isLocalNetworkOrigin = (origin: string): boolean => {
  try {
    const url = new URL(origin);
    const hostname = url.hostname;
    return PRIVATE_IP_PATTERN.test(hostname);
  } catch {
    return false;
  }
};

/**
 * Get allowed CORS origins based on environment
 * In development: allows localhost and local network origins
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
 * In development, also allows any origin from local network
 */
const isOriginAllowed = (origin: string | null): boolean => {
  if (!origin) {
    return false;
  }
  const allowed = getAllowedOrigins();
  if (allowed.includes(origin)) {
    return true;
  }
  // In development, allow any origin from local network
  if (!isProduction && isLocalNetworkOrigin(origin)) {
    return true;
  }
  return false;
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

/**
 * Extracts JWT token from WebSocket upgrade request
 * Supports both query parameter and Authorization header
 */
const extractTokenFromRequest = (req: Request): string | null => {
  // Try query parameter first (easier for WebSocket)
  const url = new URL(req.url);
  const tokenParam = url.searchParams.get("token");
  if (tokenParam) {
    return tokenParam;
  }

  // Fall back to Authorization header
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  if (authHeader) {
    return authHeader;
  }

  return null;
};

/**
 * Validates token and returns userId
 */
const validateWebSocketToken = async (
  token: string | null
): Promise<string | null> => {
  if (!token) {
    return null;
  }

  // Create a mock request with the token for getCurrentUserId
  const mockReq = new Request("http://localhost", {
    headers: { Authorization: `Bearer ${token}` },
  });
  return await getCurrentUserId(mockReq);
};

// Initialize Redis bridge for WebSocket events
await initializeRedisBridge();

const server = serve<WsClientData>({
  port,
  hostname: "0.0.0.0", // Bind to all network interfaces

  routes: {
    // Frontend SPA routes - HTML import bundles React app
    "/": index,
    "/login": index,
    "/auth/mobile": index,
    "/chat": index,
    "/chat/*": index,

    // Auth routes
    "/auth/callback": callbackHandler.GET,

    // Universal link configuration files
    "/.well-known/apple-app-site-association": () => {
      const file = Bun.file("./public/.well-known/apple-app-site-association");
      return new Response(file, {
        headers: { "Content-Type": "application/json" },
      });
    },

    // API routes - streaming and file uploads (kept as HTTP)
    "/api/chat": async (req: Request) => {
      const preflightResponse = handleCorsPreflight(req);
      if (preflightResponse) {
        return preflightResponse;
      }
      const response = await chatHandler.POST(req);
      return addCorsHeaders(req, response);
    },
    "/api/chat/:id/stream": async (
      req: Request & { params: { id: string } }
    ) => {
      const preflightResponse = handleCorsPreflight(req);
      if (preflightResponse) {
        return preflightResponse;
      }
      const response = await streamResumeHandler.GET(
        req as Request & { params: { id: string } }
      );
      return addCorsHeaders(req, response);
    },
    "/api/transcribe": async (req: Request) => {
      const preflightResponse = handleCorsPreflight(req);
      if (preflightResponse) {
        return preflightResponse;
      }
      const response = await transcribeHandler.POST(req);
      return addCorsHeaders(req, response);
    },

    // Health check endpoint
    "/health": () => Response.json({ status: "ok" }),

    // WebSocket upgrade route
    "/ws": async (req: Request, bunServer: Server<WsClientData>) => {
      const preflightResponse = handleCorsPreflight(req);
      if (preflightResponse) {
        return preflightResponse;
      }

      const token = extractTokenFromRequest(req);
      const userId = await validateWebSocketToken(token);

      if (!userId) {
        return new Response("Unauthorized", { status: 401 });
      }

      // Upgrade to WebSocket
      const success = bunServer.upgrade(req, {
        data: { userId } satisfies WsClientData,
      });

      if (!success) {
        return new Response("WebSocket upgrade failed", { status: 400 });
      }

      // Return undefined to indicate upgrade handled
      return;
    },

    // oRPC routes
    "/rpc/*": async (req: Request) => {
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
    "/public/*": (req: Request) => {
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

  // WebSocket handler
  websocket: {
    async open(wsConnection: ServerWebSocket<WsClientData>) {
      const userId = wsConnection.data.userId;
      await addConnection(userId, wsConnection);
      // console.log(`[WS] Client connected: user ${userId}`);
    },
    async close(wsConnection: ServerWebSocket<WsClientData>) {
      const userId = wsConnection.data.userId;
      await removeConnection(userId, wsConnection);
      // console.log(`[WS] Client disconnected: user ${userId}`);
    },
    message(
      wsConnection: ServerWebSocket<WsClientData>,
      message: string | Buffer
    ) {
      // Handle ping/pong for keepalive
      try {
        const data =
          typeof message === "string"
            ? JSON.parse(message)
            : JSON.parse(message.toString());
        if (data.type === "ping") {
          wsConnection.send(JSON.stringify({ type: "pong" }));
        }
      } catch {
        // Ignore invalid messages
      }
    },
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

/**
 * Log server URLs for easy access
 */
const logServerUrls = () => {
  console.log(`🚀 Server running at ${server.url}`);

  if (!isProduction) {
    const localIPs = getLocalNetworkIPs();
    if (localIPs.length > 0) {
      console.log("\n📱 Access from other devices on your network:");
      for (const ip of localIPs) {
        console.log(`   http://${ip}:${port}`);
      }
    }
  }
};

logServerUrls();
