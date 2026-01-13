/**
 * Invite schemas for multi-user chat invitations
 */
import { z } from "zod";

// ─── Input Schemas ───────────────────────────────────────────────────────────

/** Create a new invite for a chat */
export const createInviteInputSchema = z.object({
  chatId: z.string().uuid(),
});

/** List active invites for a chat */
export const listInvitesInputSchema = z.object({
  chatId: z.string().uuid(),
});

/** Revoke an invite */
export const revokeInviteInputSchema = z.object({
  chatId: z.string().uuid(),
  code: z.string().min(1),
});

/** Validate an invite code (for join page) */
export const validateInviteInputSchema = z.object({
  code: z.string().min(1),
});

// ─── Output Schemas ──────────────────────────────────────────────────────────

/** Single invite info */
export const inviteSchema = z.object({
  code: z.string(),
  createdAt: z.number(),
  expiresAt: z.number(),
});

/** Create invite response */
export const createInviteOutputSchema = z.object({
  code: z.string(),
  expiresAt: z.number(),
});

/** List invites response */
export const listInvitesOutputSchema = z.object({
  invites: z.array(inviteSchema),
});

/** Validate invite response */
export const validateInviteOutputSchema = z.object({
  valid: z.boolean(),
  chatId: z.string().uuid().optional(),
  chatTitle: z.string().optional(),
  memberNames: z.array(z.string()).optional(),
  needsDisplayName: z.boolean().optional(),
  defaultDisplayName: z.string().optional(),
  alreadyMember: z.boolean().optional(),
  error: z.string().optional(),
});

// ─── Types ───────────────────────────────────────────────────────────────────

export type CreateInviteInput = z.infer<typeof createInviteInputSchema>;
export type ListInvitesInput = z.infer<typeof listInvitesInputSchema>;
export type RevokeInviteInput = z.infer<typeof revokeInviteInputSchema>;
export type ValidateInviteInput = z.infer<typeof validateInviteInputSchema>;
export type Invite = z.infer<typeof inviteSchema>;
export type CreateInviteOutput = z.infer<typeof createInviteOutputSchema>;
export type ListInvitesOutput = z.infer<typeof listInvitesOutputSchema>;
export type ValidateInviteOutput = z.infer<typeof validateInviteOutputSchema>;
