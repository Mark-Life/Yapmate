import type { ChatStatus } from "ai";
import { GlassContainer, GlassView } from "expo-glass-effect";
import { useRouter } from "expo-router";
import {
  ArrowUpIcon,
  ChevronDown,
  Sparkles,
  SquareIcon,
  Trash2,
} from "lucide-react-native";
import { useRef, useState } from "react";
import type { TextInput } from "react-native";
import { Keyboard, Pressable, View } from "react-native";
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
  onClear?: () => void;
  hasMessages?: boolean;
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
  onClear,
  hasMessages = false,
}: GuestChatInputProps) => {
  const router = useRouter();
  const [_, setIsFocused] = useState(false);
  const textareaRef = useRef<TextInput>(null);

  const handleSubmit = () => {
    if (!input.trim() || status === "streaming" || status === "submitted") {
      return;
    }
    lightTap();
    onSubmit(input.trim());
  };

  const handleOpenModelSelector = () => {
    lightTap();
    textareaRef.current?.blur();
    Keyboard.dismiss();
    router.push("/model-selector");
  };

  const handleClear = () => {
    lightTap();
    onClear?.();
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
          isInteractive={true}
          style={{
            borderRadius: 32,
            padding: 0,
            overflow: "hidden",
          }}
        >
          <Pressable
            className="flex h-9 flex-row items-center gap-1.5 px-3 py-2"
            onPress={handleOpenModelSelector}
          >
            <Icon as={Sparkles} className="text-primary" size={14} />
            <Text className="text-foreground text-sm">Apple Intelligence</Text>
            <Icon
              as={ChevronDown}
              className="size-4 shrink-0 text-muted-foreground"
            />
          </Pressable>
        </GlassView>
        {hasMessages ? (
          <GlassView
            isInteractive={true}
            style={{
              borderRadius: 32,
              padding: 0,
              overflow: "hidden",
            }}
          >
            <Button onPress={handleClear} size="icon" variant="ghost">
              <Icon as={Trash2} className="text-primary" size={18} />
            </Button>
          </GlassView>
        ) : null}
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
