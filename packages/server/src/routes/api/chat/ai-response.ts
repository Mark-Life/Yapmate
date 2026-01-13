/**
 * Core AI response streaming logic
 * Handles LLM streaming, Langfuse tracing, and usage extraction
 */

import { withSupermemory } from "@supermemory/tools/ai-sdk";
import { getChatMemberNames, saveUsageRecord } from "@yapmate/db/service";
import {
  convertToModelMessages,
  stepCountIs,
  streamText,
  type UIMessage,
} from "ai";
import { langfuse } from "../../../lib/instrumentation";
import { openrouter } from "../../../lib/openrouter";
import {
  addMemoryTool,
  searchMemoriesTool,
} from "../../../lib/supermemory-tools";

/** Reasoning effort level for models that support extended thinking */
export type ReasoningEffort = "high" | "medium" | "low";

/**
 * Usage data from AI response (matches MessageMetadata format)
 * Note: cost is excluded from this type as it's only stored in usage_records table,
 * not sent to client for privacy/security reasons
 */
export type AiResponseUsage = {
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  cachedTokens?: number;
  reasoningTokens?: number;
};

/**
 * Options for executing AI response
 */
type ExecuteAiResponseOptions = {
  modelWithSearch: string;
  memoryEnabled?: boolean;
  reasoningEffort?: ReasoningEffort;
  userRules?: Array<{ title: string; content: string }>;
  messages: UIMessage[];
  abortSignal: AbortSignal;
  chatId: string;
  streamId: string;
  assistantMessageId: string;
  userId: string;
  mcpTools?: Record<string, unknown>;
  /** Whether this is a multi-user chat (enables username prefixing) */
  isMultiUser?: boolean;
};

/**
 * Result of executing AI response
 */
export type AiResponseResult = {
  uiStream: ReturnType<
    typeof streamText
  >["toUIMessageStream"] extends () => infer R
    ? R
    : never;
  getUsage: () => Promise<AiResponseUsage | null>;
};

/**
 * Extracts text content from UIMessage parts
 */
const getMessageText = (msg: UIMessage): string => {
  const textParts = msg.parts.filter(
    (p): p is { type: "text"; text: string } => p.type === "text" && "text" in p
  );
  return textParts.map((p) => p.text).join("\n\n");
};

// Get Supermemory API key (only needed when memory is enabled)
if (!process.env.SUPERMEMORY_API_KEY) {
  throw new Error("SUPERMEMORY_API_KEY is not set");
}
const supermemoryApiKey = process.env.SUPERMEMORY_API_KEY;

/**
 * Memory prompt data structure for custom template
 */
interface MemoryPromptData {
  userMemories: string;
  generalSearchMemories: string;
}

/**
 * Custom prompt template for memory injection
 * Removes supermemory branding and uses custom formatting
 */
const customMemoryPromptTemplate = (data: MemoryPromptData): string => {
  const parts: string[] = [];

  if (data.userMemories || data.generalSearchMemories) {
    parts.push(
      "The following user profile and context information has been retrieved from existing user memories stored in the memory database."
    );
  }

  if (data.userMemories) {
    parts.push(`User Profile:\n${data.userMemories}`);
  }

  if (data.generalSearchMemories) {
    parts.push(`Relevant Context:\n${data.generalSearchMemories}`);
  }

  if (data.userMemories || data.generalSearchMemories) {
    parts.push(
      "Important: Do not save this information using the addMemory tool, as it is already stored in the memory database. Only use addMemory for new information shared by the user that is not already present in the above profile or context."
    );
  }

  return parts.length > 0 ? parts.join("\n\n") : "";
};

// ─── Multi-User Support ───────────────────────────────────────────────────────

/**
 * System prompt addition for multi-user conversations.
 * Explains the username format to the model and provides guidelines.
 */
const MULTI_USER_SYSTEM_PROMPT = `
This is a multi-user conversation. User messages are prefixed with the sender's name in square brackets, like [Alice]: or [Bob]:.

Guidelines for multi-user conversations:
- Address users by name when responding to specific questions or comments
- When multiple users are discussing, acknowledge different perspectives
- If a user asks a follow-up to another user's question, maintain context
- Be inclusive and respond to all participants appropriately
`.trim();

/** Content part type for multimodal messages */
type ContentPart = { type: string; text?: string; [key: string]: unknown };

/**
 * Prefix username to message content.
 * Handles both string content (from text parts) and array content (multimodal messages).
 * @param content - Message content as string or array of content parts
 * @param displayName - Display name to prefix
 */
const prefixContentWithUsername = (
  content: string | ContentPart[],
  displayName: string
): string | ContentPart[] => {
  const prefix = `[${displayName}]: `;

  if (typeof content === "string") {
    return prefix + content;
  }

  // For array content, prepend a text part with the username
  return [{ type: "text", text: prefix }, ...content];
};

/**
 * Extracts text content from UIMessage parts for prefixing.
 * Returns the message parts as a format suitable for content prefixing.
 */
