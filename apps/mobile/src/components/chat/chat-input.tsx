import type { ChatStatus } from "ai";
import { ArrowUpIcon, SquareIcon } from "lucide-react-native";
import { useState } from "react";
import { View } from "react-native";
import { ModelSelector } from "@/components/model-selector";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  model: string;
  onModelChange: (model: string) => void;
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
  status,
  onSubmit,
  onStop,
  portalHost,
}: ChatInputProps) => {
  const [isFocused, setIsFocused] = useState(false);

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
    <View
      className={cn(
        "rounded-lg bg-background p-2",
        isFocused && "border-primary"
      )}
    >
      <View className="mb-2">
        <ModelSelector
          model={model}
          onModelChange={onModelChange}
          portalHost={portalHost}
        />
      </View>
      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <Textarea
            className={cn(
              "max-h-32 min-h-10 text-sm",
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
            className="rounded-full"
            disabled={!onStop}
            onPress={onStop}
            size="icon"
            variant="outline"
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
