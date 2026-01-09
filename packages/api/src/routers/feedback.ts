/**
 * Feedback router - handles user feedback submissions
 */
import { createFeedback } from "@yapmate/db/service";
import { protectedProcedure } from "../middleware";
import { createFeedbackInputSchema } from "../schemas/feedback";

export const feedback = {
  /**
   * Submit new feedback
   */
  create: protectedProcedure
    .input(createFeedbackInputSchema)
    .handler(async ({ input, context }) => {
      const feedbackId = await createFeedback(
        context.userId,
        input.category,
        input.message,
        input.context
      );

      return { id: feedbackId };
    }),
};
