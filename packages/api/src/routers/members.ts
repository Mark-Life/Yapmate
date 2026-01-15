/**
 * Members router - operations for multi-user chat membership
 */
import { ORPCError } from "@orpc/server";
import {
  addChatMember,
  canAccessChat,
  getChat,
  getChatMembers,
  getChatMembership,
  getUserById,
  removeChatMember,
  updateMemberDisplayName,
} from "@yapmate/db/service";
import { validateInviteByCode } from "@yapmate/server/lib/redis/invite";
import {
  getOnlineMembers,
  publishChatEvent,
} from "@yapmate/server/lib/websocket";
import { protectedProcedure } from "../middleware";
import {
  joinChatInputSchema,
  joinChatOutputSchema,
  leaveChatInputSchema,
  listMembersInputSchema,
  listMembersOutputSchema,
  removeMemberInputSchema,
  updateDisplayNameInputSchema,
} from "../schemas/members";

export const members = {
  /**
   * Join a chat via invite code
   */
  join: protectedProcedure
    .input(joinChatInputSchema)
    .output(joinChatOutputSchema)
    .handler(async ({ input, context }) => {
      // Validate invite code
      const inviteData = await validateInviteByCode(input.inviteCode);
      if (!inviteData) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Invalid or expired invite",
        });
      }

      // Verify chatId matches the invite
      if (inviteData.chatId !== input.chatId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Invite code does not match this chat",
        });
      }

      // Check if user is already a member
      const existingMembership = await getChatMembership(
        input.chatId,
        context.userId
      );
      if (existingMembership) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Already a member of this chat",
        });
      }

      // Get chat and verify it exists and is multi-user
      const chat = await getChat(input.chatId);
      if (!chat) {
        throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
      }

      // Chat must be multi-user (invite creation enables this)
      if (!chat.isMultiUser) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Chat is not accepting members",
        });
      }

      // Determine display name
      const user = await getUserById(context.userId);
      let displayName = input.displayName?.trim();

      // If no display name provided, use firstName
      if (!displayName) {
        if (!user?.firstName) {
          throw new ORPCError("BAD_REQUEST", {
            message: "Display name required (no firstName on profile)",
          });
        }
        displayName = user.firstName;
      }

      // Add the new member
      await addChatMember(input.chatId, context.userId, displayName, "member");

      // Publish member_joined event
      await publishChatEvent(input.chatId, {
        type: "member_joined",
        chatId: input.chatId,
        userId: context.userId,
        displayName,
      });

      return {
        success: true,
        chatId: input.chatId,
        displayName,
      };
    }),

  /**
   * List all members of a chat with online status
   */
  list: protectedProcedure
    .input(listMembersInputSchema)
    .output(listMembersOutputSchema)
    .handler(async ({ input, context }) => {
      // Check if user has access to this chat
      const hasAccess = await canAccessChat(input.chatId, context.userId);
      if (!hasAccess) {
        throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
      }

      // Get chat info
      const chat = await getChat(input.chatId);
      if (!chat) {
        throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
      }

      // If not multi-user, just return the owner
      if (!chat.isMultiUser) {
        const owner = await getUserById(chat.userId);
        return {
          members: [
            {
              userId: chat.userId,
              displayName: owner?.firstName || "Owner",
              role: "owner" as const,
              isOnline: false, // Single-user chats don't track presence
            },
          ],
        };
      }

      // Get all members
      const chatMembers = await getChatMembers(input.chatId);

      // Get online status
      const onlineMembers = await getOnlineMembers(input.chatId);
      const onlineUserIds = new Set(onlineMembers.map((m) => m.userId));

      return {
        members: chatMembers.map((m) => ({
          userId: m.userId,
          displayName: m.displayName,
          role: m.role as "owner" | "member",
          isOnline: onlineUserIds.has(m.userId),
        })),
      };
    }),

  /**
   * Remove a member from a chat (owner only)
   * Cannot remove the owner
   */
  remove: protectedProcedure
    .input(removeMemberInputSchema)
    .handler(async ({ input, context }) => {
      const chat = await getChat(input.chatId);
      if (!chat) {
        throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
      }

      // Only owner can remove members
      if (chat.userId !== context.userId) {
        throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
      }

      // Cannot remove the owner
      if (input.userId === chat.userId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Cannot remove chat owner",
        });
      }

      // Get member info before removal (for the event)
      const membership = await getChatMembership(input.chatId, input.userId);
      if (!membership) {
        throw new ORPCError("NOT_FOUND", { message: "User is not a member" });
      }

      // Remove member
      const removed = await removeChatMember(input.chatId, input.userId);
      if (!removed) {
        throw new ORPCError("INTERNAL_SERVER_ERROR", {
          message: "Failed to remove member",
        });
      }

      // Publish member_left event
      await publishChatEvent(input.chatId, {
        type: "member_left",
        chatId: input.chatId,
        userId: input.userId,
        displayName: membership.displayName,
      });

      return { success: true };
    }),

  /**
   * Leave a chat (for members, not owner)
   */
  leave: protectedProcedure
    .input(leaveChatInputSchema)
    .handler(async ({ input, context }) => {
      const chat = await getChat(input.chatId);
      if (!chat) {
        throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
      }

      // Owner cannot leave (must delete chat instead)
      if (chat.userId === context.userId) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Owner cannot leave. Delete the chat instead.",
        });
      }

      // Get membership info
      const membership = await getChatMembership(input.chatId, context.userId);
      if (!membership) {
        throw new ORPCError("BAD_REQUEST", {
          message: "Not a member of this chat",
        });
      }

      // Remove self
      await removeChatMember(input.chatId, context.userId);

      // Publish member_left event
      await publishChatEvent(input.chatId, {
        type: "member_left",
        chatId: input.chatId,
        userId: context.userId,
        displayName: membership.displayName,
      });

      return { success: true };
    }),

  /**
   * Update own display name in a chat
   */
  updateDisplayName: protectedProcedure
    .input(updateDisplayNameInputSchema)
    .handler(async ({ input, context }) => {
      // Verify user is a member of this chat
      const membership = await getChatMembership(input.chatId, context.userId);
      if (!membership) {
        throw new ORPCError("FORBIDDEN", {
          message: "Not a member of this chat",
        });
      }

      // Update the display name
      await updateMemberDisplayName(
        input.chatId,
        context.userId,
        input.displayName
      );

      // Publish member_updated event to notify other users
      await publishChatEvent(input.chatId, {
        type: "member_updated",
        chatId: input.chatId,
        userId: context.userId,
        displayName: input.displayName,
      });

      return { success: true, displayName: input.displayName };
    }),
};
