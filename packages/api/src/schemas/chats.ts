/**
 * Re-export chat schemas from database package
 * These are generated from Drizzle tables using drizzle-zod
 */
// biome-ignore lint/performance/noBarrelFile: Re-exporting schemas from db package
export {
  // ChatSelect and ChatInsert types are already exported from @yapmate/db/schema (from chats.ts)
  // Only export Zod-specific types and schemas
  type ChatUpdate,
  type CreateChatInput,
  chatInsertSchema,
  chatSelectSchema,
  chatUpdateSchema,
  createChatInputSchema,
  type DeleteChatInput,
  deleteChatInputSchema,
  type UpdateChatInput,
  updateChatInputSchema,
} from "@yapmate/db/schema";
