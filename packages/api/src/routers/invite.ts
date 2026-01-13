/**
 * Invite router - operations for multi-user chat invitations
 */
import { ORPCError } from "@orpc/server";
import {
  canAccessChat,
  enableMultiUserChat,
  getChat,
  getChatMembers,
  getUserById,
} from "@yapmate/db/service";
import {
  createInvite,
  getActiveInvites,
  revokeInvite,
  validateInviteByCode,
} from "@yapmate/server/lib/redis/invite";
import { protectedProcedure } from "../middleware";
import {
  createInviteInputSchema,
  createInviteOutputSchema,
  listInvitesInputSchema,
  listInvitesOutputSchema,
  revokeInviteInputSchema,
  validateInviteInputSchema,
  validateInviteOutputSchema,
} from "../schemas/invite";

export const invite = {
  /**
   * Create a new invite link for a chat
   * Only chat owner can create invites
   * If chat is not yet multi-user, enables it with owner as first member
   */
  create: protectedProcedure
    .input(createInviteInputSchema)
    .output(createInviteOutputSchema)
    .handler(async ({ input, context }) => {
      const chat = await getChat(input.chatId);
      if (!chat) {
        throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
      }

      // Only owner can create invites
      if (chat.userId !== context.userId) {
        throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
      }

      // If chat is not yet multi-user, enable it now
      if (!chat.isMultiUser) {
        const owner = await getUserById(context.userId);
        let ownerDisplayName = input.ownerDisplayName?.trim();

        // If no display name provided, try to use firstName
        if (!ownerDisplayName) {
          if (!owner?.firstName) {
            // Need owner to provide display name
            return { needsOwnerDisplayName: true };
          }
          ownerDisplayName = owner.firstName;
        }

        // Enable multi-user mode and add owner as first member
        await enableMultiUserChat(input.chatId, context.userId, ownerDisplayName);
      }

      const code = await createInvite(input.chatId, context.userId);

      return {
        code,
        expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };
    }),

  /**
   * List all active invites for a chat
   * Only chat owner can view invites (returns empty for non-owners)
   */
  list: protectedProcedure
    .input(listInvitesInputSchema)
    .output(listInvitesOutputSchema)
    .handler(async ({ input, context }) => {
      const chat = await getChat(input.chatId);
      if (!chat) {
        throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
      }

      // Only owner can list invites - return empty for non-owners
      if (chat.userId !== context.userId) {
        return { invites: [] };
      }

      const invites = await getActiveInvites(input.chatId);

      return {
        invites: invites.map((inv) => ({
          code: inv.code,
          createdAt: inv.createdAt,
          expiresAt: inv.expiresAt,
        })),
      };
    }),

  /**
   * Revoke an invite code
   * Only chat owner can revoke invites
   */
  revoke: protectedProcedure
    .input(revokeInviteInputSchema)
    .handler(async ({ input, context }) => {
      const chat = await getChat(input.chatId);
      if (!chat) {
        throw new ORPCError("NOT_FOUND", { message: "Chat not found" });
      }

      // Only owner can revoke invites
      if (chat.userId !== context.userId) {
        throw new ORPCError("FORBIDDEN", { message: "Forbidden" });
      }

      await revokeInvite(input.chatId, input.code);

      return { success: true };
    }),

  /**
   * Validate an invite code and get chat info for join page
   * Returns chat title, member names, and whether user needs to provide displayName
   */
  validate: protectedProcedure
    .input(validateInviteInputSchema)
    .output(validateInviteOutputSchema)
    .handler(async ({ input, context }) => {
      const inviteData = await validateInviteByCode(input.code);
      if (!inviteData) {
        return { valid: false, error: "Invalid or expired invite" };
      }

      const chat = await getChat(inviteData.chatId);
      if (!chat) {
        return { valid: false, error: "Chat not found" };
      }

      // Get current user to check if they need to provide displayName
      const user = await getUserById(context.userId);
      const needsDisplayName = !user?.firstName;

      // Get member display names
      let memberNames: string[] = [];
      if (chat.isMultiUser) {
        const members = await getChatMembers(inviteData.chatId);
        memberNames = members.map((m) => m.displayName);
      } else {
        // Single-user chat - get owner's name
        const owner = await getUserById(chat.userId);
        if (owner?.firstName) {
          memberNames = [owner.firstName];
        }
      }

      // Check if user is already a member
      const alreadyMember = await canAccessChat(
        inviteData.chatId,
        context.userId
      );

      return {
        valid: true,
        chatId: inviteData.chatId,
        chatTitle: chat.title || "Untitled Chat",
        memberNames,
        needsDisplayName,
        defaultDisplayName: user?.firstName || "",
        alreadyMember,
      };
    }),
};