const extractMessageContent = (
  msg: UIMessage
): string | ContentPart[] => {
  // Check if message has multimodal content (images, files, etc.)
  const hasMultimodalParts = msg.parts.some(
    (p) => p.type !== "text" && p.type !== "reasoning"
  );

  if (hasMultimodalParts) {
    // Return parts as array for multimodal content
    return msg.parts
      .filter((p) => p.type === "text" || p.type === "file")
      .map((p) => {
        if (p.type === "text") {
          return { type: "text", text: p.text };
        }
        return p as ContentPart;
      });
  }

  // Return plain text for text-only messages
  const textParts = msg.parts.filter(
    (p): p is { type: "text"; text: string } => p.type === "text" && "text" in p
  );
  return textParts.map((p) => p.text).join("\n\n");
};

/**
 * Prepares messages for multi-user context by prefixing usernames.
 * Only user messages get prefixed; assistant messages remain unchanged.
 * @param messages - Original messages
 * @param memberNames - Map of userId to displayName
 */
const prepareMultiUserMessages = (
  messages: UIMessage[],
  memberNames: Map<string, string>
): UIMessage[] => {
  return messages.map((msg) => {
    // Only prefix user messages
    if (msg.role !== "user") {
      return msg;
    }

    // Get userId from metadata (added by mapDbMessageToUI)
    const metadata = msg.metadata as Record<string, unknown> | undefined;
    const msgUserId = metadata?.userId as string | undefined;

    if (!msgUserId) {
      // No userId means single-user chat message or older message
      return msg;
    }

    const displayName = memberNames.get(msgUserId) || "User";
    const content = extractMessageContent(msg);
    const prefixedContent = prefixContentWithUsername(content, displayName);

    // If content is a string, create a new text part
    if (typeof prefixedContent === "string") {
      return {
        ...msg,
        parts: [{ type: "text" as const, text: prefixedContent }],
      };
    }

    // For array content, replace parts (preserving non-text/file parts)
    const otherParts = msg.parts.filter(
      (p) => p.type !== "text" && p.type !== "file"
    );
    return {
      ...msg,
      parts: [
        ...prefixedContent.map((p) =>
          p.type === "text"
            ? ({ type: "text" as const, text: p.text ?? "" } as const)
            : (p as UIMessage["parts"][number])
        ),
        ...otherParts,
      ],
    };
  });
};

/**
 * Creates and executes the LLM stream with Langfuse tracing
 * @returns UI stream and function to get usage data (after stream is consumed)
 */
