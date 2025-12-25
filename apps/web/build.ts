#!/usr/bin/env bun
/**
 * Production build script for Bun fullstack app
 * Two-phase build: Client (with code splitting) → Server
 *
 * BUG: Code splitting with HTML entry creates empty JS entry file
 * See: docs/bugs/bun-code-splitting-empty-entry.md
 */

const start = performance.now();

// Regex patterns for service worker updates
const BUILD_TIMESTAMP_REGEX = /\/\/ Build: \d+/;
const CACHE_VERSION_REGEX = /const CACHE_VERSION = "[^"]+";/;

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
 * Phase 1: Build client assets with code splitting
 *
 * BUG: This produces an empty entry JS file when splitting is enabled.
 * The chunks contain the actual code, but the entry file that HTML
 * references is empty (only sourcemap comments).
 */
const buildClient = async () => {
  console.log("📦 Phase 1: Building client assets (with code splitting)...\n");

  // Copy manifest to client directory so Bun can resolve it during HTML processing
  console.log("📋 Preparing PWA files...");
  try {
    await Bun.write(
      "./src/client/site.webmanifest",
      Bun.file("./public/site.webmanifest")
    );
  } catch (error) {
    console.warn("⚠️  Failed to prepare manifest:", error);
  }

  const plugins = await loadPlugins();

  // BUG: With splitting: true, the entry JS file is empty
  // The code IS split into chunks, but the entry file has no imports
  const clientResult = await Bun.build({
    entrypoints: ["./src/client/index.html"],
    outdir: "./dist/client",
    target: "browser",
    format: "esm",
    splitting: true, // <-- THIS CAUSES THE BUG: empty entry file
    minify: true,
    sourcemap: "linked",
    plugins,
    env: "PUBLIC_*",
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    naming: {
      entry: "[name]-[hash].[ext]",
      chunk: "[name]-[hash].[ext]",
      asset: "[name]-[hash].[ext]",
    },
  });

  if (!clientResult.success) {
    console.error("❌ Client build failed:");
    for (const log of clientResult.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  console.log("✅ Client build completed");

  // Copy hashed HTML to index.html for server to serve
  const htmlOutput = clientResult.outputs.find(
    (o) => o.kind === "entry-point" && o.path.endsWith(".html")
  );
  if (htmlOutput) {
    const targetPath = "./dist/client/index.html";
    await Bun.write(targetPath, Bun.file(htmlOutput.path));
    console.log(`📄 Copied ${htmlOutput.path.split("/").pop()} → index.html`);
  }

  // Debug: Check if entry JS file is empty (the bug)
  const jsEntry = clientResult.outputs.find(
    (o) => o.kind === "entry-point" && o.path.endsWith(".js")
  );
  if (jsEntry && jsEntry.size < 200) {
    console.warn(
      `⚠️  BUG DETECTED: Entry file ${jsEntry.path.split("/").pop()} is only ${jsEntry.size} bytes!`
    );
    console.warn(
      "    This is the Bun code splitting bug - entry file is empty."
    );
    console.warn("    See: docs/bugs/bun-code-splitting-empty-entry.md");
  }

  console.log("📊 Client build outputs:");
  const clientOutputs: Array<{ File: string; Type: string; Size: string }> = [];
  for (const output of clientResult.outputs) {
    const relativePath = output.path.replace(`${process.cwd()}/`, "");
    clientOutputs.push({
      File: relativePath,
      Type: output.kind,
      Size: formatFileSize(output.size),
    });
  }
  console.table(clientOutputs);
  console.log();

  return clientResult;
};

/**
 * Phase 2: Build server bundle
 */
const buildServer = async () => {
  console.log("🖥️  Phase 2: Building server bundle...\n");

  // Plugin to replace HTML imports with null in server bundle
  // In production, we use Bun.file() to serve pre-built HTML instead
  const excludeHtmlPlugin = {
    name: "exclude-html",
    setup(build: any) {
      build.onResolve({ filter: /\.html$/ }, (args: any) => ({
        path: args.path,
        namespace: "html-stub",
      }));
      build.onLoad({ filter: /.*/, namespace: "html-stub" }, () => ({
        contents: "export default null;",
        loader: "js",
      }));
    },
  };

  const serverResult = await Bun.build({
    entrypoints: ["./src/server/index.ts"],
    outdir: "./dist",
    target: "bun",
    format: "esm",
    splitting: false,
    minify: true,
    sourcemap: "linked",
    plugins: [excludeHtmlPlugin],
    env: "PUBLIC_*",
    define: {
      "process.env.NODE_ENV": JSON.stringify("production"),
    },
    naming: {
      entry: "[name].[ext]",
      chunk: "[name]-[hash].[ext]",
      asset: "[name]-[hash].[ext]",
    },
  });

  if (!serverResult.success) {
    console.error("❌ Server build failed:");
    for (const log of serverResult.logs) {
      console.error(log);
    }
    process.exit(1);
  }

  console.log("✅ Server build completed");
  console.log("📊 Server build outputs:");
  const serverOutputs: Array<{ File: string; Type: string; Size: string }> = [];
  for (const output of serverResult.outputs) {
    const relativePath = output.path.replace(`${process.cwd()}/`, "");
    serverOutputs.push({
      File: relativePath,
      Type: output.kind,
      Size: formatFileSize(output.size),
    });
  }
  console.table(serverOutputs);
  console.log();

  return serverResult;
};

/**
 * Copy PWA and static assets to dist
 */
const copyAssets = async () => {
  // Copy PWA files
  console.log("📦 Copying PWA files...");
  try {
    let swContent = await Bun.file("./public/sw.js").text();
    const buildTimestamp = Date.now();
    const cacheVersion = `v1-${buildTimestamp}`;

    if (swContent.includes("// Build:")) {
      swContent = swContent.replace(
        BUILD_TIMESTAMP_REGEX,
        `// Build: ${buildTimestamp}`
      );
    } else {
      swContent = `// Build: ${buildTimestamp}\n${swContent}`;
    }

    const updatedSwContent = swContent.replace(
      CACHE_VERSION_REGEX,
      `const CACHE_VERSION = "${cacheVersion}";`
    );

    await Bun.write("./dist/sw.js", updatedSwContent);

    // Copy manifest from client build output
    const clientManifest = Bun.file("./dist/client/site.webmanifest");
    if (await clientManifest.exists()) {
      await Bun.write("./dist/site.webmanifest", clientManifest);
    } else {
      await Bun.write(
        "./dist/site.webmanifest",
        Bun.file("./public/site.webmanifest")
      );
    }
    console.log("✅ PWA files copied");
  } catch (error) {
    console.warn("⚠️  Failed to copy PWA files:", error);
  }

  // Copy static assets
  console.log("🖼️  Copying static assets...");
  const staticAssets = [
    "android-chrome-192x192.png",
    "android-chrome-512x512.png",
    "apple-touch-icon.png",
    "favicon-16x16.png",
    "favicon-32x32.png",
    "favicon.ico",
    "favicon.svg",
  ];
  try {
    for (const asset of staticAssets) {
      // Try from client build first, then public
      let sourceFile = Bun.file(`./dist/client/${asset}`);
      if (!(await sourceFile.exists())) {
        sourceFile = Bun.file(`./public/${asset}`);
      }
      if (await sourceFile.exists()) {
        await Bun.write(`./dist/${asset}`, sourceFile);
      }
    }
    console.log("✅ Static assets copied");
  } catch (error) {
    console.warn("⚠️  Failed to copy static assets:", error);
  }
};

/**
 * Main build process
 */
const main = async () => {
  console.log("🚀 Starting two-phase production build...\n");
  console.log("⚠️  NOTE: Code splitting is ENABLED but has a bug.");
  console.log(
    "   The entry JS file will be empty. See docs/bugs/bun-code-splitting-empty-entry.md\n"
  );

  await buildClient();
  await buildServer();
  await copyAssets();

  const end = performance.now();
  const buildTime = ((end - start) / 1000).toFixed(2);

  console.log(`\n✅ Build completed in ${buildTime}s`);
  console.log("\n▶️  Run with: bun run start\n");
};

main();
