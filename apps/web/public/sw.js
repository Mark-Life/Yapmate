/**
 * Service Worker for Yapmate PWA
 * Implements cache-first strategy for static assets and network-first for HTML
 */

// Cache version - updated at build time to force cache invalidation
// This will be replaced with a timestamp-based version during build
const CACHE_VERSION = "v1";
const CACHE_NAME = `yapmate-${CACHE_VERSION}`;
const RUNTIME_CACHE = `yapmate-runtime-${CACHE_VERSION}`;

/**
 * List of static assets to pre-cache on install
 * These will be populated at build time or fetched dynamically
 */
const PRECACHE_URLS = ["/", "/index.html"];

/**
 * Install event - pre-cache app shell
 * Note: We don't call skipWaiting() immediately to allow update detection
 */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) =>
        cache.addAll(PRECACHE_URLS).catch((err) => {
          console.warn("Precache failed:", err);
        })
      )
      .then(() => {
        // Check if there are any active clients
        // If no clients, this is first install - activate immediately
        // Otherwise, wait for user to accept update
        return self.clients.matchAll().then((clients) => {
          if (clients.length === 0) {
            // First install - activate immediately
            self.skipWaiting();
          }
          // Otherwise, wait for SKIP_WAITING message from client
        });
      })
  );
});

/**
 * Activate event - clean up old caches
 */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== RUNTIME_CACHE)
            .map((name) => caches.delete(name))
        )
      )
      .then(() => self.clients.claim())
  );
});

/** Pattern to detect file extensions in URL paths */
const FILE_EXTENSION_PATTERN = /\.[a-zA-Z0-9]+$/;
/**
 * Fetch event - route requests by strategy
 */
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip cross-origin requests
  if (url.origin !== location.origin) {
    return;
  }

  // Network-only: Service worker and manifest must always be fresh
  if (
    url.pathname === "/sw.js" ||
    url.pathname.endsWith(".webmanifest") ||
    url.pathname.startsWith("/api/")
  ) {
    return;
  }

  // Check if this is a static asset (has file extension)
  const hasFileExtension = FILE_EXTENSION_PATTERN.test(url.pathname);

  // Network-first with cache fallback: HTML files (exclude static assets)
  if (
    !hasFileExtension &&
    (request.headers.get("accept")?.includes("text/html") ||
      url.pathname === "/" ||
      url.pathname === "/index.html")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const responseClone = response.clone();
            caches.open(RUNTIME_CACHE).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache if network fails
          return caches.match(request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Fallback to index.html for SPA routing
            return caches.match("/index.html");
          });
        })
    );
    return;
  }

  // Cache-first: Static assets (JS, CSS, images, fonts)
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }

      return fetch(request)
        .then((response) => {
          // Don't cache non-successful responses
          if (!response.ok) {
            return response;
          }

          const responseClone = response.clone();
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, responseClone);
          });

          return response;
        })
        .catch(() => {
          // Return a fallback for images if available
          if (request.headers.get("accept")?.includes("image")) {
            return new Response("", { status: 408, statusText: "Offline" });
          }
          throw new Error("Network request failed");
        });
    })
  );
});

/**
 * Listen for messages from client
 */
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") {
    self.skipWaiting();
  }

  // Notify clients when a new service worker is waiting
  if (event.data && event.data.type === "CHECK_UPDATE") {
    // Check if there's a waiting service worker
    self.registration.update().then(() => {
      if (self.registration.waiting) {
        // Notify all clients that an update is available
        self.clients.matchAll().then((clients) => {
          for (const client of clients) {
            client.postMessage({ type: "UPDATE_AVAILABLE" });
          }
        });
      }
    });
  }
});
