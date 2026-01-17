"use client"

import { type ReactNode, useMemo } from "react"
import {
  type UITree,
  type UIElement,
  type VisibilityCondition,
  evaluateVisibility,
  type VisibilityContext,
} from "@yapmate/core/generative-ui"
import { componentRegistry } from "./registry"
import {
  DataProvider,
  ActionProvider,
  useDataOptional,
  type DataProviderProps,
  type ActionProviderProps,
} from "./contexts"

export type GenerativeUIRendererProps = {
  tree: UITree | Partial<UITree>
  className?: string
  /** Whether the tree is still being streamed */
  isStreaming?: boolean
  /** Initial data for data binding */
  data?: Record<string, unknown>
  /** Action handlers */
  actionHandlers?: ActionProviderProps["handlers"]
  /** Navigation callback for action navigation */
  onNavigate?: ActionProviderProps["onNavigate"]
  /** Confirmation callback for action confirmations */
  onConfirm?: ActionProviderProps["onConfirm"]
  /** Auth state for visibility conditions */
  auth?: { signedIn: boolean }
}

/**
 * Normalizes elements to a Record format
 * Handles both array format (from some AI outputs) and record format
 */
function normalizeElements(
  elements: Record<string, UIElement> | UIElement[] | undefined
): Record<string, UIElement> {
  if (!elements) return {}

  if (!Array.isArray(elements)) return elements as Record<string, UIElement>

  return elements.reduce<Record<string, UIElement>>((acc, element) => {
    if (element && element.key) {
      acc[element.key] = element
    }
    return acc
  }, {})
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
  )
}

type ElementRendererProps = {
  elementKey: string
  elements: Record<string, UIElement>
  isStreaming?: boolean
  visibilityCtx: VisibilityContext
}

function ElementRenderer({
  elementKey,
  elements,
  isStreaming,
  visibilityCtx,
}: ElementRendererProps) {
  const element = elements[elementKey]

  if (!element) {
    if (isStreaming) {
      return <ElementSkeleton key={elementKey} />
    }
    return null
  }

  // Evaluate visibility condition
  if (element.visible !== undefined) {
    const isVisible = evaluateVisibility(element.visible, visibilityCtx)
    if (!isVisible) return null
  }

  const Component = componentRegistry[element.type]
  if (!Component) {
    console.warn(`Unknown component type: ${element.type}`)
    return (
      <div
        className="rounded border border-dashed border-yellow-500 p-2 text-yellow-600 text-xs"
        key={element.key}
      >
        Unknown component: {element.type}
      </div>
    )
  }

  const childElements = element.children?.map(childKey => (
    <ElementRenderer
      key={childKey}
      elementKey={childKey}
      elements={elements}
      isStreaming={isStreaming}
      visibilityCtx={visibilityCtx}
    />
  ))

  return (
    <Component key={element.key} {...element.props}>
      {childElements}
    </Component>
  )
}

/** Inner renderer that uses data context */
function RendererInner({
  tree,
  className,
  isStreaming = false,
  auth,
}: {
  tree: UITree | Partial<UITree>
  className?: string
  isStreaming?: boolean
  auth?: { signedIn: boolean }
}) {
  const dataCtx = useDataOptional()
  const data = dataCtx?.data ?? {}

  const visibilityCtx: VisibilityContext = useMemo(
    () => ({ data, auth }),
    [data, auth]
  )

  if (!tree || !tree.root) {
    return (
      <div className="flex items-center gap-2 rounded border border-dashed border-muted-foreground p-4 text-muted-foreground text-sm">
        <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        Generating UI...
      </div>
    )
  }

  const normalizedElements = normalizeElements(tree.elements)

  if (
    Object.keys(normalizedElements).length === 0 ||
    !normalizedElements[tree.root]
  ) {
    return (
      <div className="flex items-center gap-2 rounded border border-dashed border-muted-foreground p-4 text-muted-foreground text-sm">
        <div className="size-4 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
        Generating UI...
      </div>
    )
  }

  return (
    <div className={className}>
      <ElementRenderer
        elementKey={tree.root}
        elements={normalizedElements}
        isStreaming={isStreaming}
        visibilityCtx={visibilityCtx}
      />
    </div>
  )
}

/**
 * Main renderer component for generative UI
 * Wraps content in DataProvider and ActionProvider contexts
 */
export function GenerativeUIRenderer({
  tree,
  className,
  isStreaming = false,
  data = {},
  actionHandlers = {},
  onNavigate,
  onConfirm,
  auth,
}: GenerativeUIRendererProps) {
  return (
    <DataProvider initialData={data}>
      <ActionProvider
        handlers={actionHandlers}
        onNavigate={onNavigate}
        onConfirm={onConfirm}
      >
        <RendererInner
          tree={tree}
          className={className}
          isStreaming={isStreaming}
          auth={auth}
        />
      </ActionProvider>
    </DataProvider>
  )
}

/**
 * Lightweight renderer without context providers
 * Use when you already have DataProvider/ActionProvider in parent tree
 */
export function GenerativeUIRendererLite({
  tree,
  className,
  isStreaming = false,
  auth,
}: Omit<GenerativeUIRendererProps, "data" | "actionHandlers" | "onNavigate" | "onConfirm">) {
  return (
    <RendererInner
      tree={tree}
      className={className}
      isStreaming={isStreaming}
      auth={auth}
    />
  )
}
