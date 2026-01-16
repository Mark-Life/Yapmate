"use client";

import type { ReactNode } from "react";
import { componentRegistry } from "./registry";

type UIElement = {
  key: string;
  type: string;
  props: Record<string, unknown>;
  children?: string[];
  parentKey?: string | null;
};

type UITree = {
  root: string;
  elements: Record<string, UIElement> | UIElement[];
};

export type GenerativeUIRendererProps = {
  tree: UITree | Partial<UITree>;
  className?: string;
  /** Whether the tree is still being streamed */
  isStreaming?: boolean;
};

/**
 * Normalizes elements to a Record format.
 * Handles both array format (from some AI outputs) and record format.
 */
function normalizeElements(
  elements: Record<string, UIElement> | UIElement[] | undefined
): Record<string, UIElement> {
  if (!elements) {
    return {};
  }

  // If already a record/object (not an array), return as-is
  if (!Array.isArray(elements)) {
    return elements;
  }

  // Convert array to record keyed by element.key
  return elements.reduce<Record<string, UIElement>>((acc, element) => {
    if (element && element.key) {
      acc[element.key] = element;
    }
    return acc;
  }, {});
}

/** Skeleton placeholder for elements still loading */
function ElementSkeleton({ type }: { type?: string }) {
  return (
    <div className="animate-pulse rounded-md bg-muted/50 p-4">
      <div className="flex items-center gap-2">
        <div className="size-3 rounded-full bg-muted-foreground/20" />
        <div className="h-3 w-24 rounded bg-muted-foreground/20" />
      </div>
      {type && (
        <div className="mt-2 text-muted-foreground/50 text-xs">{type}</div>
      )}
    </div>
  );
}

function renderElement(
  elementKey: string,
  elements: Record<string, UIElement>,
  isStreaming?: boolean
): ReactNode {
  const element = elements[elementKey];
  if (!element) {
    // During streaming, elements may not be available yet - show skeleton
    if (isStreaming) {
      return <ElementSkeleton key={elementKey} />;
    }
    return null;
  }

  const Component = componentRegistry[element.type];
  if (!Component) {
    console.warn(`Unknown component type: ${element.type}`);
    return (
      <div
        className="rounded border border-dashed border-yellow-500 p-2 text-yellow-600 text-xs"
        key={element.key}
      >
        Unknown component: {element.type}
      </div>
    );
  }

  const childElements = element.children?.map((childKey) =>
    renderElement(childKey, elements, isStreaming)
  );

  return (
    <Component key={element.key} {...element.props}>
      {childElements}
    </Component>
  );
}

export function GenerativeUIRenderer({
  tree,
  className,
  isStreaming = false,
}: GenerativeUIRendererProps) {
  if (!tree || !tree.root) {
    return (
      <div className="flex items-center gap-2 rounded border border-dashed border-muted-foreground p-4 text-muted-foreground text-sm">
        <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        Generating UI...
      </div>
    );
  }

  // Normalize elements - handles both array and record formats
  const normalizedElements = normalizeElements(tree.elements);

  // Check if elements are empty or root element doesn't exist yet (streaming)
  if (
    Object.keys(normalizedElements).length === 0 ||
    !normalizedElements[tree.root]
  ) {
    return (
      <div className="flex items-center gap-2 rounded border border-dashed border-muted-foreground p-4 text-muted-foreground text-sm">
        <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        Generating UI...
      </div>
    );
  }

  return (
    <div className={className}>
      {renderElement(tree.root, normalizedElements, isStreaming)}
    </div>
  );
}
