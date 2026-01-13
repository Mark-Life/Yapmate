/**
 * Redis-based invite system for multi-user chats
 * Stores invite codes with TTL for secure, expiring invitations
 */
import { redis } from "./client";

const INVITE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export type InviteData = {
  chatId: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
};

/**
 * Generates a secure random invite code
 */
const generateInviteCode = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
};

/**
 * Creates an invite code for a chat
 * @param chatId - ID of the chat to invite to
 * @param createdBy - User ID of the person creating the invite
 * @returns The generated invite code
 */
export const createInvite = async (
  chatId: string,
  createdBy: string
): Promise<string> => {
  const code = generateInviteCode();
  const now = Date.now();
  const data: InviteData = {
    chatId,
    createdBy,
    createdAt: now,
    expiresAt: now + INVITE_TTL_SECONDS * 1000,
  };

  const key = `chat:${chatId}:invite:${code}`;
  await redis.set(key, JSON.stringify(data), "EX", INVITE_TTL_SECONDS);

  return code;
};

/**
 * Validates an invite code and returns the invite data
 * @param chatId - ID of the chat (for key lookup)
 * @param code - The invite code to validate
 * @returns Invite data if valid, null if invalid or expired
 */
export const validateInvite = async (
  chatId: string,
  code: string
): Promise<InviteData | null> => {
  const key = `chat:${chatId}:invite:${code}`;
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  try {
    const parsed = JSON.parse(data) as InviteData;

    // Double-check expiration (Redis TTL should handle this, but be safe)
    if (parsed.expiresAt < Date.now()) {
      await redis.del(key);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

/**
 * Revokes an invite code
 * @param chatId - ID of the chat
 * @param code - The invite code to revoke
 */
export const revokeInvite = async (
  chatId: string,
  code: string
): Promise<void> => {
  const key = `chat:${chatId}:invite:${code}`;
  await redis.del(key);
};

/**
 * Gets all active invites for a chat
 * @param chatId - ID of the chat
 * @returns Array of invite codes with their data
 */
export const getActiveInvites = async (
  chatId: string
): Promise<Array<{ code: string } & InviteData>> => {
  const pattern = `chat:${chatId}:invite:*`;
  const keys = await redis.keys(pattern);

  const invites: Array<{ code: string } & InviteData> = [];

  for (const key of keys) {
    const data = await redis.get(key);
    if (data) {
      try {
        const parsed = JSON.parse(data) as InviteData;
        // Only include non-expired invites
        if (parsed.expiresAt > Date.now()) {
          // Extract code from key: chat:{chatId}:invite:{code}
          const code = key.split(":").pop();
          if (!code) {
            continue;
          }
          invites.push({ code, ...parsed });
        }
      } catch {
        // Skip invalid entries
      }
    }
  }

  return invites;
};

/**
 * Validates an invite code without knowing the chatId
 * Searches for the invite by code pattern
 * Note: This is less efficient, use validateInvite when chatId is known
 * @param code - The invite code to validate
 * @returns Invite data with chatId if valid, null if invalid
 */
export const validateInviteByCode = async (
  code: string
): Promise<InviteData | null> => {
  // Search for the invite key pattern
  const pattern = `chat:*:invite:${code}`;
  const keys = await redis.keys(pattern);

  if (keys.length === 0) {
    return null;
  }

  // Get the first matching key's data
  const key = keys[0];
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  try {
    const parsed = JSON.parse(data) as InviteData;

    // Double-check expiration
    if (parsed.expiresAt < Date.now()) {
      await redis.del(key);
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};
