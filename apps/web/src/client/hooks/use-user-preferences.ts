/**
 * User preferences persistence via localStorage with server sync
 * Stores and retrieves user's last used model and search preferences
 */

const STORAGE_KEY = "yapmate_user_preferences";

type UserPreferences = {
  lastUsedModel: string | null;
  searchEnabled: boolean;
  memoryEnabled: boolean;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  lastUsedModel: null,
  searchEnabled: false,
  memoryEnabled: false,
};

/**
 * Reads user preferences from localStorage
 */
export const getUserPreferences = (): UserPreferences => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return DEFAULT_PREFERENCES;
    }
    const parsed = JSON.parse(stored) as Partial<UserPreferences>;
    return {
      lastUsedModel: parsed.lastUsedModel ?? null,
      searchEnabled: parsed.searchEnabled ?? false,
      memoryEnabled: parsed.memoryEnabled ?? false,
    };
  } catch {
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Saves user preferences to localStorage
 */
export const setUserPreferences = (updates: Partial<UserPreferences>): void => {
  try {
    const current = getUserPreferences();
    const merged = { ...current, ...updates };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  } catch {
    // Ignore storage errors (quota exceeded, etc.)
  }
};

/**
 * Gets the last used model from localStorage
 */
export const getLastUsedModel = (): string | null =>
  getUserPreferences().lastUsedModel;

/**
 * Sets the last used model in localStorage
 */
export const setLastUsedModel = (model: string): void =>
  setUserPreferences({ lastUsedModel: model });

/**
 * Gets the search enabled preference from localStorage
 */
export const getSearchEnabled = (): boolean =>
  getUserPreferences().searchEnabled;

/**
 * Sets the search enabled preference in localStorage
 */
export const setSearchEnabled = (enabled: boolean): void =>
  setUserPreferences({ searchEnabled: enabled });

/**
 * Gets the memory enabled preference from localStorage
 */
export const getMemoryEnabled = (): boolean =>
  getUserPreferences().memoryEnabled;

/**
 * Sets the memory enabled preference in localStorage
 */
export const setMemoryEnabled = (enabled: boolean): void =>
  setUserPreferences({ memoryEnabled: enabled });

/**
 * Syncs localStorage with server data if server has newer info
 * Call this after chats list is loaded to update local preferences
 * @param serverLastModel - Last used model from server (from chats list)
 */
export const syncWithServer = (serverLastModel: string | null): void => {
  if (!serverLastModel) {
    return;
  }
  const local = getLastUsedModel();
  // If local is empty, use server value
  if (!local) {
    setLastUsedModel(serverLastModel);
  }
  // Otherwise keep local value (it's more recent since user may have
  // changed model after the last message was sent)
};
