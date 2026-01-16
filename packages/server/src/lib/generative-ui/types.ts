/**
 * Type definitions for generative UI
 */
import type { UITree } from "@json-render/core";
import type { UIMessage } from "ai";

/** Context passed to the UI generation agent */
export type UIGenerationContext = {
  /** Optional intent from render_ui tool */
  intent?: string;
  /** Full conversation history */
  messages: UIMessage[];
  /** Model ID to use (same as user's selected model) */
  model: string;
  /** Abort signal for cancellation */
  abortSignal?: AbortSignal;
};

/** Result of UI generation */
export type UIGenerationResult = {
  /** Generated UI tree */
  tree: UITree;
  /** Generation metadata */
  metadata?: {
    tokensUsed?: number;
    modelUsed?: string;
  };
};

/** Stream chunk types for generative UI */
export type GenerativeUIStreamChunk =
  | { type: "generative-ui-start"; id: string }
  | { type: "generative-ui-delta"; id: string; delta: string }
  | { type: "generative-ui-end"; id: string; tree: UITree };

/** Generative UI part for message parts */
export type GenerativeUIPart = {
  type: "generative-ui";
  id: string;
  ui: UITree;
};
