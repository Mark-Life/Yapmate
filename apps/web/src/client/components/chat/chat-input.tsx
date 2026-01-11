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
import { Kbd, KbdGroup } from "@yapmate/components/ui/kbd";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@yapmate/components/ui/tooltip";
import type { ChatUIMessage } from "@yapmate/server/routes/api/chat/types";
import type { ChatStatus } from "ai";
import {
  BrainIcon,
  DatabaseIcon,
  EllipsisIcon,
  GlobeIcon,
  ImageIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { HOTKEYS, splitHotkey } from "../../hooks/use-hotkeys-config";
import { usePostHog } from "../../hooks/use-posthog";
import type {
  McpToolSelection,
  ReasoningEffort,
} from "../../hooks/use-user-preferences";
import { ModelSelectorCombobox } from "../model-selector";
import { TokenUsageIndicator } from "./token-usage-indicator";
import { ToolSelector } from "./tool-selector";

/** Labels for reasoning effort levels */
const REASONING_LABELS: Record<ReasoningEffort, string> = {
  low: "Quick",
  medium: "Balanced",
  high: "Deep",
};

type ChatInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  searchEnabled: boolean;
  onSearchEnabledChange: (enabled: boolean) => void;
  memoryEnabled: boolean;
  onMemoryEnabledChange: (enabled: boolean) => void;
  reasoningEffort: ReasoningEffort;
  onReasoningEffortChange: (effort: ReasoningEffort) => void;
  selectedMcpTools: McpToolSelection[];
  onSelectedMcpToolsChange: (tools: McpToolSelection[]) => void;
  supportsReasoning: boolean;
  status: ChatStatus;
  onSubmit: (message: PromptInputMessage) => void;
  onStop?: () => void;
  onFocusChange?: (focused: boolean) => void;
  messages?: ChatUIMessage[];
  /** Used for auto-focus when navigating between chats */
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
  reasoningEffort,
  onReasoningEffortChange,
  selectedMcpTools,
  onSelectedMcpToolsChange,
  supportsReasoning,
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
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [toolSelectorOpen, setToolSelectorOpen] = useState(false);

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
          media_type: file.mediaType,
          has_url: !!file.url,
        });
      }
    }

    previousFileCountRef.current = currentFileCount;
  }, [attachments.files, capture]);

  /**
   * Handle transcription with tracking
   */
  const handleTranscriptionChange = (transcription: string) => {
    if (transcription) {
      capture("transcription_used", {
        transcription_length: transcription.length,
      });
    }
    onInputChange(transcription);
  };

  /**
   * Cycle through reasoning effort levels
   */
  const cycleReasoning = () => {
    if (!supportsReasoning) {
      return;
    }
    const levels: ReasoningEffort[] = ["low", "medium", "high"];
    const currentIdx = levels.indexOf(reasoningEffort);
    const nextIdx = (currentIdx + 1) % levels.length;
    onReasoningEffortChange(levels[nextIdx]);
  };

  // Hotkeys for input actions
  useHotkeys(
    HOTKEYS.toggleVoice,
    (e) => {
      e.preventDefault();
      // Find and click the voice button (aria-label is "Start recording" or "Stop recording")
      const voiceButton = document.querySelector(
        'button[aria-label*="recording"], button[aria-label*="Recording"], button[aria-label*="Transcribing"]'
      ) as HTMLButtonElement | null;
      voiceButton?.click();
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    HOTKEYS.toggleSearch,
    (e) => {
      e.preventDefault();
      onSearchEnabledChange(!searchEnabled);
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    HOTKEYS.openModelSelector,
    (e) => {
      e.preventDefault();
      setModelSelectorOpen(true);
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    HOTKEYS.attachFile,
    (e) => {
      e.preventDefault();
      attachments.openFileDialog();
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    HOTKEYS.cycleReasoning,
    (e) => {
      e.preventDefault();
      if (supportsReasoning) {
        cycleReasoning();
      }
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    HOTKEYS.openToolSelector,
    (e) => {
      e.preventDefault();
      setToolSelectorOpen(true);
    },
    { enableOnFormTags: true }
  );

  useHotkeys(
    HOTKEYS.toggleMemory,
    (e) => {
      e.preventDefault();
      onMemoryEnabledChange(!memoryEnabled);
    },
    { enableOnFormTags: true }
  );

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
          <ModelSelectorCombobox
            model={model}
            onModelChange={(newModel) => {
              onModelChange(newModel);
              setModelSelectorOpen(false);
            }}
            onOpenChange={setModelSelectorOpen}
            open={modelSelectorOpen}
          />
          <ToolSelector
            onOpenChange={setToolSelectorOpen}
            onSelectionsChange={onSelectedMcpToolsChange}
            open={toolSelectorOpen}
            selections={selectedMcpTools}
          />
          {/* Desktop: show all buttons */}
          <div className="hidden items-center gap-1 md:flex">
            <Tooltip>
              <TooltipTrigger asChild>
                <PromptInputAddFileButton />
              </TooltipTrigger>
              <TooltipContent hideArrow side="top" sideOffset={45}>
                Add files{" "}
                <KbdGroup>
                  {splitHotkey(HOTKEYS.attachFile).map((key, idx) => (
                    <Kbd key={idx}>{key}</Kbd>
                  ))}
                </KbdGroup>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <PromptInputButton
                  aria-label="Toggle search"
                  onClick={() => onSearchEnabledChange(!searchEnabled)}
                  variant={searchEnabled ? "primaryOutline" : "ghost"}
                >
                  <GlobeIcon className="size-4" />
                </PromptInputButton>
              </TooltipTrigger>
              <TooltipContent hideArrow side="top" sideOffset={45}>
                Web search{" "}
                <KbdGroup>
                  {splitHotkey(HOTKEYS.toggleSearch).map((key, idx) => (
                    <Kbd key={idx}>{key}</Kbd>
                  ))}
                </KbdGroup>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <PromptInputButton
                  aria-label="Toggle memory"
                  onClick={() => onMemoryEnabledChange(!memoryEnabled)}
                  variant={memoryEnabled ? "primaryOutline" : "ghost"}
                >
                  <DatabaseIcon className="size-4" />
                </PromptInputButton>
              </TooltipTrigger>
              <TooltipContent hideArrow side="top" sideOffset={45}>
                Memory{" "}
                <KbdGroup>
                  {splitHotkey(HOTKEYS.toggleMemory).map((key, idx) => (
                    <Kbd key={idx}>{key}</Kbd>
                  ))}
                </KbdGroup>
              </TooltipContent>
            </Tooltip>
            {supportsReasoning ? (
              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <PromptInputButton
                        aria-label="Reasoning effort"
                        variant="ghost"
                      >
                        <BrainIcon className="size-4" />
                        <span className="text-xs">
                          {REASONING_LABELS[reasoningEffort]}
                        </span>
                      </PromptInputButton>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent hideArrow side="top" sideOffset={45}>
                    Reasoning depth{" "}
                    <KbdGroup>
                      {splitHotkey(HOTKEYS.cycleReasoning).map((key, idx) => (
                        <Kbd key={idx}>{key}</Kbd>
                      ))}
                    </KbdGroup>
                  </TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() => onReasoningEffortChange("low")}
                  >
                    <span className="font-medium">Quick</span>
                    <span className="ml-2 text-muted-foreground text-xs">
                      Fast responses
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onReasoningEffortChange("medium")}
                  >
                    <span className="font-medium">Balanced</span>
                    <span className="ml-2 text-muted-foreground text-xs">
                      Good depth
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onReasoningEffortChange("high")}
                  >
                    <span className="font-medium">Deep</span>
                    <span className="ml-2 text-muted-foreground text-xs">
                      Maximum thinking
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : null}
            {messages && messages.length > 0 && (
              <TokenUsageIndicator messages={messages} model={model} />
            )}
          </div>
          {/* Mobile: overflow menu for secondary actions */}
          <div className="md:hidden">
            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <PromptInputButton aria-label="More options">
                      <EllipsisIcon className="size-4" />
                    </PromptInputButton>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                <TooltipContent hideArrow side="top" sideOffset={45}>
                  More options
                </TooltipContent>
              </Tooltip>
              <DropdownMenuContent align="start">
                {messages && messages.length > 0 && (
                  <div className="px-2 py-1.5">
                    <TokenUsageIndicator messages={messages} model={model} />
                  </div>
                )}
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
                  <DatabaseIcon className="mr-2 size-4" />
                  {memoryEnabled ? "Disable memory" : "Enable memory"}
                </DropdownMenuItem>
                {supportsReasoning ? (
                  <DropdownMenuItem
                    onClick={() => {
                      const levels: ReasoningEffort[] = [
                        "low",
                        "medium",
                        "high",
                      ];
                      const currentIdx = levels.indexOf(reasoningEffort);
                      const nextIdx = (currentIdx + 1) % levels.length;
                      onReasoningEffortChange(levels[nextIdx]);
                    }}
                  >
                    <BrainIcon className="mr-2 size-4" />
                    Thinking: {REASONING_LABELS[reasoningEffort]}
                  </DropdownMenuItem>
                ) : null}
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
