/**
 * Chat members service - operations for multi-user chat membership
 */
import { and, eq, ne } from "drizzle-orm";
import { db } from "../client";
import {
  type ChatMemberInsert,
  type ChatMemberSelect,
  chatMembers,
  type MemberRole,
} from "../schema/chat-members";
import { chats } from "../schema/chats";

// ─── Read Operations ─────────────────────────────────────────────────────────

/**
 * Gets a user's membership in a chat
 * @param chatId - ID of the chat
 * @param userId - ID of the user
 * @returns Membership record or null if not a member
 */
export const getChatMembership = async (
  chatId: string,
  userId: string
): Promise<ChatMemberSelect | null> => {
  const result = await db
    .select()
    .from(chatMembers)
    .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)))
    .limit(1);
  return result[0] ?? null;
};

/**
 * Gets all members of a chat
 * @param chatId - ID of the chat
 */
export const getChatMembers = async (
  chatId: string
): Promise<ChatMemberSelect[]> =>
  db.select().from(chatMembers).where(eq(chatMembers.chatId, chatId));

/**
 * Gets a map of userId -> displayName for all members of a chat
 * Used when formatting messages for the model
 * @param chatId - ID of the chat
 */
export const getChatMemberNames = async (
  chatId: string
): Promise<Map<string, string>> => {
  const members = await db
    .select({
      userId: chatMembers.userId,
      displayName: chatMembers.displayName,
    })
    .from(chatMembers)
    .where(eq(chatMembers.chatId, chatId));

  return new Map(members.map((m) => [m.userId, m.displayName]));
};

/**
 * Checks if a user has access to a chat (either as owner or member)
 * @param chatId - ID of the chat
 * @param userId - ID of the user
 * @returns true if user can access the chat
 */
export const canAccessChat = async (
  chatId: string,
  userId: string
): Promise<boolean> => {
  // Admin bypass - only in dev, only for specific admin user
  const ADMIN_USER_ID = "9744dbb6-96c1-4607-8c7f-b4e33738cbfe";
  const isDevAdmin =
    process.env.NODE_ENV !== "production" && userId === ADMIN_USER_ID;
  if (isDevAdmin) {
    return true;
  }

  // First check if user is the chat owner (single-user chat)
  const chat = await db
    .select({ userId: chats.userId, isMultiUser: chats.isMultiUser })
    .from(chats)
    .where(eq(chats.id, chatId))
    .limit(1);

  if (chat.length === 0) {
    return false;
  }

  // Owner always has access
  if (chat[0].userId === userId) {
    return true;
  }

  // For multi-user chats, check membership
  if (chat[0].isMultiUser) {
    const membership = await getChatMembership(chatId, userId);
    return membership !== null;
  }

  return false;
};

// ─── Write Operations ────────────────────────────────────────────────────────

/**
 * Adds a member to a chat
 * @param chatId - ID of the chat
 * @param userId - ID of the user to add
 * @param displayName - Display name for the user in this chat
 * @param role - Role (owner or member), defaults to member
 */
export const addChatMember = async (
  chatId: string,
  userId: string,
  displayName: string,
  role: MemberRole = "member"
): Promise<ChatMemberSelect> => {
  const values: ChatMemberInsert = {
    chatId,
    userId,
    displayName,
    role,
  };

  const result = await db.insert(chatMembers).values(values).returning();
  return result[0];
};

/**
 * Removes a member from a chat
 * Cannot remove the owner
 * @param chatId - ID of the chat
 * @param userId - ID of the user to remove
 * @returns true if member was removed, false if not found or is owner
 */
export const removeChatMember = async (
  chatId: string,
  userId: string
): Promise<boolean> => {
  const result = await db
    .delete(chatMembers)
    .where(
      and(
        eq(chatMembers.chatId, chatId),
        eq(chatMembers.userId, userId),
        ne(chatMembers.role, "owner")
      )
    )
    .returning({ id: chatMembers.id });

  return result.length > 0;
};

/**
 * Updates a member's display name in a chat
 * @param chatId - ID of the chat
 * @param userId - ID of the user
 * @param displayName - New display name
 */
export const updateMemberDisplayName = async (
  chatId: string,
  userId: string,
  displayName: string
): Promise<void> => {
  await db
    .update(chatMembers)
    .set({ displayName, updatedAt: new Date() })
    .where(and(eq(chatMembers.chatId, chatId), eq(chatMembers.userId, userId)));
};

/**
 * Enables multi-user mode for a chat and adds the owner as a member
 * @param chatId - ID of the chat
 * @param ownerUserId - ID of the chat owner
 * @param ownerDisplayName - Display name for the owner
 */
export const enableMultiUserChat = async (
  chatId: string,
  ownerUserId: string,
  ownerDisplayName: string
): Promise<void> => {
  await db.transaction(async (tx) => {
    // Set isMultiUser flag
    await tx
      .update(chats)
      .set({ isMultiUser: true, updatedAt: new Date() })
      .where(eq(chats.id, chatId));

    // Add owner as first member
    await tx.insert(chatMembers).values({
      chatId,
      userId: ownerUserId,
      displayName: ownerDisplayName,
      role: "owner",
    });
  });
};
