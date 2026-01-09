/**
 * Feedback service - handles feedback CRUD operations
 */
import { db } from "../client";
import {
  type FeedbackContext,
  type FeedbackInsert,
  feedback,
} from "../schema/feedback";

/**
 * Creates a new feedback entry
 */
export const createFeedback = async (
  userId: string,
  category: FeedbackInsert["category"],
  message: string,
  context?: FeedbackContext
): Promise<string> => {
  const [result] = await db
    .insert(feedback)
    .values({
      userId,
      category,
      message,
      context,
    })
    .returning({ id: feedback.id });

  return result.id;
};
