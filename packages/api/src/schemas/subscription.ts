import { z } from "zod";

/** Subscription tier enum */
export const tierSchema = z.enum(["free", "hobby", "pro", "unlimited"]);

/** Usage response schema */
export const usageResponseSchema = z.object({
  tier: tierSchema,
  count: z.number(),
  /** Message limit (null = unlimited) */
  limit: z.number().nullable(),
  allowed: z.boolean(),
  /** First day of next month (when usage resets) */
  resetsAt: z.string(),
});

export type Tier = z.infer<typeof tierSchema>;
export type UsageResponse = z.infer<typeof usageResponseSchema>;
