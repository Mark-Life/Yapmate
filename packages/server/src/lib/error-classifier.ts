import type { MessageError } from "@yapmate/db/schema";

const CONTENT_FILTER_PATTERNS = [
  "content_filter",
  "content filter",
  "content policy",
  "content moderation",
  "flagged",
  "safety",
  "blocked by",
];

/**
 * Extracts a human-readable message from an unknown error
 */
const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message: unknown }).message === "string"
  ) {
    return (error as { message: string }).message;
  }
  return "Generation failed";
};

/**
 * Extracts HTTP status code from an error object
 */
const getStatusCode = (error: unknown): number | undefined => {
  if (!error || typeof error !== "object") {
    return;
  }
  const e = error as Record<string, unknown>;
  if (typeof e.status === "number") {
    return e.status;
  }
  if (typeof e.statusCode === "number") {
    return e.statusCode;
  }
};

/**
 * Checks if an error message matches content filter patterns
 */
const isContentFiltered = (message: string): boolean => {
  const lower = message.toLowerCase();
  return CONTENT_FILTER_PATTERNS.some((p) => lower.includes(p));
};

/**
 * Checks if error is a network/timeout error
 */
const isNetworkError = (error: unknown): boolean => {
  const message = getErrorMessage(error).toLowerCase();
  if (error instanceof TypeError && message.includes("fetch")) {
    return true;
  }
  if (message.includes("etimedout")) {
    return true;
  }
  if (message.includes("econnreset")) {
    return true;
  }
  if (message.includes("econnrefused")) {
    return true;
  }
  if (message.includes("network")) {
    return true;
  }
  return false;
};

/**
 * Classifies an LLM generation error into a structured MessageError
 * @param error - The raw error from the provider/SDK
 */
export const classifyGenerationError = (error: unknown): MessageError => {
  const message = getErrorMessage(error);
  const status = getStatusCode(error);

  if (status === 402) {
    return {
      code: "insufficient_balance",
      message: "Provider balance insufficient",
      provider: "openrouter",
      retryable: false,
      raw: error,
    };
  }

  if (status === 429) {
    return {
      code: "rate_limited",
      message: "Rate limited by provider",
      provider: "openrouter",
      retryable: true,
      raw: error,
    };
  }

  if (status === 400) {
    return {
      code: "bad_request",
      message: `Invalid request: ${message}`,
      provider: "openrouter",
      retryable: false,
      raw: error,
    };
  }

  if (status === 408 || status === 504) {
    return {
      code: "timeout",
      message: "Request timed out",
      provider: "openrouter",
      retryable: true,
      raw: error,
    };
  }

  if (isContentFiltered(message)) {
    return {
      code: "content_filtered",
      message: "Content was filtered by the model",
      provider: "openrouter",
      retryable: false,
      raw: error,
    };
  }

  if (isNetworkError(error)) {
    return {
      code: "timeout",
      message: "Network error — request failed to reach provider",
      provider: "openrouter",
      retryable: true,
      raw: error,
    };
  }

  return {
    code: "unknown",
    message: message || "Generation failed",
    provider: "openrouter",
    retryable: true,
    raw: error,
  };
};
