import type {
  ChatStatus,
  FileUIPart,
  ReasoningUIPart,
  ToolUIPart,
  UIMessage,
} from "ai";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import { AnalyticsEvents, useAnalytics } from "@/hooks/use-analytics";
import { FilePart, ReasoningPart, TextPart } from "./message-parts";
import { ToolPart } from "./tool-part";

type ChatUIMessage = UIMessage;

type ContextMenuAction = {
  title: string;
  systemIcon: string;
};

type MessageItemProps = {
  addToolApprovalResponse?: (response: {
    id: string;
    approved: boolean;
  }) => void;
  message: ChatUIMessage;
  isEditing: boolean;
  onCopy: (text: string, partId: string) => void;
  onCancelEdit: () => void;
  onEdit?: (messageId: string, editedText: string) => void;
  onRegenerate?: (messageId: string, role: "user" | "assistant") => void;
  onRequestModelForRegeneration?: (
    messageId: string,
    role: "user" | "assistant"
  ) => void;
  onStartEdit: (messageId: string) => void;
  status: ChatStatus;
};

/**
 * Checks if a part type is a tool part (starts with "tool-" or is "dynamic-tool")
 */
const isToolPart = (partType: string): boolean =>
  partType.startsWith("tool-") || partType === "dynamic-tool";

/**
 * Checks if a text part contains legacy data-model JSON that was mistakenly saved
 * These parts should be filtered out from rendering
 */
const isLegacyDataModelPart = (
  part: ChatUIMessage["parts"][number]
): boolean => {
  if (part.type !== "text") {
    return false;
  }
  const text = part.text.trim();
  if (!(text.startsWith("{") && text.endsWith("}"))) {
    return false;
  }
  try {
    const parsed = JSON.parse(text);
    return parsed?.type === "data-model";
  } catch {
    return false;
  }
};

/**
 * Action identifiers for context menu
 */
const ACTION_COPY = "copy";
const ACTION_REGENERATE = "regenerate";
const ACTION_REGENERATE_WITH_MODEL = "regenerate_with_model";
const ACTION_EDIT = "edit";

/**
 * Builds context menu actions based on message role and status
 */
const buildContextMenuActions = (params: {
  isUser: boolean;
  canEdit: boolean;
  canRegenerate: boolean;
  isStreaming: boolean;
}): { actions: ContextMenuAction[]; actionIds: string[] } => {
  const actions: ContextMenuAction[] = [];
  const actionIds: string[] = [];

  // Copy is always available
  actions.push({ title: "Copy", systemIcon: "doc.on.doc" });
  actionIds.push(ACTION_COPY);

  if (params.canRegenerate && !params.isStreaming) {
    actions.push({ title: "Regenerate", systemIcon: "arrow.counterclockwise" });
    actionIds.push(ACTION_REGENERATE);

    actions.push({
      title: "Regenerate with model...",
      systemIcon: "arrow.triangle.2.circlepath",
    });
    actionIds.push(ACTION_REGENERATE_WITH_MODEL);
  }

  if (params.canEdit && !params.isStreaming) {
    actions.push({ title: "Edit", systemIcon: "square.and.pencil" });
    actionIds.push(ACTION_EDIT);
  }

  return { actions, actionIds };
};

/**
 * Extracts full text content from message parts
 */
const getTextContent = (parts: ChatUIMessage["parts"]): string =>
  parts
    .filter((part) => part.type === "text")
    .map((part) => (part as { type: "text"; text: string }).text)
    .join("\n")
    .trim();

/**
 * Renders a single message item
 * Context menu is applied at the TextPart level for proper bubble styling
 */
export const MessageItem = ({
  addToolApprovalResponse,
  message,
  isEditing,
  onCopy,
  onCancelEdit,
  onEdit,
  onRegenerate,
  onRequestModelForRegeneration,
  onStartEdit,
  status,
}: MessageItemProps) => {
  const isUser = message.role === "user";
  const parts = message.parts ?? [];
  const messageRole = message.role as "user" | "assistant";
  const isStreaming = status === "streaming" || status === "submitted";
  const canRegenerate = Boolean(onRegenerate && onRequestModelForRegeneration);
  const canEdit = Boolean(isUser && onEdit);
  const { capture } = useAnalytics();

  const { actions, actionIds } = useMemo(
    () =>
      buildContextMenuActions({
        isUser,
        canEdit,
        canRegenerate,
        isStreaming,
      }),
    [isUser, canEdit, canRegenerate, isStreaming]
  );

  // Key includes isStreaming to force ContextMenu remount when streaming state changes
  const contextMenuKey = `${message.id}-${isStreaming}`;

  /**
   * Handle context menu action selection
   */
  const handleContextMenuPress = (event: {
    nativeEvent: { index: number; name: string };
  }) => {
    const { index } = event.nativeEvent;
    const actionId = actionIds[index];

    switch (actionId) {
      case ACTION_COPY: {
        const textContent = getTextContent(parts);
        if (textContent) {
          capture(AnalyticsEvents.MESSAGE_COPIED);
          onCopy(textContent, `${message.id}-0`);
        }
        break;
      }
      case ACTION_REGENERATE:
        capture(AnalyticsEvents.MESSAGE_REGENERATED, { model: "current" });
        onRegenerate?.(message.id, messageRole);
        break;
      case ACTION_REGENERATE_WITH_MODEL:
        // Note: actual model selection tracked in model-selector
        onRequestModelForRegeneration?.(message.id, messageRole);
        break;
      case ACTION_EDIT:
        capture(AnalyticsEvents.MESSAGE_EDITED);
        onStartEdit(message.id);
        break;
      default:
        break;
    }
  };

  return (
    <View
      style={[
        styles.messageContainer,
        isUser ? styles.itemsEnd : styles.itemsStart,
      ]}
    >
      {parts.map((part, i) => {
        const partId = `${message.id}-${i}`;
        const isLastPart = i === parts.length - 1;

        // Skip legacy data-model parts that were mistakenly saved as text
        if (isLegacyDataModelPart(part)) {
          return null;
        }

        switch (part.type) {
          case "file":
            return (
              <FilePart
                isUser={isUser}
                key={partId}
                part={part as FileUIPart}
                useAutoMargin={true}
              />
            );
          case "text":
            return (
              <TextPart
                contextMenuActions={actions}
                contextMenuKey={contextMenuKey}
                isEditing={isEditing}
                isUser={isUser}
                key={partId}
                messageId={message.id}
                onCancelEdit={onCancelEdit}
                onContextMenuPress={handleContextMenuPress}
                onEdit={onEdit}
                part={part}
              />
            );
          case "reasoning":
            // Reasoning is streaming if this is the last part and message is streaming
            return (
              <ReasoningPart
                isStreaming={isStreaming && isLastPart}
                key={partId}
                part={part as ReasoningUIPart}
              />
            );
          default:
            // Handle tool parts (type starts with "tool-" or "dynamic-tool")
            if (isToolPart(part.type)) {
              return (
                <ToolPart
                  addToolApprovalResponse={addToolApprovalResponse}
                  key={partId}
                  part={part as ToolUIPart}
                />
              );
            }
            return null;
        }
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  messageContainer: {
    marginHorizontal: 12,
    marginVertical: 8,
    flexDirection: "column",
    gap: 8,
  },
  itemsEnd: {
    alignItems: "flex-end",
  },
  itemsStart: {
    alignItems: "flex-start",
  },
});
