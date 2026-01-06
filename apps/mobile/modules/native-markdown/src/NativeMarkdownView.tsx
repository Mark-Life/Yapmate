import { requireNativeViewManager } from "expo-modules-core";
import { Platform, type ViewStyle } from "react-native";

export type ContentSizeEvent = {
  nativeEvent: {
    width: number;
    height: number;
  };
};

export type ContextMenuActionEvent = {
  nativeEvent: {
    index: number;
    name: string;
  };
};

export type ContextMenuAction = {
  title: string;
  systemIcon: string;
};

export type NativeMarkdownViewProps = {
  content: string;
  style?: ViewStyle;
  onContentSizeChange?: (event: ContentSizeEvent) => void;
  /** Context menu actions (iOS native context menu) */
  contextMenuActions?: ContextMenuAction[];
  /** Callback when a context menu action is selected */
  onContextMenuAction?: (event: ContextMenuActionEvent) => void;
  /** Custom text color as hex string (e.g., "#FFFFFF") */
  textColor?: string;
  /** Background color for bubble styling (hex string) */
  backgroundColor?: string;
  /** Horizontal padding for bubble styling */
  paddingHorizontal?: number;
  /** Vertical padding for bubble styling */
  paddingVertical?: number;
  /** Border radius for bubble styling */
  borderRadius?: number;
  /** If true, aligns content to trailing edge (for user messages) */
  isUser?: boolean;
  /** Maximum width as percentage (0-100). Defaults to 95% for assistant, 85% for user */
  maxWidthPercentage?: number;
};

/**
 * Raw native iOS markdown view. Use NativeMarkdown wrapper for auto-sizing.
 */
export const NativeMarkdownView =
  Platform.OS === "ios"
    ? requireNativeViewManager<NativeMarkdownViewProps>("NativeMarkdown")
    : () => null;
