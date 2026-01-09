import { z } from "zod";

/** Subscription tier enum */
export const tierSchema = z.enum(["free", "hobby", "pro", "unlimited"]);

/** Usage response schema */
export const usageResponseSchema = z.object({
  tier: tierSchema,
  count: z.number(),
  /** Generation limit (null = unlimited) */
  limit: z.number().nullable(),
  allowed: z.boolean(),
  /** First day of next month (when usage resets) */
  resetsAt: z.string(),
});

export type Tier = z.infer<typeof tierSchema>;
export type UsageResponse = z.infer<typeof usageResponseSchema>;

/** Portal session response schema */
export const portalSessionResponseSchema = z.object({
  url: z.string(),
});

export type PortalSessionResponse = z.infer<typeof portalSessionResponseSchema>;
