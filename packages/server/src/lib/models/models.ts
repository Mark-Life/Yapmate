/**
 * Fallback array of available model identifiers in format "provider/model-name"
 * Used when models.dev API is unavailable or cache is empty
 * Prefer using getModels() from models-service.ts for dynamic model list
 */
export const MODELS = [
  // GOOGLE
  "google/gemini-2.5-flash-lite",
  "google/gemini-3-flash-preview",
  "google/gemini-2.5-flash",
  // "google/gemini-2.5-flash-lite",
  "google/gemini-2.5-pro",

  // OPENAI
  "openai/gpt-5.4",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
] as const;

/**
 * Parses a model string to extract provider and formatted model name
 * @param modelString - Model string in format "provider/model-name"
 * @returns Object with provider and formatted model name
 */
export const parseModel = (modelString: string) => {
  const [provider, ...modelParts] = modelString.split("/");
  const modelNameRaw = modelParts.join("/");

  // Replace hyphens with spaces
  const modelNameWithSpaces = modelNameRaw.replace(/-/g, " ");

  // Split into words and format
  const words = modelNameWithSpaces.split(" ");
  const formattedWords = words.map((word, index) => {
    const lowerWord = word.toLowerCase();
    // If first word starts with "gpt", convert to "GPT"
    if (index === 0 && lowerWord.startsWith("gpt")) {
      return "GPT";
    }
    // Capitalize first letter of each word
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

  return {
    provider,
    modelName: formattedWords.join(" "),
  };
};
