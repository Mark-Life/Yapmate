import { marked, type Token, type Tokens } from "marked";
import { memo, type ReactNode, useMemo } from "react";
import { Linking, View } from "react-native";
import remend from "remend";
import { cn } from "src/lib/utils";
import { CodeBlock } from "./code-block";
import { Text, TextClassContext } from "./text";

type StreamingMarkdownProps = {
  content: string;
  className?: string;
  /** Base text className applied to all text elements */
  textClassName?: string;
};

// ============================================================================
// Inline Token Renderers
// ============================================================================

/**
 * Renders inline tokens (bold, italic, code, links, etc.)
 */
const renderInlineTokens = (tokens: Token[] | undefined): ReactNode[] => {
  if (!tokens) {
    return [];
  }

  return tokens.map((token, idx) => {
    const key = `inline-${idx}`;

    switch (token.type) {
      case "strong":
        return (
          <Text className="font-bold" key={key}>
            {renderInlineTokens((token as Tokens.Strong).tokens)}
          </Text>
        );

      case "em":
        return (
          <Text className="italic" key={key}>
            {renderInlineTokens((token as Tokens.Em).tokens)}
          </Text>
        );

      case "del":
        return (
          <Text className="line-through" key={key}>
            {renderInlineTokens((token as Tokens.Del).tokens)}
          </Text>
        );

      case "codespan":
        return (
          <Text className="bg-accent px-2 py-1 font-mono text-sm" key={key}>
            {(token as Tokens.Codespan).text}
          </Text>
        );

      case "link": {
        const linkToken = token as Tokens.Link;
        return (
          <Text
            className="text-primary underline"
            key={key}
            onPress={() => Linking.openURL(linkToken.href)}
          >
            {renderInlineTokens(linkToken.tokens)}
          </Text>
        );
      }

      case "text": {
        const textToken = token as Tokens.Text;
        // If text token has nested tokens, render them recursively
        if (textToken.tokens && textToken.tokens.length > 0) {
          return renderInlineTokens(textToken.tokens);
        }
        return textToken.text;
      }

      case "br":
        return "\n";

      case "escape":
        return (token as Tokens.Escape).text;

      default:
        // Fallback for unhandled inline tokens
        if ("text" in token) {
          return (token as { text: string }).text;
        }
        return null;
    }
  });
};

// ============================================================================
// Block Token Renderers
// ============================================================================

/**
 * Renders a single block token
 */
const BlockToken = memo(({ token }: { token: Token }) => {
  switch (token.type) {
    case "paragraph":
      return (
        <Text className="mb-2 leading-6">
          {renderInlineTokens((token as Tokens.Paragraph).tokens)}
        </Text>
      );

    case "heading": {
      const heading = token as Tokens.Heading;
      const headingStyles: Record<number, string> = {
        1: "text-2xl font-bold mb-3 mt-4",
        2: "text-xl font-bold mb-2 mt-3",
        3: "text-lg font-semibold mb-2 mt-2",
        4: "text-base font-semibold mb-1 mt-2",
        5: "text-sm font-semibold mb-1 mt-1",
        6: "text-sm font-medium mb-1 mt-1",
      };
      return (
        <Text className={headingStyles[heading.depth] ?? headingStyles[6]}>
          {renderInlineTokens(heading.tokens)}
        </Text>
      );
    }

    case "code": {
      const codeToken = token as Tokens.Code;
      return (
        <CodeBlock code={codeToken.text} language={codeToken.lang ?? "text"} />
      );
    }

    case "blockquote": {
      const quote = token as Tokens.Blockquote;
      return (
        <View className="my-2 border-muted-foreground/30 border-l-4 pl-3">
          {quote.tokens?.map((t, idx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: tokens lack stable IDs
            <BlockToken key={`quote-${idx}`} token={t} />
          ))}
        </View>
      );
    }

    case "list": {
      const list = token as Tokens.List;
      return (
        <View className="my-2 pl-2">
          {list.items.map((item, idx) => (
            <ListItem
              index={idx}
              isOrdered={list.ordered}
              item={item}
              // biome-ignore lint/suspicious/noArrayIndexKey: tokens lack stable IDs
              key={`list-${idx}`}
            />
          ))}
        </View>
      );
    }

    case "hr":
      return <View className="my-4 h-px bg-border" />;

    case "table": {
      const table = token as Tokens.Table;
      return <TableRenderer table={table} />;
    }

    case "space":
      return null;

    case "text": {
      const textToken = token as Tokens.Text;
      if (textToken.tokens && textToken.tokens.length > 0) {
        return <Text>{renderInlineTokens(textToken.tokens)}</Text>;
      }
      return <Text>{textToken.text}</Text>;
    }

    default:
      // Fallback: render as text if has raw content
      if ("raw" in token) {
        return <Text>{(token as { raw: string }).raw}</Text>;
      }
      return null;
  }
});

