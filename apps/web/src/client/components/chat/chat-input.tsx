import {
  PromptInput,
  PromptInputAddFileButton,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputAutoFocus,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  PromptInputTranscribeButton,
  usePromptInputAttachments,
} from "@yapmate/components/ai-elements/prompt-input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@yapmate/components/ui/dropdown-menu";
import type { ChatUIMessage } from "@yapmate/server/routes/api/chat/types";
import type { ChatStatus } from "ai";
import { BrainIcon, EllipsisIcon, GlobeIcon, ImageIcon } from "lucide-react";
import { useEffect, useRef } from "react";
import { usePostHog } from "../../hooks/use-posthog";
import { ModelSelectorCombobox } from "../model-selector";
import { TokenUsageIndicator } from "./token-usage-indicator";

type ChatInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  searchEnabled: boolean;
  onSearchEnabledChange: (enabled: boolean) => void;
  memoryEnabled: boolean;
  onMemoryEnabledChange: (enabled: boolean) => void;
  status: ChatStatus;
  onSubmit: (message: PromptInputMessage) => void;
  onStop?: () => void;
  onFocusChange?: (focused: boolean) => void;
  messages?: ChatUIMessage[];
  chatId?: string;
};

/**
 * Renders the chat input area with textarea, model selector, and controls
 */
export const ChatInput = ({
  input,
  onInputChange,
  model,
  onModelChange,
  searchEnabled,
  onSearchEnabledChange,
  memoryEnabled,
  onMemoryEnabledChange,
  status,
  onSubmit,
  onStop,
  onFocusChange,
  messages,
  chatId,
}: ChatInputProps) => {
  const { capture } = usePostHog();
  const attachments = usePromptInputAttachments();
  const hasAttachments = attachments.files.length > 0;
  const previousFileCountRef = useRef(attachments.files.length);

  /**
   * Track file attachments when they're added
   */
  useEffect(() => {
    const currentFileCount = attachments.files.length;
    const previousFileCount = previousFileCountRef.current;

    if (currentFileCount > previousFileCount) {
      const newFiles = attachments.files.slice(previousFileCount);
      for (const file of newFiles) {
        capture("file_attachment_added", {
          chat_id: chatId,
          media_type: file.mediaType,
          has_url: !!file.url,
        });
      }
    }

    previousFileCountRef.current = currentFileCount;
  }, [attachments.files, chatId, capture]);

  /**
   * Handle transcription with tracking
   */
  const handleTranscriptionChange = (transcription: string) => {
    if (transcription) {
      capture("transcription_used", {
        chat_id: chatId,
        transcription_length: transcription.length,
      });
    }
    onInputChange(transcription);
  };

  return (
    <PromptInput
      className="rounded-md border border-primary/10 bg-primary/3"
      multiple
      onSubmit={onSubmit}
    >
      <PromptInputAutoFocus focusKey={chatId} />
      {hasAttachments ? (
        <PromptInputHeader>
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
        </PromptInputHeader>
      ) : null}
      <PromptInputBody>
        <PromptInputTextarea
          className="min-h-8 pb-0 md:min-h-8"
          onBlur={() => onFocusChange?.(false)}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => onFocusChange?.(true)}
          value={input}
        />
      </PromptInputBody>
      <PromptInputFooter className="px-2 pb-2">
        <PromptInputTools>
          <PromptInputTranscribeButton
            onTranscriptionChange={handleTranscriptionChange}
          />
          <ModelSelectorCombobox model={model} onModelChange={onModelChange} />
          {/* Desktop: show all buttons */}
          <div className="hidden items-center gap-1 md:flex">
            <PromptInputAddFileButton />
            <PromptInputButton
              aria-label="Toggle search"
              onClick={() => onSearchEnabledChange(!searchEnabled)}
              variant={searchEnabled ? "default" : "ghost"}
            >
              <GlobeIcon className="size-4" />
            </PromptInputButton>
            <PromptInputButton
              aria-label="Toggle memory"
              onClick={() => onMemoryEnabledChange(!memoryEnabled)}
              variant={memoryEnabled ? "default" : "ghost"}
            >
              <BrainIcon className="size-4" />
            </PromptInputButton>
            {messages && messages.length > 0 && (
              <TokenUsageIndicator messages={messages} model={model} />
            )}
          </div>
          {/* Mobile: overflow menu for secondary actions */}
          <div className="md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <PromptInputButton aria-label="More options">
                  <EllipsisIcon className="size-4" />
                </PromptInputButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => attachments.openFileDialog()}>
                  <ImageIcon className="mr-2 size-4" />
                  Add file
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onSearchEnabledChange(!searchEnabled)}
                >
                  <GlobeIcon className="mr-2 size-4" />
                  {searchEnabled ? "Disable search" : "Enable search"}
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onMemoryEnabledChange(!memoryEnabled)}
                >
                  <BrainIcon className="mr-2 size-4" />
                  {memoryEnabled ? "Disable memory" : "Enable memory"}
                </DropdownMenuItem>
                {messages && messages.length > 0 && (
                  <div className="px-2 py-1.5">
                    <TokenUsageIndicator messages={messages} model={model} />
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </PromptInputTools>
        <PromptInputSubmit
          disabled={!(input || status)}
          onStop={onStop}
          status={status}
        />
      </PromptInputFooter>
    </PromptInput>
  );
};
