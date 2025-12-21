#!/usr/bin/env bun
/**
 * Production build script for Bun fullstack app
 * Uses Bun's default HTML bundling behavior
 */

const start = performance.now();

/**
 * Load Tailwind plugin if available
 */
const loadPlugins = async () => {
  const plugins: Array<{ name: string; setup: (build: unknown) => void }> = [];
  try {
    const pluginModule = await import("bun-plugin-tailwind");
    const tailwindPlugin = pluginModule.default || pluginModule;
    if (
      tailwindPlugin &&
      typeof tailwindPlugin === "object" &&
      "name" in tailwindPlugin
    ) {
      plugins.push(
        tailwindPlugin as { name: string; setup: (build: unknown) => void }
      );
    }
  } catch {
    console.warn("⚠️  Tailwind plugin not found, skipping...");
  }
  return plugins;
};

/**
 * Format file size for display
 */
const formatFileSize = (bytes: number): string => {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${size.toFixed(2)} ${units[unitIndex]}`;
};

/**
 * Main build process
 */
const main = async () => {
  console.log("🚀 Starting production build...\n");

  const plugins = await loadPlugins();

  const result = await Bun.build({
    entrypoints: ["./src/server/index.ts"],
    outdir: "./dist",
    target: "bun",
    minify: true,
    sourcemap: "linked",
    plugins,
    env: "PUBLIC_*",
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    // Ensure all output goes to dist/ root so paths resolve correctly
    naming: {
      entry: "[name].[ext]",
      chunk: "[name]-[hash].[ext]",
      asset: "[name]-[hash].[ext]",
    },
  });

  if (!result.success) {
    console.error("❌ Build failed:");
    for (const log of result.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  // Display build outputs
  console.log("📊 Build outputs:");
  const outputs: Array<{ File: string; Type: string; Size: string }> = [];
  for (const output of result.outputs) {
    const relativePath = output.path.replace(process.cwd() + "/", "");
    outputs.push({
      File: relativePath,
      Type: output.kind,
      Size: formatFileSize(output.size),
    });
  }
  console.table(outputs);

  const end = performance.now();
  const buildTime = ((end - start) / 1000).toFixed(2);

  console.log(`\n✅ Build completed in ${buildTime}s`);
  console.log("\n▶️  Run with: bun run start\n");
};

main();
