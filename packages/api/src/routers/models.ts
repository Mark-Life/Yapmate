import { getModels } from "@yapmate/server/lib/models/service";
import { publicProcedure } from "../middleware";

/**
 * Models router - operations for AI models
 */
export const models = {
  /**
   * List all available models
   */
  list: publicProcedure.handler(async () => {
    const modelList = await getModels();
    return { models: modelList };
  }),
};
