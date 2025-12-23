import { z } from "zod";

/**
 * Models response schema
 */
export const modelsResponseSchema = z.object({
  models: z.array(z.string()),
});

export type ModelsResponse = z.infer<typeof modelsResponseSchema>;
