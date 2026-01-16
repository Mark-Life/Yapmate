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
  elements: Record<string, UIElement>;
};

export type GenerativeUIRendererProps = {
  tree: UITree;
  className?: string;
};

function renderElement(
  elementKey: string,
  elements: Record<string, UIElement>
): ReactNode {
  const element = elements[elementKey];
  if (!element) {
    console.warn(`Element not found: ${elementKey}`);
    return null;
  }

  const Component = componentRegistry[element.type];
  if (!Component) {
    console.warn(`Unknown component type: ${element.type}`);
    return (
      <div className="rounded border border-dashed border-yellow-500 p-2 text-yellow-600 text-xs">
        Unknown component: {element.type}
      </div>
    );
  }

  const childElements = element.children?.map((childKey) =>
    renderElement(childKey, elements)
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
}: GenerativeUIRendererProps) {
  if (!tree || !tree.root || !tree.elements) {
    return (
      <div className="rounded border border-dashed border-muted-foreground p-4 text-muted-foreground text-sm">
        No UI to display
      </div>
    );
  }

  return (
    <div className={className}>{renderElement(tree.root, tree.elements)}</div>
  );
}
