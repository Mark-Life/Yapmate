"use client";

import { cn } from "@yapmate/components/lib/utils";
import Streamdown from "streamdown";

export type TextBlockProps = {
  content: string;
  variant?: "body" | "heading" | "caption" | null;
};

export function TextBlock({ content, variant }: TextBlockProps) {
  return (
    <div
      className={cn(
        variant === "heading" && "font-semibold text-lg",
        variant === "caption" && "text-muted-foreground text-xs",
        variant === "body" && "text-sm"
      )}
    >
      <Streamdown>{content}</Streamdown>
    </div>
  );
}

export type ListProps = {
  items: string[];
  ordered?: boolean | null;
};

export function List({ items, ordered }: ListProps) {
  const Tag = ordered ? "ol" : "ul";
  return (
    <Tag
      className={cn(
        "space-y-1 text-sm",
        ordered ? "list-decimal pl-5" : "list-disc pl-5"
      )}
    >
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </Tag>
  );
}

export type KeyValuePair = {
  key: string;
  value: string;
};

export type KeyValueProps = {
  pairs: KeyValuePair[];
};

export function KeyValue({ pairs }: KeyValueProps) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
      {pairs.map((pair, i) => (
        <div key={i} className="contents">
          <dt className="font-medium text-muted-foreground">{pair.key}</dt>
          <dd>{pair.value}</dd>
        </div>
      ))}
    </dl>
  );
}
