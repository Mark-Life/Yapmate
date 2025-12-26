#!/usr/bin/env bun
/**
 * Use locally built Bun from the bun repository
 * This allows testing your local Bun changes in your app
 */

const BUN_REPO_PATH =
  process.env.BUN_REPO_PATH || "/Users/andrey/Code/public/bun";
const LOCAL_BUN = `${BUN_REPO_PATH}/build/debug/bun-debug`;

import { spawn } from "node:child_process";
import { existsSync } from "node:fs";

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: bun scripts/use-local-bun.ts <command> [args...]");
  console.error("Example: bun scripts/use-local-bun.ts build");
  process.exit(1);
}

if (existsSync(LOCAL_BUN)) {
  console.log(`🔧 Using local Bun build: ${LOCAL_BUN}`);
  console.log(`   Command: ${args.join(" ")}\n`);

  const proc = spawn(LOCAL_BUN, args, {
    stdio: "inherit",
    shell: false,
  });

  proc.on("exit", (code) => {
    process.exit(code ?? 0);
  });
} else {
  console.warn(`⚠️  Local Bun not found at ${LOCAL_BUN}`);
  console.warn("   Falling back to system Bun");
  console.warn("   Set BUN_REPO_PATH env var to point to your bun repo");

  // Fallback to system bun
  const proc = spawn("bun", args, {
    stdio: "inherit",
    shell: true,
  });

  proc.on("exit", (code) => {
    process.exit(code ?? 0);
  });
}
