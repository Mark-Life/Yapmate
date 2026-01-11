/**
 * Patched Supermemory tools for AI SDK v6
 *
 * The official @supermemory/tools package has schema issues with OpenAI's strict mode:
 * - Optional params not in `required` array causes 400 errors
 * - Type mismatch with AI SDK v6
 *
 * This module reimplements tools with all properties required.
 * @see https://github.com/supermemoryai/supermemory/issues/664
 */

import { tool } from "ai";
import Supermemory from "supermemory";
import { z } from "zod";

type SupermemoryToolsConfig = {
  containerTags?: string[];
  baseUrl?: string;
};

const DEFAULT_INCLUDE_FULL_DOCS = true;
const DEFAULT_LIMIT = 10;
const DEFAULT_CHUNK_THRESHOLD = 0.3;

const searchMemoriesInputSchema = z.object({
  informationToGet: z
    .string()
    .describe("What information to search for in memories"),
  includeFullDocs: z
    .boolean()
    .describe(
      `Whether to include full document content in results. Default: ${DEFAULT_INCLUDE_FULL_DOCS}`
    ),
  limit: z
    .number()
    .describe(
      `Maximum number of results to return (1-50). Default: ${DEFAULT_LIMIT}`
    ),
});

/**
 * Creates a search memories tool for AI SDK v6
 * All parameters are required to satisfy OpenAI strict schema validation
 */
export const searchMemoriesTool = (
  apiKey: string,
  config?: SupermemoryToolsConfig
) => {
  const client = new Supermemory({
    apiKey,
    ...(config?.baseUrl ? { baseURL: config.baseUrl } : {}),
  });

  const containerTags = config?.containerTags ?? [];

  return tool({
    description:
      "Search through stored memories to find relevant information about the user or past conversations",
    inputSchema: searchMemoriesInputSchema,
    needsApproval: true,
    execute: async ({
      informationToGet,
      includeFullDocs,
      limit,
    }: z.infer<typeof searchMemoriesInputSchema>) => {
      try {
        const response = await client.search.execute({
          q: informationToGet,
          containerTags,
          limit: limit || DEFAULT_LIMIT,
          chunkThreshold: DEFAULT_CHUNK_THRESHOLD,
          includeFullDocs: includeFullDocs ?? DEFAULT_INCLUDE_FULL_DOCS,
        });

        return {
          success: true,
          results: response.results,
          count: response.results?.length || 0,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  });
};

const addMemoryInputSchema = z.object({
  memory: z
    .string()
    .describe(
      "The information to save to memory (be specific, clear and concise)"
    ),
});

/**
 * Creates an add memory tool for AI SDK v6
 */
export const addMemoryTool = (
  apiKey: string,
  config?: SupermemoryToolsConfig
) => {
  const client = new Supermemory({
    apiKey,
    ...(config?.baseUrl ? { baseURL: config.baseUrl } : {}),
  });

  const containerTags = config?.containerTags ?? [];

  return tool({
    description:
      "Save important information about the user to memory for future reference. Use this to remember preferences, facts, or context shared by the user.",
    inputSchema: addMemoryInputSchema,
    needsApproval: true,
    execute: async ({ memory }: z.infer<typeof addMemoryInputSchema>) => {
      try {
        const response = await client.memories.add({
          content: memory,
          containerTags,
        });

        return {
          success: true,
          memory: response,
        };
      } catch (error) {
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
  });
};
