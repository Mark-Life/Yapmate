import { useRef } from "react";
import { Pressable, View } from "react-native";
import ContextMenu from "react-native-context-menu-view";
import { Text } from "@/components/ui/text";
import { cn } from "@/lib/utils";

type ChatListItemProps = {
  id: string;
  title: string | null;
  updatedAt: Date | string | null;
  isActive?: boolean;
  onPress: () => void;
  onRename: () => void;
  onDelete: () => void;
};

/**
 * Context menu actions for chat list items
 */
const CONTEXT_MENU_ACTIONS = [
  { title: "Rename", systemIcon: "pencil" },
  { title: "Delete", systemIcon: "trash", destructive: true },
];

/**
 * Chat list item component
 * Displays chat title and handles navigation on press
 * Supports long press for context menu with rename/delete actions
 */
export const ChatListItem = ({
  id: _id,
  title,
  updatedAt,
  isActive = false,
  onPress,
  onRename,
  onDelete,
}: ChatListItemProps) => {
  const displayTitle = title ?? "New chat";
  const longPressedRef = useRef(false);

  /**
   * Handle tap - skip if long press was triggered
   */
  const handlePress = () => {
    if (longPressedRef.current) {
      longPressedRef.current = false;
      return;
    }
    onPress();
  };

  /**
   * Handle long press - set flag to prevent onPress from firing
   */
  const handleLongPress = () => {
    longPressedRef.current = true;
  };

  /**
   * Handle context menu action selection
   */
  const handleContextMenuPress = (event: {
    nativeEvent: { index: number; name: string };
  }) => {
    const { index } = event.nativeEvent;
    if (index === 0) {
      onRename();
    } else if (index === 1) {
      onDelete();
    }
  };

  return (
    <ContextMenu
      actions={CONTEXT_MENU_ACTIONS}
      onPress={handleContextMenuPress}
    >
      <Pressable onLongPress={handleLongPress} onPress={handlePress}>
        <View
          className={cn(
            "flex-row items-center justify-between rounded-lg bg-background p-2 px-3",
            isActive && "bg-accent"
          )}
        >
          <View className="flex-1">
            <Text className="text-sm" variant="default">
              {displayTitle}
            </Text>
            {updatedAt !== null && updatedAt !== undefined && (
              <Text className="text-xs" variant="muted">
                {formatDate(updatedAt)}
              </Text>
            )}
          </View>
        </View>
      </Pressable>
    </ContextMenu>
  );
};

/**
 * Formats date for display
 * Shows relative time if recent, otherwise absolute date
 * Handles both Date objects and date strings
 */
const formatDate = (date: Date | string): string => {
  const dateObj = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) {
    return "Just now";
  }
  if (diffMins < 60) {
    return `${diffMins}m ago`;
  }
  if (diffHours < 24) {
    return `${diffHours}h ago`;
  }
  if (diffDays < 7) {
    return `${diffDays}d ago`;
  }

  // For older dates, show formatted date
  return dateObj.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: dateObj.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
};
