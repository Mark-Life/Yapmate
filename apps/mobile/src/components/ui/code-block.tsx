// TODO: fix code block horizontal scroll - ScrollView inside FlatList breaks rendering
// TODO: re-enable Shiki syntax highlighting after fixing scroll issue
// import type { ThemedToken } from "@shikijs/core";
import * as Clipboard from "expo-clipboard";
import { CheckIcon, CopyIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { memo, useCallback, useState } from "react";
import { Pressable, View } from "react-native";
// import { DARK_THEME, getHighlighter, LIGHT_THEME } from "src/lib/highlighter";
import { lightTap } from "@/lib/haptics";
import { Text } from "./text";

type CodeBlockProps = {
  code: string;
  language?: string;
};

type CodeBlockHeaderProps = {
  language: string;
  code: string;
};

/**
 * Renders the code block header with language label and copy button
 */
const CodeBlockHeader = memo(({ language, code }: CodeBlockHeaderProps) => {
  const [isCopied, setIsCopied] = useState(false);
  const { colorScheme } = useColorScheme();

  const handleCopy = useCallback(async () => {
    lightTap();
    await Clipboard.setStringAsync(code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  }, [code]);

  const Icon = isCopied ? CheckIcon : CopyIcon;
  const iconColor = colorScheme === "dark" ? "#a1a1aa" : "#71717a";

  return (
    <View className="flex-row items-center justify-between border-border border-b px-3 py-2">
      <Text className="font-mono text-foreground text-xs">{language}</Text>
      <Pressable className="rounded p-1" onPress={handleCopy}>
        <Icon color={iconColor} size={14} />
      </Pressable>
    </View>
  );
});

CodeBlockHeader.displayName = "CodeBlockHeader";

/**
 * Code block component with language header and copy button.
 * TODO: Re-enable Shiki syntax highlighting once the rendering bug is fixed.
 */
export const CodeBlock = memo(({ code, language = "text" }: CodeBlockProps) => (
  <View className="my-2 overflow-hidden rounded-md border border-border bg-background">
    <CodeBlockHeader code={code} language={language} />
    <View className="p-3">
      <Text className="font-mono text-sm">{code}</Text>
    </View>
  </View>
));

CodeBlock.displayName = "CodeBlock";
