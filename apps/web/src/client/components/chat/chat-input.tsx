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
import { EllipsisIcon, GlobeIcon, ImageIcon } from "lucide-react";
import { ModelSelectorCombobox } from "../model-selector";
import { TokenUsageIndicator } from "./token-usage-indicator";

type ChatInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  searchEnabled: boolean;
  onSearchEnabledChange: (enabled: boolean) => void;
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
  status,
  onSubmit,
  onStop,
  onFocusChange,
  messages,
  chatId,
}: ChatInputProps) => {
  const attachments = usePromptInputAttachments();
  const hasAttachments = attachments.files.length > 0;

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
          <PromptInputTranscribeButton onTranscriptionChange={onInputChange} />
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
