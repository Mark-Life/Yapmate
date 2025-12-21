/**
 * Models API route handler
 * Handles GET for /api/models
 * Returns cached models list from models.dev via server-side caching
 */
import { getModels } from "@/lib/models-service";

export const modelsHandler = {
  async GET() {
    try {
      const models = await getModels();
      return Response.json({ models });
    } catch (error) {
      console.error("Failed to fetch models:", error);
      return Response.json(
        { error: "Failed to fetch models" },
        { status: 500 }
      );
    }
  },
};
