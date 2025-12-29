import type { ChatStatus, FileUIPart } from "ai";
import { ArrowUpIcon, GlobeIcon, SquareIcon } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { ModelSelector } from "@/components/model-selector";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import type { AttachmentsContext } from "@/hooks/use-attachments";
import { cn } from "@/lib/utils";
import { AttachmentPicker } from "./attachment-picker";
import { AttachmentPreviewList } from "./attachment-preview";
import { TranscribeButton } from "./transcribe-button";

type ChatInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  searchEnabled: boolean;
  onSearchEnabledChange: (enabled: boolean) => void;
  status: ChatStatus;
  onSubmit: (message: { text: string; files: FileUIPart[] }) => void;
  onStop?: () => void;
  attachments: AttachmentsContext;
  /** Portal host name for model selector popover */
  portalHost?: string;
};

/**
 * Chat input component for React Native
 * Displays model selector, textarea and send/stop button
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
  attachments,
  portalHost,
}: ChatInputProps) => {
  const [_, setIsFocused] = useState(false);

  const handleSubmit = async () => {
    const hasText = Boolean(input.trim());
    const hasAttachments = attachments.files.length > 0;
    if (
      !(hasText || hasAttachments) ||
      status === "streaming" ||
      status === "submitted"
    ) {
      return;
    }

    // Prepare files for submission
    const files = await attachments.prepareForSubmit();
    onSubmit({ text: input.trim(), files });
  };

  // Check if input is multiline by checking for newlines
  const isMultiline = input.includes("\n");

  const isStreaming = status === "streaming" || status === "submitted";
  const hasText = input.trim().length > 0;
  const hasAttachments = attachments.files.length > 0;
  const canSubmit = (hasText || hasAttachments) && !isStreaming;

  return (
    <View className={cn("rounded-3xl border border-input bg-background p-2")}>
      {hasAttachments ? (
        <AttachmentPreviewList
          attachments={attachments.files}
          onRemove={attachments.remove}
        />
      ) : null}
      <View className="mb-2 flex-row items-center gap-2">
        <View className="flex-1">
          <ModelSelector
            model={model}
            onModelChange={onModelChange}
            portalHost={portalHost}
          />
        </View>
        <AttachmentPicker attachments={attachments} />
        <Button
          aria-label="Toggle search"
          className={cn(
            "rounded-full transition-all duration-200",
            searchEnabled && "bg-primary text-primary-foreground"
          )}
          onPress={() => onSearchEnabledChange(!searchEnabled)}
          size="icon"
          variant="outline"
        >
          <Icon
            as={GlobeIcon}
            className={cn(
              "size-4",
              searchEnabled ? "text-primary-foreground" : "text-primary"
            )}
          />
        </Button>
        <TranscribeButton
          onTranscriptionChange={(text) => {
            const currentValue = input.trim();
            const newValue = currentValue ? `${currentValue} ${text}` : text;
            onInputChange(newValue);
          }}
        />
      </View>
      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <Textarea
            className={cn(
              "max-h-32 min-h-10 bg-background text-sm",
              isMultiline ? "rounded-3xl" : "rounded-full"
            )}
            multiline
            numberOfLines={5}
            onBlur={() => setIsFocused(false)}
            onChangeText={onInputChange}
            onFocus={() => setIsFocused(true)}
            placeholder="Message..."
            value={input}
          />
        </View>
        {isStreaming ? (
          <Button
            className="rounded-full bg-secondary"
            disabled={!onStop}
            onPress={onStop}
            size="icon"
          >
            <SquareIcon className="size-4" />
          </Button>
        ) : (
          <Button
            className="rounded-full"
            disabled={!canSubmit}
            onPress={handleSubmit}
            size="icon"
            variant="default"
          >
            <Icon
              as={ArrowUpIcon}
              className="text-primary-foreground"
              size={20}
            />
          </Button>
        )}
      </View>
    </View>
  );
};
