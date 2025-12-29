// TODO: code duplication move to shared library
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
