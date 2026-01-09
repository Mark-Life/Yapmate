/**
 * User preferences persistence via AsyncStorage with server sync
 * Stores and retrieves user's last used model and search preferences
 */
import AsyncStorage from "@react-native-async-storage/async-storage";

const STORAGE_KEY = "yapmate_user_preferences";

type UserPreferences = {
  lastUsedModel: string | null;
  searchEnabled: boolean;
};

const DEFAULT_PREFERENCES: UserPreferences = {
  lastUsedModel: null,
  searchEnabled: false,
};

// In-memory cache for sync access after initial load
let cachedPreferences: UserPreferences = { ...DEFAULT_PREFERENCES };
let isInitialized = false;

/**
 * Initializes the preferences cache from AsyncStorage
 * Should be called early in app lifecycle
 */
export const initUserPreferences = async (): Promise<UserPreferences> => {
  try {
    const stored = await AsyncStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as Partial<UserPreferences>;
      cachedPreferences = {
        lastUsedModel: parsed.lastUsedModel ?? null,
        searchEnabled: parsed.searchEnabled ?? false,
      };
    }
    isInitialized = true;
    return cachedPreferences;
  } catch {
    isInitialized = true;
    return DEFAULT_PREFERENCES;
  }
};

/**
 * Gets user preferences synchronously from cache
 * Must call initUserPreferences first
 */
export const getUserPreferences = (): UserPreferences => cachedPreferences;

/**
 * Saves user preferences to AsyncStorage and updates cache
 */
export const setUserPreferences = async (
  updates: Partial<UserPreferences>
): Promise<void> => {
  try {
    cachedPreferences = { ...cachedPreferences, ...updates };
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(cachedPreferences));
  } catch {
    // Ignore storage errors
  }
};

/**
 * Gets the last used model from cache
 */
export const getLastUsedModel = (): string | null =>
  cachedPreferences.lastUsedModel;

/**
 * Sets the last used model in cache and storage
 */
export const setLastUsedModel = async (model: string): Promise<void> => {
  await setUserPreferences({ lastUsedModel: model });
};

/**
 * Gets the search enabled preference from cache
 */
export const getSearchEnabled = (): boolean => cachedPreferences.searchEnabled;

/**
 * Sets the search enabled preference in cache and storage
 */
export const setSearchEnabled = async (enabled: boolean): Promise<void> => {
  await setUserPreferences({ searchEnabled: enabled });
};

/**
 * Syncs cache with server data if local is empty
 * Call this after chats list is loaded to update local preferences
 * @param serverLastModel - Last used model from server (from chats list)
 */
export const syncWithServer = async (
  serverLastModel: string | null
): Promise<void> => {
  if (!serverLastModel) {
    return;
  }
  const local = getLastUsedModel();
  // If local is empty, use server value
  if (!local) {
    await setLastUsedModel(serverLastModel);
  }
};

/**
 * Returns whether preferences have been initialized
 */
export const isPreferencesInitialized = (): boolean => isInitialized;

/**
 * Clears all user preferences from cache and storage
 * Call this on logout to reset state for next user
 */
export const clearUserPreferences = async (): Promise<void> => {
  cachedPreferences = { ...DEFAULT_PREFERENCES };
  isInitialized = false;
  await AsyncStorage.removeItem(STORAGE_KEY);
};
