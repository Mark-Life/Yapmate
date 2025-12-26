#!/usr/bin/env bun
/**
 * Use locally built Bun from the bun repository
 * This allows testing your local Bun changes in your app
 */

import { spawn } from "node:child_process";
import { existsSync, symlinkSync, unlinkSync } from "node:fs";
import path from "node:path";

const BUN_REPO_PATH =
  process.env.BUN_REPO_PATH || "/Users/andrey/Code/public/bun";
const LOCAL_BUN = `${BUN_REPO_PATH}/build/debug/bun-debug`;
const LOCAL_BUN_DIR = path.dirname(LOCAL_BUN);

const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("Usage: bun scripts/use-local-bun.ts <command> [args...]");
  console.error("Example: bun scripts/use-local-bun.ts build");
  process.exit(1);
}

if (existsSync(LOCAL_BUN)) {
  console.log(`🔧 Using local Bun build: ${LOCAL_BUN}`);
  console.log(`   Command: ${args.join(" ")}\n`);

  // Create a "bun" symlink so nested `bun` commands also use the local build
  const bunSymlink = path.join(LOCAL_BUN_DIR, "bun");
  let createdSymlink = false;
  if (!existsSync(bunSymlink)) {
    try {
      symlinkSync(LOCAL_BUN, bunSymlink);
      createdSymlink = true;
    } catch {
      // Ignore symlink creation errors
    }
  }

  // Prepend local bun dir to PATH so nested `bun` calls use it
  const env = {
    ...process.env,
    PATH: `${LOCAL_BUN_DIR}:${process.env.PATH}`,
  };

  const proc = spawn(LOCAL_BUN, args, {
    stdio: "inherit",
    shell: false,
    env,
  });

  proc.on("exit", (code) => {
    // Clean up symlink if we created it
    if (createdSymlink) {
      try {
        unlinkSync(bunSymlink);
      } catch {
        // Ignore cleanup errors
      }
    }
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