BlockToken.displayName = "BlockToken";

// ============================================================================
// List Item Renderer
// ============================================================================

type ListItemProps = {
  item: Tokens.ListItem;
  index: number;
  isOrdered: boolean;
};

const ListItem = memo(({ item, index, isOrdered }: ListItemProps) => {
  const bullet = isOrdered ? `${index + 1}.` : "•";

  // Check if it's a task list item
  if (item.task) {
    return (
      <View className="mb-1 flex-row">
        <Text className="mr-1 w-4">{item.checked ? "☑" : "☐"}</Text>
        <View className="flex-1">
          {item.tokens?.map((t, idx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: tokens lack stable IDs
            <BlockToken key={`task-${idx}`} token={t} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View className="mb-1 flex-row">
      <Text className="mr-1 w-3 text-muted-foreground">{bullet}</Text>
      <View className="flex-1">
        {item.tokens?.map((t, idx) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: tokens lack stable IDs
          <BlockToken key={`item-${idx}`} token={t} />
        ))}
      </View>
    </View>
  );
});

ListItem.displayName = "ListItem";

// ============================================================================
// Table Renderer
// ============================================================================

type TableRendererProps = {
  table: Tokens.Table;
};

const TableRenderer = memo(({ table }: TableRendererProps) => (
  <View className="my-2 overflow-hidden rounded-md border border-border">
    {/* Header row */}
    <View className="flex-row bg-muted">
      {table.header.map((cell, idx) => (
        <View
          className="flex-1 border-border border-r p-2 last:border-r-0"
          // biome-ignore lint/suspicious/noArrayIndexKey: tokens lack stable IDs
          key={`header-${idx}`}
        >
          <Text className="font-semibold">
            {renderInlineTokens(cell.tokens)}
          </Text>
        </View>
      ))}
    </View>
    {/* Body rows */}
    {table.rows.map((row, rowIdx) => (
      // biome-ignore lint/suspicious/noArrayIndexKey: tokens lack stable IDs
      <View className="flex-row border-border border-t" key={`row-${rowIdx}`}>
        {row.map((cell, cellIdx) => (
          <View
            className="flex-1 border-border border-r p-2 last:border-r-0"
            // biome-ignore lint/suspicious/noArrayIndexKey: tokens lack stable IDs
            key={`cell-${rowIdx}-${cellIdx}`}
          >
            <Text>{renderInlineTokens(cell.tokens)}</Text>
          </View>
        ))}
      </View>
    ))}
  </View>
));

TableRenderer.displayName = "TableRenderer";

// ============================================================================
// Main Component
// ============================================================================

/**
 * Streaming-aware markdown renderer for React Native.
 * Uses remend to handle incomplete markdown during streaming,
 * and marked for parsing.
 */
export const StreamingMarkdown = memo(
  ({ content, className, textClassName }: StreamingMarkdownProps) => {
    // Fix incomplete markdown blocks (e.g., unclosed **bold)
    const fixedContent = useMemo(() => remend(content), [content]);

    // Parse markdown to tokens
    const tokens = useMemo(() => {
      try {
        return marked.lexer(fixedContent, { gfm: true });
      } catch {
        return [];
      }
    }, [fixedContent]);

    return (
      <TextClassContext.Provider value={textClassName}>
        <View className={cn(className)}>
          {tokens.map((token, idx) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: tokens lack stable IDs
            <BlockToken key={`block-${idx}`} token={token} />
          ))}
        </View>
      </TextClassContext.Provider>
    );
  }
);

StreamingMarkdown.displayName = "StreamingMarkdown";
