import {
  PromptInput,
  PromptInputAddFileButton,
  PromptInputAttachment,
  PromptInputAttachments,
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
import type { ChatStatus } from "ai";
import { GlobeIcon } from "lucide-react";
import { ModelSelectorCombobox } from "../model-selector";

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
}: ChatInputProps) => {
  const attachments = usePromptInputAttachments();
  const hasAttachments = attachments.files.length > 0;

  return (
    <PromptInput
      className="rounded-md border border-primary/10 bg-primary/3"
      multiple
      onSubmit={onSubmit}
    >
      {hasAttachments ? (
        <PromptInputHeader>
          <PromptInputAttachments>
            {(attachment) => <PromptInputAttachment data={attachment} />}
          </PromptInputAttachments>
        </PromptInputHeader>
      ) : null}
      <PromptInputBody>
        <PromptInputTextarea
          onBlur={() => onFocusChange?.(false)}
          onChange={(e) => onInputChange(e.target.value)}
          onFocus={() => onFocusChange?.(true)}
          value={input}
        />
      </PromptInputBody>
      <PromptInputFooter>
        <PromptInputTools>
          <PromptInputTranscribeButton onTranscriptionChange={onInputChange} />
          <ModelSelectorCombobox model={model} onModelChange={onModelChange} />
          <PromptInputAddFileButton />
          <PromptInputButton
            aria-label="Toggle search"
            onClick={() => onSearchEnabledChange(!searchEnabled)}
            variant={searchEnabled ? "default" : "ghost"}
          >
            <GlobeIcon className="size-4" />
          </PromptInputButton>
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
