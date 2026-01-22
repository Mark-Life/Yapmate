import type { ChatStatus, FileUIPart } from "ai";
import { ArrowUpIcon, GlobeIcon, SquareIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useEffect, useRef, useState } from "react";
import type { TextInput } from "react-native";
import { Keyboard, View } from "react-native";
import { ModelSelector } from "@/components/model-selector";
import { Button } from "@/components/ui/button";
import {
  GlassContainerWrapper,
  GlassWrapper,
} from "@/components/ui/glass-wrapper";
import { Icon } from "@/components/ui/icon";
import { Textarea } from "@/components/ui/textarea";
import { AnalyticsEvents, useAnalytics } from "@/hooks/use-analytics";
import type { AttachmentsContext } from "@/hooks/use-attachments";
import { lightTap } from "@/lib/haptics";
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
  isNew?: boolean;
  disableSearch?: boolean;
};

/**
 * Chat input component for React Native
 * Displays model selector, textarea and send/stop button
 */
export const ChatInput = ({
  input,
  onInputChange,
  model,
  searchEnabled,
  onSearchEnabledChange,
  status,
  onSubmit,
  onStop,
  attachments,
  isNew = false,
  disableSearch = false,
}: ChatInputProps) => {
  const [_, setIsFocused] = useState(false);
  const { colorScheme } = useColorScheme();
  const textareaRef = useRef<TextInput>(null);
  const { capture } = useAnalytics();

  /**
   * Focus input when it's a new chat
   */
  useEffect(() => {
    if (isNew && textareaRef.current) {
      // Small delay to ensure component is fully mounted
      const timeoutId = setTimeout(() => {
        textareaRef.current?.focus();
      }, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isNew]);

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

    lightTap();
    // Prepare files for submission
    const files = await attachments.prepareForSubmit();
    onSubmit({ text: input.trim(), files });
  };

  const isStreaming = status === "streaming" || status === "submitted";
  const hasText = input.trim().length > 0;
  const hasAttachments = attachments.files.length > 0;
  const canSubmit = (hasText || hasAttachments) && !isStreaming;

  let searchButtonTintColor: string | undefined;
  if (searchEnabled) {
    searchButtonTintColor = colorScheme === "dark" ? "#47d1cd" : "#1375a0";
  }

  return (
    <GlassContainerWrapper
      spacing={8}
      style={{
        borderRadius: 24,
        padding: 8,
        paddingBottom: 0,
      }}
    >
      {hasAttachments ? (
        <AttachmentPreviewList
          attachments={attachments.files}
          onRemove={attachments.remove}
        />
      ) : null}
      <View className="mb-2 flex-row items-center gap-2">
        <View className="flex-1">
          <GlassWrapper
            style={{ borderRadius: 32, padding: 0, overflow: "hidden" }}
          >
            <ModelSelector
              model={model}
              onOpen={() => {
                // Blur chat input when model selector opens
                textareaRef.current?.blur();
                Keyboard.dismiss();
              }}
              triggerClassName="border-0 bg-transparent rounded-none"
            />
          </GlassWrapper>
        </View>
        <GlassWrapper
          style={{ borderRadius: 32, padding: 0, overflow: "hidden" }}
        >
          <AttachmentPicker attachments={attachments} />
        </GlassWrapper>
        {!disableSearch && (
          <GlassWrapper
            style={{ borderRadius: 32, padding: 0, overflow: "hidden" }}
            tintColor={searchButtonTintColor}
          >
            <Button
              aria-label="Toggle search"
              className="transition-all duration-200"
              onPress={() => {
                lightTap();
                capture(AnalyticsEvents.SEARCH_TOGGLED, {
                  enabled: !searchEnabled,
                });
                onSearchEnabledChange(!searchEnabled);
              }}
              size="icon"
              variant="ghost"
            >
              <Icon
                as={GlobeIcon}
                className={cn(
                  "size-4",
                  searchEnabled ? "text-primary-foreground" : "text-primary"
                )}
              />
            </Button>
          </GlassWrapper>
        )}
        <GlassWrapper
          style={{ borderRadius: 32, padding: 0, overflow: "hidden" }}
        >
          <TranscribeButton
            onTranscriptionChange={(text) => {
              const currentValue = input.trim();
              const newValue = currentValue ? `${currentValue} ${text}` : text;
              onInputChange(newValue);
            }}
          />
        </GlassWrapper>
      </View>
      <View className="flex-row items-end gap-2">
        <View className="flex-1">
          <GlassWrapper
            glassEffectStyle="regular"
            style={{ borderRadius: 32, padding: 0, overflow: "hidden" }}
          >
            <Textarea
              className="max-h-64 min-h-10 rounded-none border-0 bg-transparent text-sm"
              multiline
              numberOfLines={12}
              onBlur={() => setIsFocused(false)}
              onChangeText={onInputChange}
              onFocus={() => setIsFocused(true)}
              placeholder="Message..."
              ref={textareaRef}
              value={input}
            />
          </GlassWrapper>
        </View>
        <GlassWrapper
          style={{ borderRadius: 32, padding: 0, overflow: "hidden" }}
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
        </GlassWrapper>
      </View>
    </GlassContainerWrapper>
  );
};
