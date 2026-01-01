import { resolve } from "node:path";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig, loadEnv } from "vite";

const envDir = resolve(__dirname, "../..");

/**
 * Vite config for production client build only.
 * Dev mode still uses Bun's fullstack dev server.
 */
export default defineConfig(({ mode }) => {
  // Load env vars from workspace root
  const env = loadEnv(mode, envDir, "PUBLIC_");

  return {
    plugins: [
      react({
        babel: {
          plugins: ["babel-plugin-react-compiler"],
        },
      }),
      tailwindcss(),
    ],

    root: "src/client",
    publicDir: "../../public",

    build: {
      outDir: "../../dist/client",
      emptyOutDir: true,
      sourcemap: true,
      rollupOptions: {
        input: {
          main: resolve(__dirname, "src/client/index.html"),
          about: resolve(__dirname, "src/client/pages/static/about.html"),
          help: resolve(__dirname, "src/client/pages/static/help.html"),
        },
      },
      target: "esnext",
      minify: "esbuild",
    },

    resolve: {
      alias: {
        "@yapmate/components/ui": resolve(
          __dirname,
          "../../packages/components/src/ui"
        ),
        "@yapmate/components/ai-elements": resolve(
          __dirname,
          "../../packages/components/src/ai-elements"
        ),
        "@yapmate/components/lib/utils": resolve(
          __dirname,
          "../../packages/components/src/lib/utils.ts"
        ),
        "@yapmate/core/types": resolve(
          __dirname,
          "../../packages/core/src/types/index.ts"
        ),
        "@yapmate/server/routes": resolve(
          __dirname,
          "../../packages/server/src/routes"
        ),
      },
    },

    envDir,
    envPrefix: "PUBLIC_",

    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
      // Inline PUBLIC_* env vars for process.env.* access pattern (Bun compat)
      "process.env.PUBLIC_APP_URL": JSON.stringify(env.PUBLIC_APP_URL),
      "process.env.PUBLIC_SUPABASE_URL": JSON.stringify(
        env.PUBLIC_SUPABASE_URL
      ),
      "process.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY": JSON.stringify(
        env.PUBLIC_SUPABASE_PUBLISHABLE_KEY
      ),
    },

    css: {
      postcss: {},
    },
  };
});
