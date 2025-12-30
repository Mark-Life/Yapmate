const httpToWsRegex = /^http:/;
const httpsToWssRegex = /^https:/;

/**
 * Generates API URL for chat endpoints
 * Handles development (localhost) and production (EXPO_PUBLIC_API_URL) environments
 */
export const generateAPIUrl = (relativePath: string): string => {
  const path = relativePath.startsWith("/") ? relativePath : `/${relativePath}`;

  // if (process.env.NODE_ENV === "development") {
  //   // In development, use localhost
  //   return `http://localhost:3000${path}`;
  // }

  // In production, use EXPO_PUBLIC_API_URL
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error("EXPO_PUBLIC_API_URL environment variable is not defined");
  }

  return `${apiUrl}${path}`;
};

/**
 * Generates WebSocket URL for real-time sync
 * Converts HTTP/HTTPS URL to WS/WSS
 */
export const generateWebSocketUrl = (): string => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  if (!apiUrl) {
    throw new Error("EXPO_PUBLIC_API_URL environment variable is not defined");
  }

  // Convert http:// to ws:// and https:// to wss://
  const wsUrl = apiUrl
    .replace(httpToWsRegex, "ws:")
    .replace(httpsToWssRegex, "wss:");
  return `${wsUrl}/ws`;
};
