/**
 * Centralized hotkey definitions and platform detection utilities
 */

// Regex pattern for splitting Mac hotkeys
// Order matters: match full words before single characters
// Also matches Unicode symbols that may already be in the formatted string
const MAC_HOTKEY_PATTERN =
  /[⌘⇧⌥↵⌫⇥⎋]|backspace|escape|enter|slash|comma|period|[A-Z]|[.,]/gi;

export const HOTKEYS = {
  // Global
  newChat: "mod+j",
  focusPrompt: "mod+k",
  settings: "mod+alt+comma",
  help: "mod+alt+h",
  // Chat Input
  submit: "enter",
  newLine: "shift+enter",
  stop: "escape",
  toggleVoice: "mod+alt+s",
  toggleSearch: "mod+alt+w",
  openModelSelector: "mod+alt+m",
  openToolSelector: "mod+alt+t",
  attachFile: "mod+alt+a",
  cycleReasoning: "mod+alt+r",
  toggleMemory: "mod+alt+v",
} as const;

/**
 * Detects if running on Mac
 */
export const isMac = (): boolean => {
  if (typeof window === "undefined") {
    return false;
  }
  return navigator.platform.toUpperCase().indexOf("MAC") >= 0;
};

/**
 * Returns the modifier key symbol for the current platform
 */
export const getModifierSymbol = (): string => (isMac() ? "⌘" : "Ctrl");

/**
 * Capitalizes special key names for display
 * Uses Unicode symbols on Mac, text on Windows/Linux
 */
const capitalizeSpecialKey = (key: string): string => {
  const isMacPlatform = isMac();
  const keyLower = key.toLowerCase();

  // If key is already a Unicode symbol, return as-is
  const unicodeSymbols = ["⌘", "⇧", "⌥", "↵", "⌫", "⇥", "⎋"];
  if (unicodeSymbols.includes(key)) {
    return key;
  }

  // Mac uses Unicode symbols
  if (isMacPlatform) {
    const macSymbols: Record<string, string> = {
      enter: "↵",
      escape: "⎋",
      backspace: "⌫",
      tab: "⇥",
      shift: "⇧",
      slash: "/",
      comma: ",",
      period: ".",
    };
    return macSymbols[keyLower] ?? key;
  }

  // Windows/Linux uses text
  const textKeys: Record<string, string> = {
    enter: "Enter",
    escape: "Escape",
    backspace: "Backspace",
    tab: "Tab",
    shift: "Shift",
    slash: "/",
    comma: ",",
    period: ".",
  };
  return textKeys[keyLower] ?? key;
};

export const formatHotkey = (hotkey: string): string => {
  const isMacPlatform = isMac();
  const modSymbol = isMacPlatform ? "⌘" : "Ctrl";
  const shiftSymbol = isMacPlatform ? "⇧" : "Shift";
  const altSymbol = isMacPlatform ? "⌥" : "Alt";

  return hotkey
    .toLowerCase()
    .replace(/mod/g, modSymbol)
    .replace(/shift/g, shiftSymbol)
    .replace(/alt/g, altSymbol)
    .split("+")
    .map((key) => {
      // Capitalize special keys first
      const capitalized = capitalizeSpecialKey(key);
      // Then capitalize single letter keys (a-z)
      if (capitalized.length === 1) {
        const code = capitalized.charCodeAt(0);
        if (code >= 97 && code <= 122) {
          // lowercase a-z
          return capitalized.toUpperCase();
        }
      }
      return capitalized;
    })
    .join(isMacPlatform ? "" : "+");
};

/**
 * Splits a hotkey string into individual key parts for rendering with Kbd components
 * Returns array of key strings, properly capitalized
 */
export const splitHotkey = (hotkey: string): string[] => {
  const formatted = formatHotkey(hotkey);
  const isMacPlatform = isMac();

  if (isMacPlatform) {
    // Split by symbols (⌘, ⇧, ⌥) and letters/special keys
    const matches = formatted.match(MAC_HOTKEY_PATTERN) || [];
    // Capitalize special keys for display
    return matches.map((key) => capitalizeSpecialKey(key));
  }

  // Split by + for Windows/Linux - keys are already properly formatted
  return formatted.split("+");
};
