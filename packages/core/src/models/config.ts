/**
 * Configuration for model prioritization and filtering
 * Top models appear first in the model selector
 * Banned models are excluded from the list
 */

/**
 * Top-tier models that should appear first in the model selector
 * These are the latest/best models from major providers
 */
export const TOP_MODELS = [
  // Google - Latest Gemini models
  "google/gemini-3-flash-preview",
  "google/gemini-3-pro-preview",

  // OpenAI - Latest GPT models
  "openai/gpt-5-nano",
  "openai/gpt-5-mini",
  "openai/gpt-5.2",

  // Anthropic - Latest Claude models
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-opus-4.5",

  // Kimi - Latest models
  "Kimi-K2-0905",
] as const;

/**
 * Models that should be excluded from the model selector
 * Add model IDs here to ban them from appearing in the list
 */
export const BANNED_MODELS = ["openai/gpt-4o-mini"] as const;
