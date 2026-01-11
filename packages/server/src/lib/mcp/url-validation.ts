/**
 * URL validation for MCP servers
 * Blocks internal networks, localhost, and enforces HTTPS in production
 */

import { lookup } from "node:dns/promises";

/**
 * Result of URL validation
 */
export type UrlValidationResult =
  | { valid: true }
  | { valid: false; reason: string };

/**
 * Checks if an IP address is in a private range
 */
// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: is ok here
const isPrivateIp = (ip: string): boolean => {
  // IPv4 private ranges
  if (ip.includes(".")) {
    const parts = ip.split(".").map(Number);
    if (parts.length !== 4) {
      return false;
    }

    // 10.0.0.0/8
    if (parts[0] === 10) {
      return true;
    }

    // 192.168.0.0/16
    if (parts[0] === 192 && parts[1] === 168) {
      return true;
    }

    // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) {
      return true;
    }

    // 127.0.0.0/8 (localhost)
    if (parts[0] === 127) {
      return true;
    }

    // 169.254.0.0/16 (link-local)
    if (parts[0] === 169 && parts[1] === 254) {
      return true;
    }

    // 0.0.0.0
    if (parts.every((p) => p === 0)) {
      return true;
    }
  }

  // IPv6 private/local ranges
  if (ip.includes(":")) {
    // ::1 (localhost)
    if (ip === "::1" || ip === "[::1]") {
      return true;
    }

    // :: (unspecified)
    if (ip === "::" || ip === "[::]") {
      return true;
    }

    // fe80::/10 (link-local)
    if (ip.startsWith("fe80:") || ip.startsWith("[fe80:")) {
      return true;
    }

    // fc00::/7 (unique local)
    if (ip.startsWith("fc") || ip.startsWith("fd")) {
      return true;
    }
  }

  return false;
};

/**
 * Validates MCP server URL for security
 * Blocks internal networks, localhost, and requires HTTPS in production
 * @param url - The URL to validate
 * @returns Validation result with reason if invalid
 */
export const validateMcpUrl = async (
  url: string
): Promise<UrlValidationResult> => {
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return { valid: false, reason: "Invalid URL format" };
  }

  const hostname = parsedUrl.hostname;

  // Block localhost and related
  if (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "[::]" ||
    hostname === "[::1]"
  ) {
    return {
      valid: false,
      reason: "Localhost and internal addresses are not allowed",
    };
  }

  // Block Railway internal network
  if (hostname.endsWith(".railway.internal")) {
    return {
      valid: false,
      reason: "Railway internal network addresses are not allowed",
    };
  }

  // Require HTTPS in production
  if (
    process.env.NODE_ENV === "production" &&
    parsedUrl.protocol !== "https:"
  ) {
    return {
      valid: false,
      reason: "HTTPS is required in production",
    };
  }

  // Resolve hostname to IP and check for private ranges
  try {
    const addresses = await lookup(hostname, { all: true });
    for (const addr of addresses) {
      const ip = addr.address;
      if (isPrivateIp(ip)) {
        return {
          valid: false,
          reason: `Hostname resolves to private IP address: ${ip}`,
        };
      }
    }
  } catch (error) {
    // DNS lookup failed - could be invalid hostname or network issue
    // Allow it through but log warning (might be temporary DNS issue)
    console.warn(`[MCP] DNS lookup failed for ${hostname}:`, error);
    // Don't block on DNS failures - could be temporary
  }

  return { valid: true };
};
