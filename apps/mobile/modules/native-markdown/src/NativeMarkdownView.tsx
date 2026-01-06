import { requireNativeViewManager } from "expo-modules-core";
import { Platform, type ViewStyle } from "react-native";

export type ContentSizeEvent = {
  nativeEvent: {
    width: number;
    height: number;
  };
};

export type NativeMarkdownViewProps = {
  content: string;
  style?: ViewStyle;
  onContentSizeChange?: (event: ContentSizeEvent) => void;
};

/**
 * Raw native iOS markdown view. Use NativeMarkdown wrapper for auto-sizing.
 */
export const NativeMarkdownView =
  Platform.OS === "ios"
    ? requireNativeViewManager<NativeMarkdownViewProps>("NativeMarkdown")
    : () => null;
