"use client";

import type { ChatStatus } from "ai";
import { GlobeIcon } from "lucide-react";
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
} from "@/client/components/ai-elements/prompt-input";
import { ModelSelectorCombobox } from "@/client/components/model-selector";

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
}: ChatInputProps) => (
  <PromptInput
    className="rounded-md border border-primary/10 bg-primary/3"
    multiple
    onSubmit={onSubmit}
  >
    <PromptInputHeader>
      <PromptInputAttachments>
        {(attachment) => <PromptInputAttachment data={attachment} />}
      </PromptInputAttachments>
    </PromptInputHeader>
    <PromptInputBody>
      <PromptInputTextarea
        onChange={(e) => onInputChange(e.target.value)}
        value={input}
      />
    </PromptInputBody>
    <PromptInputFooter>
      <PromptInputTools>
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
