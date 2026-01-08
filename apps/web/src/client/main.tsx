import { PostHogProvider } from "posthog-js/react";
import { createRoot, type Root } from "react-dom/client";
import { App } from "./layout";

const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

if (!process.env.PUBLIC_POSTHOG_HOST) {
  throw new Error("PUBLIC_POSTHOG_HOST is not set");
}
if (!process.env.PUBLIC_POSTHOG_KEY) {
  throw new Error("PUBLIC_POSTHOG_KEY is not set");
}

const options = {
  api_host: process.env.PUBLIC_POSTHOG_HOST,
  defaults: "2025-11-30",
} as const;

// Store root instance to persist across HMR updates
let root: Root | undefined = (window as { __reactRoot?: Root }).__reactRoot;

if (!root) {
  root = createRoot(container);
  (window as { __reactRoot?: Root }).__reactRoot = root;
}

root.render(
  <PostHogProvider apiKey={process.env.PUBLIC_POSTHOG_KEY} options={options}>
    <App />
  </PostHogProvider>
);

if (import.meta.hot) {
  import.meta.hot.accept();
}
