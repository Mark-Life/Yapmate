import { apple } from "@react-native-ai/apple";

export const APPLE_LOCAL_MODEL = {
  id: "local/apple-intelligence",
  name: "Apple Intelligence",
  provider: "local",
  description: "On-device AI powered by Apple Foundation Models",
  isLocal: true,
} as const;

/**
 * Checks if a model ID is a local on-device model
 */
export const isLocalModel = (modelId: string) => modelId.startsWith("local/");

/**
 * Checks if Apple Foundation Model is available on this device
 * Requires iOS 26+ with Apple Intelligence enabled
 */
export const checkAppleModelAvailability = async () => {
  try {
    return await apple.isAvailable();
  } catch {
    return false;
  }
};
