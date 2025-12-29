import { createHighlighterCore, type HighlighterCore } from "@shikijs/core";
import {
  createNativeEngine,
  isNativeEngineAvailable,
} from "react-native-shiki-engine";

/** Lazy-loaded singleton highlighter instance */
let highlighterPromise: Promise<HighlighterCore> | null = null;

/** Common languages to bundle initially */
const BUNDLED_LANGS = [
  import("shiki/langs/javascript.mjs"),
  import("shiki/langs/typescript.mjs"),
  import("shiki/langs/jsx.mjs"),
  import("shiki/langs/tsx.mjs"),
  import("shiki/langs/python.mjs"),
  import("shiki/langs/rust.mjs"),
  import("shiki/langs/go.mjs"),
  import("shiki/langs/json.mjs"),
  import("shiki/langs/yaml.mjs"),
  import("shiki/langs/markdown.mjs"),
  import("shiki/langs/bash.mjs"),
  import("shiki/langs/sql.mjs"),
  import("shiki/langs/html.mjs"),
  import("shiki/langs/css.mjs"),
];

/** Themes for code highlighting (matches web) */
const THEMES = [
  import("shiki/themes/one-light.mjs"),
  import("shiki/themes/one-dark-pro.mjs"),
];

/** Theme names for light/dark modes */
export const LIGHT_THEME = "one-light";
export const DARK_THEME = "one-dark-pro";

/**
 * Gets or creates the singleton highlighter instance.
 * Lazily initializes on first call for better startup performance.
 */
export const getHighlighter = (): Promise<HighlighterCore> => {
  if (highlighterPromise) {
    return highlighterPromise;
  }

  if (!isNativeEngineAvailable()) {
    return Promise.reject(new Error("Native shiki engine is not available"));
  }

  highlighterPromise = createHighlighterCore({
    themes: THEMES,
    langs: BUNDLED_LANGS,
    engine: createNativeEngine(),
  });

  return highlighterPromise;
};
