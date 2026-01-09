import { getUserSettings, updateUserSettings } from "@yapmate/db/service";
import { protectedProcedure } from "../middleware";
import {
  getSettingsResponseSchema,
  updateSettingsInputSchema,
  updateSettingsResponseSchema,
} from "../schemas/settings";

/**
 * Settings router - user settings operations
 */
export const settings = {
  /**
   * Get user settings
   */
  get: protectedProcedure
    .output(getSettingsResponseSchema)
    .handler(async ({ context }) => {
      if (!context.userId) {
        throw new Error("User ID not available");
      }

      const userSettings = await getUserSettings(context.userId);
      return userSettings;
    }),

  /**
   * Update user settings
   */
  update: protectedProcedure
    .input(updateSettingsInputSchema)
    .output(updateSettingsResponseSchema)
    .handler(async ({ input, context }) => {
      if (!context.userId) {
        return {
          success: false,
          error: "User ID not available",
        };
      }

      try {
        await updateUserSettings(context.userId, {
          hideEmailInUi: input.hideEmailInUi,
        });
        return { success: true };
      } catch (error) {
        return {
          success: false,
          error:
            error instanceof Error
              ? error.message
              : "Failed to update settings",
        };
      }
    }),
};
