import { getAllModelsMetadata } from "@yapmate/server/lib/models/service";
import { publicProcedure } from "../middleware";

/**
 * Models router - operations for AI models
 */
export const models = {
  /**
   * List all available models with metadata (including context limits)
   */
  list: publicProcedure.handler(async () => {
    const modelsMetadata = await getAllModelsMetadata();
    // Return model IDs with their metadata (including limit.context)
    return {
      models: Object.entries(modelsMetadata).map(([id, metadata]) => ({
        id,
        name: metadata.name,
        contextLimit: metadata.limit.context,
        inputLimit: metadata.limit.input,
        outputLimit: metadata.limit.output,
      })),
    };
  }),
};
