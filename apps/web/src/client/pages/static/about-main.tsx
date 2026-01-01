import { useLayoutEffect } from "react";
import { createRoot } from "react-dom/client";
import "../../styles/globals.css";
import { AboutPage } from "./about-page";

/**
 * Syncs .dark class on <html> with system preference
 */
const useSystemTheme = () => {
  useLayoutEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

    const updateTheme = (e: MediaQueryList | MediaQueryListEvent) => {
      document.documentElement.classList.toggle("dark", e.matches);
    };

    updateTheme(mediaQuery);
    mediaQuery.addEventListener("change", updateTheme);

    return () => mediaQuery.removeEventListener("change", updateTheme);
  }, []);
};

/**
 * Root wrapper that applies system theme
 */
const Root = () => {
  useSystemTheme();
  return <AboutPage />;
};

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

// Store root on container to persist across HMR
const existingRoot = (
  container as { __reactRoot?: ReturnType<typeof createRoot> }
).__reactRoot;
const root = existingRoot ?? createRoot(container);
(container as { __reactRoot?: ReturnType<typeof createRoot> }).__reactRoot =
  root;

root.render(<Root />);

if (import.meta.hot) {
  import.meta.hot.accept();
}
