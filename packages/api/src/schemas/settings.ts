import { z } from "zod";

/**
 * Get settings response schema
 */
export const getSettingsResponseSchema = z.object({
  hideEmailInUi: z.boolean(),
});

export type GetSettingsResponse = z.infer<typeof getSettingsResponseSchema>;

/**
 * Update settings input schema
 */
export const updateSettingsInputSchema = z.object({
  hideEmailInUi: z.boolean(),
});

export type UpdateSettingsInput = z.infer<typeof updateSettingsInputSchema>;

/**
 * Update settings response schema - discriminated union for better type narrowing
 */
export const updateSettingsResponseSchema = z.discriminatedUnion("success", [
  z.object({ success: z.literal(true) }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type UpdateSettingsResponse = z.infer<
  typeof updateSettingsResponseSchema
>;
