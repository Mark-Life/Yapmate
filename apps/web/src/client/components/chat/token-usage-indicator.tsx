import {
  Context,
  ContextContent,
  ContextContentBody,
  ContextContentFooter,
  ContextContentHeader,
  ContextInputUsage,
  ContextOutputUsage,
  ContextReasoningUsage,
  ContextTrigger,
} from "@yapmate/components/ai-elements/context";
import type { ChatUIMessage } from "@yapmate/server/routes/api/chat/types";
import { useMemo } from "react";
import { useModels } from "../../hooks/use-models";

type TokenUsageIndicatorProps = {
  messages: ChatUIMessage[];
  model: string;
};

/**
 * Displays token usage indicator for the current chat context
 * Shows percentage of context window used with detailed breakdown on hover
 */
export const TokenUsageIndicator = ({
  messages,
  model,
}: TokenUsageIndicatorProps) => {
  const { models } = useModels();

  // Find latest assistant message with usage metadata
  const latestAssistantMessage = useMemo(() => {
    // Find last assistant message (reverse search)
    for (let i = messages.length - 1; i >= 0; i--) {
      const msg = messages[i];
      if (msg.role === "assistant" && msg.metadata) {
        return msg;
      }
    }
    return null;
  }, [messages]);

  // Get model context limit
  const modelData = useMemo(
    () => models.find((m) => m.value === model),
    [models, model]
  );

  const contextLimit = modelData?.contextLimit;

  // Extract usage from latest assistant message metadata
  const extractUsageFromMetadata = (
    meta: ChatUIMessage["metadata"]
  ): {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    usage: {
      inputTokens: number;
      outputTokens: number;
      totalTokens: number;
      cachedInputTokens: number;
      reasoningTokens: number;
    };
  } | null => {
    if (!meta) {
      return null;
    }

    const inputTokens = meta.promptTokens ?? 0;
    const outputTokens = meta.completionTokens ?? 0;
    const totalTokens = meta.totalTokens;

    // If we have totalTokens, use it; otherwise sum input + output
    const usedTokens = totalTokens ?? inputTokens + outputTokens;

    if (!usedTokens || usedTokens === 0) {
      return null;
    }

    return {
      inputTokens,
      outputTokens,
      totalTokens: usedTokens,
      // Map to LanguageModelUsage format for Context component
      usage: {
        inputTokens,
        outputTokens,
        totalTokens: usedTokens,
        cachedInputTokens: meta.cachedTokens ?? 0,
        reasoningTokens: meta.reasoningTokens ?? 0,
      } as const,
    };
  };

  const usage = useMemo(
    () => extractUsageFromMetadata(latestAssistantMessage?.metadata),
    [latestAssistantMessage]
  );

  // Don't render if no usage data or no context limit
  if (!(usage && contextLimit)) {
    return null;
  }

  return (
    <Context
      maxTokens={contextLimit}
      modelId={model}
      showCost={false}
      usage={usage.usage}
      usedTokens={usage.totalTokens}
    >
      <ContextTrigger />
      <ContextContent>
        <ContextContentHeader />
        <ContextContentBody>
          <div className="space-y-2">
            <ContextInputUsage />
            <ContextOutputUsage />
            <ContextReasoningUsage />
          </div>
        </ContextContentBody>
        <ContextContentFooter />
      </ContextContent>
    </Context>
  );
};
