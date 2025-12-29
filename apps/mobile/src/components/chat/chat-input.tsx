import type { ChatStatus } from "ai";
import { ArrowUpIcon, GlobeIcon, SquareIcon } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { ModelSelector } from "@/components/model-selector";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { TranscribeButton } from "./transcribe-button";

type ChatInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  model: string;
  onModelChange: (model: string) => void;
  searchEnabled: boolean;
  onSearchEnabledChange: (enabled: boolean) => void;
  status: ChatStatus;
  onSubmit: (text: string) => void;
  onStop?: () => void;
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
  portalHost,
}: ChatInputProps) => {
  const [_, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (!input.trim() || status === "streaming" || status === "submitted") {
      return;
    }
    onSubmit(input.trim());
  };

  // Check if input is multiline by checking for newlines
  const isMultiline = input.includes("\n");

  const isStreaming = status === "streaming" || status === "submitted";
  const canSubmit = input.trim().length > 0 && !isStreaming;

  return (
    <View className={cn("rounded-3xl border border-input bg-background p-2")}>
      <View className="mb-2 flex-row items-center gap-2">
        <View className="flex-1">
          <ModelSelector
            model={model}
            onModelChange={onModelChange}
            portalHost={portalHost}
          />
        </View>
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
            <ArrowUpIcon className="size-4" />
          </Button>
        )}
      </View>
    </View>
  );
};
