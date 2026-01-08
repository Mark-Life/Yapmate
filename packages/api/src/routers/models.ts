import { getAllModelsMetadata } from "@yapmate/server/lib/models/service";
import { publicProcedure } from "../middleware";

/**
 * Models router - operations for AI models
 */
export const models = {
  /**
   * List all available models with metadata
   */
  list: publicProcedure.handler(async () => {
    const modelsMetadata = await getAllModelsMetadata();
    return {
      models: Object.entries(modelsMetadata).map(([id, metadata]) => ({
        id,
        name: metadata.name,
        description: metadata.description,
        contextLimit: metadata.contextLength,
        inputLimit: metadata.inputLimit,
        outputLimit: metadata.outputLimit,
        supportsTools: metadata.supportsTools,
        supportsReasoning: metadata.supportsReasoning,
      })),
    };
  }),
};
