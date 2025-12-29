import type { ThemedToken } from "@shikijs/core";
import * as Clipboard from "expo-clipboard";
import { CheckIcon, CopyIcon } from "lucide-react-native";
import { useColorScheme } from "nativewind";
import { memo, useCallback, useEffect, useState } from "react";
import { Pressable, ScrollView, View } from "react-native";
import { DARK_THEME, getHighlighter, LIGHT_THEME } from "src/lib/highlighter";
import { Text } from "./text";

type CodeBlockProps = {
  code: string;
  language?: string;
};

type TokenLineProps = {
  tokens: ThemedToken[];
  lineIndex: number;
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
 * Renders a single line of highlighted tokens
 */
const TokenLine = memo(({ tokens, lineIndex }: TokenLineProps) => (
  <View className="flex-row" key={`line-${lineIndex}`}>
    {tokens.map((token, tokenIndex) => (
      <Text
        className="font-mono text-sm"
        // biome-ignore lint/suspicious/noArrayIndexKey: tokens lack stable IDs
        key={`token-${lineIndex}-${tokenIndex}`}
        style={{ color: token.color }}
      >
        {token.content}
      </Text>
    ))}
  </View>
));

TokenLine.displayName = "TokenLine";

/**
 * Code block component with Shiki syntax highlighting.
 * Includes header with language label and copy button.
 */
export const CodeBlock = memo(({ code, language = "text" }: CodeBlockProps) => {
  const { colorScheme } = useColorScheme();
  const [tokens, setTokens] = useState<ThemedToken[][] | null>(null);
  const [error, setError] = useState<boolean>(false);

  const theme = colorScheme === "dark" ? DARK_THEME : LIGHT_THEME;

  useEffect(() => {
    let mounted = true;

    getHighlighter()
      .then((highlighter) => {
        if (!mounted) {
          return;
        }

        // Check if language is supported, fallback to text
        const loadedLangs = highlighter.getLoadedLanguages();
        const lang = loadedLangs.includes(language) ? language : "text";

        const result = highlighter.codeToTokens(code, {
          lang,
          theme,
        });
        setTokens(result.tokens);
      })
      .catch(() => {
        if (mounted) {
          setError(true);
        }
      });

    return () => {
      mounted = false;
    };
  }, [code, language, theme]);

  // Error or loading fallback: plain monospace text with header
  if (error || !tokens) {
    return (
      <View className="my-2 overflow-hidden rounded-md border border-border bg-background">
        <CodeBlockHeader code={code} language={language} />
        <View className="p-3">
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <Text className="font-mono text-sm">{code}</Text>
          </ScrollView>
        </View>
      </View>
    );
  }

  return (
    <View className="my-2 overflow-hidden rounded-md border border-border bg-background">
      <CodeBlockHeader code={code} language={language} />
      <View className="p-3">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {tokens.map((lineTokens, lineIndex) => (
              <TokenLine
                // biome-ignore lint/suspicious/noArrayIndexKey: lines lack stable IDs
                key={`line-${lineIndex}`}
                lineIndex={lineIndex}
                tokens={lineTokens}
              />
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
});

CodeBlock.displayName = "CodeBlock";