export const executeAiResponse = async (
  options: ExecuteAiResponseOptions
): Promise<AiResponseResult> => {
  const {
    modelWithSearch,
    memoryEnabled,
    reasoningEffort = "low",
    userRules,
    messages,
    abortSignal,
    chatId,
    streamId,
    assistantMessageId,
    userId,
    mcpTools,
    isMultiUser,
  } = options;

  // Prepare messages for multi-user context (prefix usernames)
  let processedMessages = messages;
  if (isMultiUser) {
    const memberNames = await getChatMemberNames(chatId);
    processedMessages = prepareMultiUserMessages(messages, memberNames);
  }

  // Create Langfuse trace with assistantMessageId as trace ID for feedback linking
  // sessionId groups all traces in the same chat conversation
  const trace = langfuse.trace({
    id: assistantMessageId,
    name: "chat-message",
    sessionId: chatId,
    userId,
    tags: ["chat"],
    input: {
      messageCount: messages.length,
      messages: messages.map((msg) => ({
        role: msg.role,
        content: getMessageText(msg),
      })),
    },
  });

  // Create generation span for the LLM call
  const generation = trace.generation({
    name: "llm-response",
    model: modelWithSearch.replace(":online", ""),
    input: messages.map((msg) => ({
      role: msg.role,
      content: getMessageText(msg),
    })),
  });

  // Create base model with reasoning support
  const baseModel = openrouter.chat(modelWithSearch, {
    usage: { include: true },
    reasoning: { effort: reasoningEffort },
  });

  // Wrap model with Supermemory when memory is enabled
  // mode: "full" = profile retrieval + query-based search
  // addMemory: we dont do "always" because we pass tool to do it
  // promptTemplate: custom branding without supermemory references
  const model =
    memoryEnabled && supermemoryApiKey
      ? withSupermemory(baseModel, userId, {
          mode: "full",
          apiKey: supermemoryApiKey,
          conversationId: chatId,
          promptTemplate: customMemoryPromptTemplate,
        })
      : baseModel;

  // Add individual memory tools when enabled
  const memoryTools =
    memoryEnabled && supermemoryApiKey
      ? {
          searchMemories: searchMemoriesTool(supermemoryApiKey, {
            containerTags: [userId],
          }),
          addMemory: addMemoryTool(supermemoryApiKey, {
            containerTags: [userId],
          }),
        }
      : undefined;

  const baseSystemPrompt =
    "You are a helpful assistant that can answer questions and help with tasks.";
  const memorySystemPrompt =
    "When users share information about themselves, remember it using the addMemory tool. When they ask questions, search your memories to provide personalized responses. Always be proactive about remembering important details.";

  // Build final system prompt with optional memory and multi-user context
  let finalPrompt = memoryEnabled
    ? `${baseSystemPrompt} ${memorySystemPrompt}`
    : baseSystemPrompt;

  // Add multi-user context to system prompt
  if (isMultiUser) {
    finalPrompt = `${finalPrompt}\n\n${MULTI_USER_SYSTEM_PROMPT}`;
  }

  // Wrap MCP tools to require approval
  const wrappedMcpTools =
    mcpTools && Object.keys(mcpTools).length > 0
      ? Object.fromEntries(
          Object.entries(mcpTools).map(([toolName, tool]) => [
            toolName,
            {
              ...(tool as Record<string, unknown>),
              needsApproval: true,
            },
          ])
        )
      : {};

  // Merge MCP tools and memory tools
  const allTools = {
    ...wrappedMcpTools,
    ...(memoryTools || {}),
  };

  // Prepend user rules as context message
  const rulesContent =
    userRules && userRules.length > 0
      ? userRules.map((r) => `[${r.title}]\n${r.content}`).join("\n\n")
      : null;

  // Convert messages to format expected by convertToModelMessages (omit id)
  // Use processedMessages which may have username prefixes for multi-user chats
  const messagesForModel = processedMessages.map((msg) => {
    const { id, ...rest } = msg;
    return rest;
  });

  const messagesWithRules = rulesContent
    ? [
        {
          role: "user" as const,
          parts: [{ type: "text" as const, text: rulesContent }],
        },
        ...messagesForModel,
      ]
    : messagesForModel;

  const result = streamText({
    model,
    messages: await convertToModelMessages(messagesWithRules),
    // Type cast needed - MCP tools from @ai-sdk/mcp are compatible but need type assertion
    ...(Object.keys(allTools).length > 0 && {
      tools: allTools as Parameters<typeof streamText>[0]["tools"],
    }),
    system: finalPrompt,
    maxOutputTokens: 8192,
    abortSignal,
    stopWhen: stepCountIs(5),
  });

  // Get UI stream
  const uiStream = result.toUIMessageStream({
    sendSources: true,
    sendReasoning: true,
  });

  // Return stream and function to get usage (usage resolves after stream is consumed)
  const getUsage = async (): Promise<AiResponseUsage | null> => {
    const [text, usage, finishReason, response, providerMetadata] =
      await Promise.all([
        result.text,
        result.usage,
        result.finishReason,
        result.response,
        result.providerMetadata,
      ]);

    // Extract cost from provider metadata
    const openrouterUsage =
      providerMetadata &&
      typeof providerMetadata === "object" &&
      "openrouter" in providerMetadata &&
      providerMetadata.openrouter &&
      typeof providerMetadata.openrouter === "object" &&
      "usage" in providerMetadata.openrouter
        ? (providerMetadata.openrouter.usage as { cost?: number })
        : undefined;

    // Update Langfuse generation with output and usage
    generation.end({
      output: text,
      usage: {
        input: usage.inputTokens,
        output: usage.outputTokens,
        total: usage.totalTokens,
      },
      metadata: {
        finishReason,
        cachedTokens: usage.inputTokenDetails.cacheReadTokens,
        reasoningTokens: usage.outputTokenDetails.reasoningTokens,
        cost: openrouterUsage?.cost,
      },
    });

    // Update trace with final output
    trace.update({
      output: {
        text,
        finishReason,
        usage: {
          promptTokens: usage.inputTokens,
          completionTokens: usage.outputTokens,
          totalTokens: usage.totalTokens,
        },
      },
    });

    // Save usage record for billing/analytics
    try {
      await saveUsageRecord({
        userId,
        chatId,
        messageId: undefined, // Set later if needed
        type: "chat",
        provider: "openrouter",
        model: modelWithSearch.replace(":online", ""),
        inputTokens: usage.inputTokens ?? null,
        outputTokens: usage.outputTokens ?? null,
        totalTokens: usage.totalTokens ?? null,
        cachedTokens: usage.inputTokenDetails.cacheReadTokens ?? 0,
        reasoningTokens: usage.outputTokenDetails.reasoningTokens ?? 0,
        costUsd: openrouterUsage?.cost?.toString() ?? null,
        generationId: response.id,
        finishReason: finishReason ?? null,
      });
    } catch (usageError) {
      // Log but don't fail the stream if usage saving fails
      console.error(
        `[Stream ${streamId}] Error saving usage record:`,
        usageError
      );
    }

    // Return usage data for message metadata (excluding cost - only sent to client)
    // Cost is still saved to usage_records table for billing/analytics
    return {
      promptTokens: usage.inputTokens,
      completionTokens: usage.outputTokens,
      totalTokens: usage.totalTokens,
      cachedTokens: usage.inputTokenDetails.cacheReadTokens,
      reasoningTokens: usage.outputTokenDetails.reasoningTokens,
    };
  };

  return {
    uiStream,
    getUsage,
  };
};
