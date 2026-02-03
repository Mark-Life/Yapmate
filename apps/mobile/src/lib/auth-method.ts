/**
 * Stores the auth method used for the current sign-in attempt
 * Used by PostHog to track signup/login by method
 */
let authMethod: "password" | "magic_link" | null = null;

export const setAuthMethod = (method: "password" | "magic_link") => {
  authMethod = method;
};

export const getAndClearAuthMethod = () => {
  const method = authMethod ?? "magic_link";
  authMethod = null;
  return method;
};
