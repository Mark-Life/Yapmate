import { z } from "zod";

/**
 * Magic link input schema
 */
export const magicLinkInputSchema = z.object({
  email: z.email(),
});

/**
 * Magic link response schema - discriminated union for better type narrowing
 */
export const magicLinkResponseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true) }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type MagicLinkInput = z.infer<typeof magicLinkInputSchema>;
export type MagicLinkResponse = z.infer<typeof magicLinkResponseSchema>;
