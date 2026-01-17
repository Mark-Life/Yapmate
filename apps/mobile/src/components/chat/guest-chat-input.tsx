import type { ChatStatus } from "ai";
import { GlassContainer, GlassView } from "expo-glass-effect";
import { ArrowUpIcon, SquareIcon, Sparkles } from "lucide-react-native";
import { useRef, useState } from "react";
import type { TextInput } from "react-native";
import { View } from "react-native";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Text } from "@/components/ui/text";
import { Textarea } from "@/components/ui/textarea";
import { lightTap } from "@/lib/haptics";

type GuestChatInputProps = {
  input: string;
  onInputChange: (value: string) => void;
  status: ChatStatus;
  onSubmit: (text: string) => void;
  onStop?: () => void;
};

/**
 * Simplified chat input for guest users
 * Only textarea + send/stop button, no model selector, attachments, search, voice
 */
export const GuestChatInput = ({
  input,
  onInputChange,
  status,
  onSubmit,
  onStop,
}: GuestChatInputProps) => {
  const [_, setIsFocused] = useState(false);
  const textareaRef = useRef<TextInput>(null);

  const handleSubmit = () => {
    if (!input.trim() || status === "streaming" || status === "submitted") {
      return;
    }
    lightTap();
    onSubmit(input.trim());
  };

  const isStreaming = status === "streaming" || status === "submitted";
  const canSubmit = input.trim().length > 0 && !isStreaming;

  return (
    <GlassContainer
      spacing={8}
      style={{
        borderRadius: 24,
        padding: 8,
        paddingBottom: 0,
      }}
    >
      <View className="mb-2 flex-row items-center gap-2">
        <GlassView
          isInteractive={false}
          style={{
            borderRadius: 32,
            padding: 0,
            paddingHorizontal: 12,
            paddingVertical: 8,
            overflow: "hidden",
          }}
        >
          <View className="flex-row items-center gap-1.5">
            <Icon as={Sparkles} className="text-primary" size={14} />
            <Text className="text-primary text-sm">Apple Intelligence</Text>
          </View>
        </GlassView>
      </View>
      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <GlassView
            isInteractive={true}
            style={{
              borderRadius: 32,
              padding: 0,
              overflow: "hidden",
            }}
          >
            <Textarea
              className="max-h-32 min-h-10 rounded-none border-0 bg-transparent text-sm"
              multiline
              numberOfLines={5}
              onBlur={() => setIsFocused(false)}
              onChangeText={onInputChange}
              onFocus={() => setIsFocused(true)}
              placeholder="Message..."
              ref={textareaRef}
              value={input}
            />
          </GlassView>
        </View>
        <GlassView
          isInteractive={true}
          style={{
            borderRadius: 32,
            padding: 0,
            overflow: "hidden",
          }}
        >
          {isStreaming ? (
            <Button
              disabled={!onStop}
              onPress={() => {
                lightTap();
                onStop?.();
              }}
              size="icon"
              variant="ghost"
            >
              <Icon as={SquareIcon} className="text-primary" size={20} />
            </Button>
          ) : (
            <Button disabled={!canSubmit} onPress={handleSubmit} size="icon">
              <Icon
                as={ArrowUpIcon}
                className="text-primary-foreground"
                size={20}
              />
            </Button>
          )}
        </GlassView>
      </View>
    </GlassContainer>
  );
};
