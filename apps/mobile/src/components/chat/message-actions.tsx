import {
  CheckIcon,
  CopyIcon,
  PencilIcon,
  RefreshCcwIcon,
  XIcon,
} from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { useRef } from "react";
import { Pressable } from "react-native";
import { lightTap } from "@/lib/haptics";
import { cn } from "@/lib/utils";

/**
 * Renders a copy button for messages
 */
const CopyButton = ({
  isCopied,
  onPress,
  alignRight = false,
}: {
  isCopied: boolean;
  onPress: () => void;
  alignRight?: boolean;
}) => {
  const { colorScheme } = useColorScheme();
  const IconComponent = isCopied ? CheckIcon : CopyIcon;
  const iconColor = colorScheme === "dark" ? "#a1a1aa" : "#71717a";

  return (
    <Pressable
      className={cn("rounded p-1", alignRight && "self-end")}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={onPress}
    >
      <IconComponent color={iconColor} size={14} />
    </Pressable>
  );
};

/**
 * Renders a retry button for messages
 */
const RetryButton = ({
  onPress,
  onLongPress,
  alignRight = false,
}: {
  onPress: () => void;
  onLongPress: () => void;
  alignRight?: boolean;
}) => {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#a1a1aa" : "#71717a";
  const longPressedRef = useRef(false);

  /**
   * Handle press - skip if long press was triggered
   */
  const handlePress = () => {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    lightTap();
    onPress();
  };

  /**
   * Handle long press - set flag to prevent onPress from firing
   */
  const handleLongPress = () => {
    longPressedRef.current = true;
    lightTap();
    onLongPress();
  };

  /**
   * Reset long press flag after touch ends
   */
  const handlePressOut = () => {
    setTimeout(() => {
      longPressedRef.current = false;
    }, 100);
  };

  return (
    <Pressable
      className={cn("rounded p-1", alignRight && "self-end")}
      delayLongPress={300}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onLongPress={handleLongPress}
      onPress={handlePress}
      onPressOut={handlePressOut}
    >
      <RefreshCcwIcon color={iconColor} size={14} />
    </Pressable>
  );
};

/**
 * Renders an edit button for user messages
 */
const EditButton = ({
  disabled = false,
  onPress,
  alignRight = false,
}: {
  disabled?: boolean;
  onPress: () => void;
  alignRight?: boolean;
}) => {
  const { colorScheme } = useColorScheme();
  const iconColor = colorScheme === "dark" ? "#a1a1aa" : "#71717a";

  return (
    <Pressable
      className={cn(
        "rounded p-1",
        alignRight && "self-end",
        disabled && "opacity-50"
      )}
      disabled={disabled}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={() => {
        lightTap();
        onPress();
      }}
    >
      <PencilIcon color={iconColor} size={14} />
    </Pressable>
  );
};

/**
 * Renders edit action buttons (Cancel and Save)
 */
export const EditActions = ({
  isUser,
  hasChanges,
  iconColor,
  onCancel,
  onSave,
}: {
  isUser: boolean;
  hasChanges: boolean;
  iconColor: string;
  onCancel: () => void;
  onSave: () => void;
}) => (
  <>
    <Pressable
      className={cn("rounded p-1", isUser && "self-end")}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={() => {
        lightTap();
        onCancel();
      }}
    >
      <XIcon color={iconColor} size={16} />
    </Pressable>
    <Pressable
      className={cn(
        "rounded p-1",
        isUser && "self-end",
        !hasChanges && "opacity-50"
      )}
      disabled={!hasChanges}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      onPress={() => {
        lightTap();
        onSave();
      }}
    >
      <CheckIcon color={iconColor} size={16} />
    </Pressable>
  </>
);

/**
 * Renders normal action buttons (Copy, Retry, Edit)
 */
export const NormalActions = ({
  isUser,
  isCopied,
  canRegenerate,
  canEdit,
  isStreaming,
  textContent,
  partId,
  messageId,
  messageRole,
  onCopy,
  onRegenerate,
  onRequestModelForRegeneration,
  onStartEdit,
}: {
  isUser: boolean;
  isCopied: boolean;
  canRegenerate: boolean;
  canEdit: boolean;
  isStreaming: boolean;
  textContent: string;
  partId: string;
  messageId: string;
  messageRole: "user" | "assistant";
  onCopy: (text: string, partId: string) => void;
  onRegenerate?: (messageId: string, role: "user" | "assistant") => void;
  onRequestModelForRegeneration?: (
    messageId: string,
    role: "user" | "assistant"
  ) => void;
  onStartEdit: (messageId: string) => void;
}) => (
  <>
    <CopyButton
      alignRight={isUser}
      isCopied={isCopied}
      onPress={() => onCopy(textContent, partId)}
    />
    {canRegenerate ? (
      <RetryButton
        alignRight={isUser}
        onLongPress={() =>
          onRequestModelForRegeneration?.(messageId, messageRole)
        }
        onPress={() => onRegenerate?.(messageId, messageRole)}
      />
    ) : null}
    {canEdit ? (
      <EditButton
        alignRight={isUser}
        disabled={isStreaming}
        onPress={() => onStartEdit(messageId)}
      />
    ) : null}
  </>
);
