/**
 * Members schemas for multi-user chat membership
 */
import { z } from "zod";

// ─── Input Schemas ───────────────────────────────────────────────────────────

/** Join a chat via invite code */
export const joinChatInputSchema = z.object({
  chatId: z.string().uuid(),
  inviteCode: z.string().min(1),
  displayName: z.string().min(1).max(50).optional(),
});

/** List members of a chat */
export const listMembersInputSchema = z.object({
  chatId: z.string().uuid(),
});

/** Remove a member from a chat */
export const removeMemberInputSchema = z.object({
  chatId: z.string().uuid(),
  userId: z.string().uuid(),
});

/** Leave a chat */
export const leaveChatInputSchema = z.object({
  chatId: z.string().uuid(),
});

/** Update display name in a chat */
export const updateDisplayNameInputSchema = z.object({
  chatId: z.string().uuid(),
  displayName: z.string().min(1).max(50),
});

// ─── Output Schemas ──────────────────────────────────────────────────────────

/** Single member info */
export const memberSchema = z.object({
  userId: z.string().uuid(),
  displayName: z.string(),
  role: z.enum(["owner", "member"]),
  isOnline: z.boolean(),
});

/** Join chat response */
export const joinChatOutputSchema = z.object({
  success: z.boolean(),
  chatId: z.string().uuid(),
  displayName: z.string(),
});

/** List members response */
export const listMembersOutputSchema = z.object({
  members: z.array(memberSchema),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type JoinChatInput = z.infer<typeof joinChatInputSchema>;
export type ListMembersInput = z.infer<typeof listMembersInputSchema>;
export type RemoveMemberInput = z.infer<typeof removeMemberInputSchema>;
export type LeaveChatInput = z.infer<typeof leaveChatInputSchema>;
export type UpdateDisplayNameInput = z.infer<
  typeof updateDisplayNameInputSchema
>;
export type Member = z.infer<typeof memberSchema>;
export type JoinChatOutput = z.infer<typeof joinChatOutputSchema>;
export type ListMembersOutput = z.infer<typeof listMembersOutputSchema>;
