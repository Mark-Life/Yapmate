/**
 * Feedback API schemas
 */
import { z } from "zod";

/**
 * Feedback category enum values
 */
export const feedbackCategoryValues = ["bug", "feature", "general"] as const;
export type FeedbackCategory = (typeof feedbackCategoryValues)[number];

/**
 * Context schema for feedback submission
 */
export const feedbackContextSchema = z.object({
  chatId: z.uuid().optional(),
  url: z.string().optional(),
  userAgent: z.string().optional(),
});

export type FeedbackContextInput = z.infer<typeof feedbackContextSchema>;

/**
 * Create feedback input schema
 */
export const createFeedbackInputSchema = z.object({
  category: z.enum(feedbackCategoryValues),
  message: z.string().min(10, "Feedback must be at least 10 characters"),
  context: feedbackContextSchema.optional(),
});

export type CreateFeedbackInput = z.infer<typeof createFeedbackInputSchema>;
