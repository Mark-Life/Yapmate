import type { ChatStatus } from "ai";
import { useState } from "react";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  status: ChatStatus;
  onSubmit: (text: string) => void;
  onStop?: () => void;
};

/**
 * Chat input component for React Native
 * Displays textarea and send/stop button
 */
export const ChatInput = ({
  input,
  onInputChange,
  status,
  onSubmit,
  onStop,
}: ChatInputProps) => {
  const [isFocused, setIsFocused] = useState(false);

  const handleSubmit = () => {
    if (!input.trim() || status === "streaming" || status === "submitted") {
      return;
    }
    onSubmit(input.trim());
  };

  const isStreaming = status === "streaming" || status === "submitted";
  const canSubmit = input.trim().length > 0 && !isStreaming;

  return (
    <View
      className={cn(
        "rounded-lg border border-border bg-background p-2",
        isFocused && "border-primary"
      )}
    >
      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <Textarea
            className="max-h-32 min-h-10"
            multiline
            numberOfLines={4}
            onBlur={() => setIsFocused(false)}
            onChangeText={onInputChange}
            onFocus={() => setIsFocused(true)}
            placeholder="Type a message..."
            value={input}
          />
        </View>
        {isStreaming ? (
          <Button
            disabled={!onStop}
            onPress={onStop}
            size="icon"
            variant="outline"
          >
            <Text>Stop</Text>
          </Button>
        ) : (
          <Button
            disabled={!canSubmit}
            onPress={handleSubmit}
            size="icon"
            variant="default"
          >
            <Text>Send</Text>
          </Button>
        )}
      </View>
    </View>
  );
};
