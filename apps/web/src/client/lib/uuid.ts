/**
 * UUID v4 generator with fallback for non-secure (HTTP) contexts.
 * Used for local development when accessing via HTTP instead of HTTPS,
 * where crypto.randomUUID() is unavailable.
 */
export const generateUUID = (): string => {
  if (typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  // Fallback: generate UUID v4 using crypto.getRandomValues
  const bytes = crypto.getRandomValues(new Uint8Array(16));

  // Set version (4) and variant (RFC4122) bits
  bytes[6] = (bytes[6] % 16) + 64; // version 4: 0100xxxx
  bytes[8] = (bytes[8] % 64) + 128; // variant: 10xxxxxx

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    ""
  );

  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
};
