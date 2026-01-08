/**
 * Subscription router - subscription and usage operations
 */
import { checkMessageLimit } from "@yapmate/db/service";
import { protectedProcedure } from "../middleware";
import { usageResponseSchema } from "../schemas/subscription";

/**
 * Calculates the first day of next month (when usage resets)
 */
const getResetDate = (): string => {
  const now = new Date();
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  return nextMonth.toISOString();
};

/**
 * Subscription router - usage and subscription management
 */
export const subscription = {
  /**
   * Get current user's subscription usage
   * Returns tier, message count, limit, and reset date
   */
  usage: protectedProcedure
    .output(usageResponseSchema)
    .handler(async ({ context }) => {
      const result = await checkMessageLimit(context.userId);
      return {
        ...result,
        // Convert Infinity to null for JSON serialization
        limit: Number.isFinite(result.limit) ? result.limit : null,
        resetsAt: getResetDate(),
      };
    }),
};
