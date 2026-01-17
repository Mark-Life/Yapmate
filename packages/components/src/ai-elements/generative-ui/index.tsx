// Renderer
export {
  GenerativeUIRenderer,
  GenerativeUIRendererLite,
  type GenerativeUIRendererProps,
} from "./renderer"

// Registry
export { componentRegistry } from "./registry"

// Contexts
export {
  DataProvider,
  useData,
  useDataValue,
  useResolvedValue,
  useDataOptional,
  ActionProvider,
  useActions,
  useActionsOptional,
  useActionHandler,
  type DataProviderProps,
  type ActionProviderProps,
} from "./contexts"

// Layout components
export { Grid, Stack, Card } from "./layout"
export type { GridProps, StackProps, CardProps } from "./layout"

// Data components
export { DataTable, Metric, Chart } from "./data"
export type { DataTableProps, MetricProps, ChartProps, DataTableColumn } from "./data"

// Content components
export { TextBlock, List, KeyValue } from "./content"
export type { TextBlockProps, ListProps, KeyValueProps, KeyValuePair } from "./content"

// Specialized components
export { Button, FlashCard, FlashCardDeck } from "./specialized"
export type { ButtonProps, FlashCardProps, FlashCardDeckProps, FlashCardDeckCard } from "./specialized"

// Re-export core types for convenience
export type {
  UITree,
  UIElement,
  DynamicValue,
  VisibilityCondition,
  Action,
  JsonPatch,
} from "@yapmate/core/generative-ui"
