import {
  Message,
  MessageAction,
  MessageActions,
  MessageContent,
  MessageResponse,
} from "@yapmate/components/ai-elements/message";
import {
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  type ModelSelectorLogoProps,
  ModelSelectorName,
} from "@yapmate/components/ai-elements/model-selector";
import { cn } from "@yapmate/components/lib/utils";
import { Command } from "@yapmate/components/ui/command";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@yapmate/components/ui/context-menu";
import { Textarea } from "@yapmate/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@yapmate/components/ui/tooltip";
import type { ChatUIMessage } from "@yapmate/server/routes/api/chat/types";
import type { ChatStatus } from "ai";
import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  RefreshCcwIcon,
  XIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FeedbackButtons, type FeedbackState } from "./feedback-buttons";
import { getProviderDisplayName } from "./model-utils";

type MessageActionsContentProps = {
  canEdit: boolean;
  feedback: FeedbackState;
  groupedModels: Array<{
    provider: string;
    items: Array<{ name: string; value: string }>;
  }>;
  isCopied: boolean;
  isEditing: boolean;
  message: ChatUIMessage;
  messageRole: "user" | "assistant";
  onCancelEdit: () => void;
  onCopy: (text: string, partId: string) => void;
  onEdit: () => void;
  onFeedback: (messageId: string, value: 0 | 1, comment?: string) => void;
  onModelSelect: (modelValue: string) => void;
  onRegenerate: () => void;
  onStartEdit: (messageId: string) => void;
  partId: string;
  partText: string;
  status: ChatStatus;
};

/**
 * Renders message action buttons (copy, retry, edit, feedback)
 */
const MessageActionsContent = ({
  canEdit,
  feedback,
  groupedModels,
  isCopied,
  isEditing,
  message,
  messageRole,
  onCancelEdit,
  onCopy,
  onEdit,
  onFeedback,
  onModelSelect,
  onRegenerate,
  onStartEdit,
  partId,
  partText,
  status,
}: MessageActionsContentProps) => {
  const isDisabled = status === "streaming" || status === "submitted";
  if (isEditing) {
    return (
      <>
        <MessageAction
          label="Cancel"
          onClick={onCancelEdit}
          tooltip="Cancel editing"
        >
          <XIcon className="size-3" />
        </MessageAction>
        <MessageAction
          disabled={!canEdit}
          label="Save"
          onClick={onEdit}
          tooltip="Save changes"
        >
          <CheckIcon className="size-3" />
        </MessageAction>
      </>
    );
  }

  return (
    <>
      <MessageAction
        label={isCopied ? "Copied" : "Copy"}
        onClick={() => onCopy(partText, partId)}
        tooltip="Copy"
      >
        {isCopied ? (
          <CheckIcon className="size-3" />
        ) : (
          <CopyIcon className="size-3" />
        )}
      </MessageAction>
      <ContextMenu>
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <ContextMenuTrigger asChild>
                <MessageAction label="Retry" onClick={onRegenerate}>
                  <RefreshCcwIcon className="size-3" />
                </MessageAction>
              </ContextMenuTrigger>
            </TooltipTrigger>
            <TooltipContent hideArrow side="bottom">
              <p>Right click to select another model</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        <ContextMenuContent className="w-64 p-0">
          <ContextMenuLabel className="px-3 py-2">
            Regenerate with model
          </ContextMenuLabel>
          <ContextMenuSeparator />
          <Command className="max-h-[300px]">
            <ModelSelectorInput
              className="rounded-none border-0"
              placeholder="Search models..."
            />
            <ModelSelectorList className="max-h-[250px]">
              <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
              {groupedModels.map((group) => (
                <ModelSelectorGroup key={group.provider}>
                  <div className="cmdk-group-heading pb-1 pl-2">
                    {getProviderDisplayName(group.provider)}
                  </div>
                  {group.items.map((item) => (
                    <ModelSelectorItem
                      key={item.value}
                      onSelect={() => onModelSelect(item.value)}
                      value={`${item.name} ${group.provider} ${item.value}`}
                    >
                      <ModelSelectorLogo
                        provider={
                          group.provider as ModelSelectorLogoProps["provider"]
                        }
                      />
                      <ModelSelectorName>{item.name}</ModelSelectorName>
                    </ModelSelectorItem>
                  ))}
                </ModelSelectorGroup>
              ))}
            </ModelSelectorList>
          </Command>
        </ContextMenuContent>
      </ContextMenu>
      {canEdit ? (
        <MessageAction
          disabled={isDisabled}
          label="Edit"
          onClick={() => onStartEdit(message.id)}
          tooltip="Edit message"
        >
          <PencilIcon className="size-3" />
        </MessageAction>
      ) : null}
      {messageRole === "assistant" && (
        <FeedbackButtons
          disabled={isDisabled}
          feedback={feedback}
          messageId={message.id}
          onFeedback={onFeedback}
        />
      )}
    </>
  );
};

