#!/usr/bin/env bun
/**
 * Production build script for hybrid Vite + Bun fullstack app
 * Two-phase build: Client (Vite with code splitting) → Server (Bun)
 */

import { spawn } from "node:child_process";

const start = performance.now();

// Regex patterns for service worker updates
const BUILD_TIMESTAMP_REGEX = /\/\/ Build: \d+/;
const CACHE_VERSION_REGEX = /const CACHE_VERSION = "[^"]+";/;

// Regex patterns for build plugins (defined at top level for performance)
const HTML_FILE_REGEX = /\.html$/;
const ANY_FILE_REGEX = /.*/;

/**
 * Run a command and return a promise
 */
const runCommand = (
  command: string,
  args: string[],
  cwd?: string
): Promise<void> =>
  new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      cwd,
      stdio: "inherit",
      shell: true,
    });

    proc.on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with code ${code}`));
      }
    });

    proc.on("error", reject);
  });

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
 * Phase 1: Build client assets with Vite (Rollup-based, proper code splitting)
 */
const buildClient = async () => {
  console.log("📦 Phase 1: Building client with Vite...\n");

  try {
    await runCommand("bunx", ["vite", "build"], process.cwd());
    console.log("\n✅ Vite client build completed");
  } catch (error) {
    console.error("❌ Vite client build failed:", error);
    process.exit(1);
  }

  // List output files
  console.log("\n📊 Client build outputs:");
  const clientDir = "./dist/client";
  const glob = new Bun.Glob("**/*");
  const outputs: Array<{ File: string; Size: string }> = [];

  for await (const file of glob.scan({ cwd: clientDir, onlyFiles: true })) {
    const bunFile = Bun.file(`${clientDir}/${file}`);
    outputs.push({
      File: `dist/client/${file}`,
      Size: formatFileSize(bunFile.size),
    });
  }

  console.table(outputs);
  console.log();
};

/**
 * Phase 2: Build server bundle with Bun
 */
const buildServer = async () => {
  console.log("🖥️  Phase 2: Building server bundle with Bun...\n");

  // Plugin to replace HTML imports with null in server bundle
  // In production, we use Bun.file() to serve pre-built HTML instead
  const excludeHtmlPlugin: import("bun").BunPlugin = {
    name: "exclude-html",
    setup(build) {
      build.onResolve({ filter: HTML_FILE_REGEX }, (args) => ({
        path: args.path,
        namespace: "html-stub",
      }));
      build.onLoad({ filter: ANY_FILE_REGEX, namespace: "html-stub" }, () => ({
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
};

/**
 * Copy PWA and static assets to dist root
 */
const copyAssets = async () => {
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

    // Write to both locations:
    // - dist/sw.js (for direct access)
    // - dist/client/sw.js (overwrite Vite's copy, this is what server serves)
    await Bun.write("./dist/sw.js", updatedSwContent);
    await Bun.write("./dist/client/sw.js", updatedSwContent);

    // Vite copies public dir to dist/client, so copy manifest from there
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

  // Copy static assets to dist root for direct access
  console.log("🖼️  Copying static assets...");
  const staticAssets = [
    "android-chrome-192x192.png",
    "android-chrome-512x512.png",
    "apple-touch-icon.png",
    "favicon-96x96.png",
    "favicon.ico",
    "favicon.svg",
  ];
  try {
    for (const asset of staticAssets) {
      // Vite copies public to dist/client, check there first
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
  console.log("🚀 Starting hybrid production build (Vite + Bun)...\n");

  await buildClient();
  await buildServer();
  await copyAssets();

  const end = performance.now();
  const buildTime = ((end - start) / 1000).toFixed(2);

  console.log(`\n✅ Build completed in ${buildTime}s`);
  console.log("\n▶️  Run with: bun run start\n");
};

main();
