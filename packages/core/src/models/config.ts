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
  "openai/gpt-5.2-pro",

  // Anthropic - Latest Claude models
  "anthropic/claude-sonnet-4.5",
  "anthropic/claude-opus-4.5",

  // Mistral
  "mistralai/mistral-medium-3.1",
  "mistralai/mistral-large-2512",

  // Kimi - Latest models
  "Kimi-K2-0905",

  // DeepSeek
  "deepseek/deepseek-v3.2",

  // Perplexity
  "perplexity/sonar",
  "perplexity/sonar-deep-research",
  "perplexity/sonar-pro-search",
] as const;

/**
 * Models that should be excluded from the model selector
 * Add model IDs here to ban them from appearing in the list
 */
export const BANNED_MODELS = [
  "openai/gpt-4o-mini",
  "openai/gpt-4o",
  "openai/gpt-4o-mini-2024-07-18",
  "openai/gpt-4o-2024-08-06",
  "openai/chatgpt-4o-latest",
  "openai/gpt-4o-2024-11-20",
  "openai/gpt-4o-mini-search-preview",
  "openai/gpt-4o-2024-05-13",
  "openai/gpt-4o-search-preview",
  "openai/gpt-4o-audio-preview",
  "openai/gpt-4o:extended",
] as const;