type TextPartProps = {
  disabled?: boolean;
  feedback: FeedbackState;
  isCopied: boolean;
  isEditing: boolean;
  message: ChatUIMessage;
  onCancelEdit: () => void;
  onCopy: (text: string, partId: string) => void;
  onEdit?: (messageId: string, editedText: string) => void;
  onFeedback: (messageId: string, value: 0 | 1, comment?: string) => void;
  onRegenerate: (
    messageId?: string,
    role?: "user" | "assistant",
    model?: string
  ) => void;
  onStartEdit: (messageId: string) => void;
  part: Extract<ChatUIMessage["parts"][number], { type: "text" }>;
  partId: string;
  status: ChatStatus;
  groupedModels: Array<{
    provider: string;
    items: Array<{ name: string; value: string }>;
  }>;
};

/**
 * Renders a text message part with actions
 */
export const TextPart = ({
  disabled = false,
  feedback,
  isCopied,
  isEditing,
  message,
  onCancelEdit,
  onCopy,
  onEdit,
  onFeedback,
  onRegenerate,
  onStartEdit,
  part,
  partId,
  status,
  groupedModels,
}: TextPartProps) => {
  const [editedText, setEditedText] = useState(part.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      // Move cursor to end
      textareaRef.current.setSelectionRange(
        textareaRef.current.value.length,
        textareaRef.current.value.length
      );
    }
  }, [isEditing]);

  useEffect(() => {
    if (!isEditing) {
      setEditedText(part.text);
    }
  }, [isEditing, part.text]);

  const handleRetry = () => {
    onRegenerate(message.id, message.role as "user" | "assistant");
  };

  const handleModelSelect = (modelValue: string) => {
    onRegenerate(message.id, message.role as "user" | "assistant", modelValue);
  };

  const handleEdit = () => {
    if (message.role === "user" && onEdit) {
      onEdit(message.id, editedText.trim());
      onCancelEdit();
    }
  };

  const handleCancel = () => {
    setEditedText(part.text);
    onCancelEdit();
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleEdit();
    } else if (e.key === "Escape") {
      e.preventDefault();
      handleCancel();
    }
  };

  const isUser = message.role === "user";
  const canEdit = isUser && onEdit && !disabled;
  const hasChanges = editedText.trim() !== part.text.trim();

  return (
    <Message from={message.role}>
      <MessageContent>
        {isEditing ? (
          <Textarea
            className={cn(
              "field-sizing-content min-h-5 w-full resize-none rounded-none border-0 bg-transparent p-0 shadow-none outline-none focus-visible:ring-0",
              isUser ? "text-primary-foreground" : "text-foreground"
            )}
            onChange={(e) => setEditedText(e.target.value)}
            onKeyDown={handleKeyDown}
            ref={textareaRef}
            value={editedText}
          />
        ) : (
          <MessageResponse>{part.text}</MessageResponse>
        )}
      </MessageContent>
      {(message.role === "user" || message.role === "assistant") && (
        <MessageActions
          className={message.role === "user" ? "ml-auto" : undefined}
        >
          <MessageActionsContent
            canEdit={Boolean(canEdit && hasChanges)}
            feedback={feedback}
            groupedModels={groupedModels}
            isCopied={isCopied}
            isEditing={isEditing}
            message={message}
            messageRole={message.role}
            onCancelEdit={handleCancel}
            onCopy={onCopy}
            onEdit={handleEdit}
            onFeedback={onFeedback}
            onModelSelect={handleModelSelect}
            onRegenerate={handleRetry}
            onStartEdit={onStartEdit}
            partId={partId}
            partText={part.text}
            status={status}
          />
        </MessageActions>
      )}
    </Message>
  );
};
