#!/usr/bin/env bun

/**
 * Export YAP icon SVG to PNG files for React Native
 * Generates @1x, @2x, @3x sizes for different screen densities
 */

import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";

const OUTPUT_DIR = join(import.meta.dirname, "../apps/mobile/assets/images");

/** Base size in pixels (@1x) */
const BASE_SIZE = 100;

/** Densities to generate */
const DENSITIES = [1, 2, 3] as const;

/**
 * Static SVG string for the YAP icon
 * Uses system monospace as fallback since Sharp/librsvg may not have custom fonts
 */
const createSvg = (size: number, color = "#ffffff") => `
<svg
  xmlns="http://www.w3.org/2000/svg"
  viewBox="0 0 100 100"
  width="${size}"
  height="${size}"
>
  <style>
    text {
      font-family: "JetBrains Mono", "Fira Code", "SF Mono", "Consolas", "Monaco", "Menlo", monospace;
      font-size: 7px;
      white-space: pre;
      dominant-baseline: middle;
      fill: ${color};
    }
  </style>
  <text text-anchor="middle" x="48" y="17">██╗   ██╗ █████╗ █████╗</text>
  <text text-anchor="middle" x="48" y="23">  ██╗ ██╔╝██╔══██╗██╔═██╗</text>
  <text text-anchor="middle" x="48" y="29">   ████╔╝ ███████║█████╔╝</text>
  <text text-anchor="middle" x="48" y="35">   ██╔╝  ██╔══██║██╔══╝</text>
  <text text-anchor="middle" x="48" y="41">██║   ██║  ██║██║</text>
  <text text-anchor="middle" x="48" y="47">╚═╝   ╚═╝  ╚═╝╚═╝</text>
  <text text-anchor="middle" x="48" y="63"> ▀▀▀▀         ▀▀▀▀</text>
  <text text-anchor="middle" x="48" y="67"> ████         ████</text>
  <text text-anchor="middle" x="48" y="79">             █</text>
  <text text-anchor="middle" x="48" y="83"> █████████████</text>
</svg>
`;

/**
 * Export SVG to PNG at specified density
 */
const exportPng = async (density: number, color: string, suffix: string) => {
  const size = BASE_SIZE * density;
  const svg = createSvg(size, color);
  const densitySuffix = density === 1 ? "" : `@${density}x`;
  const filename = `yap-icon${suffix}${densitySuffix}.png`;
  const outputPath = join(OUTPUT_DIR, filename);

  await sharp(Buffer.from(svg)).png().toFile(outputPath);

  console.log(`✓ ${filename} (${size}x${size})`);
};

const main = async () => {
  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });

  console.log(`Exporting YAP icon to ${OUTPUT_DIR}\n`);

  // Export white version (for dark backgrounds)
  console.log("White version:");
  for (const density of DENSITIES) {
    await exportPng(density, "#ffffff", "");
  }

  // Export black version (for light backgrounds)
  console.log("\nBlack version:");
  for (const density of DENSITIES) {
    await exportPng(density, "#000000", "-dark");
  }

  console.log("\n✅ Done! Icons exported to apps/mobile/assets/images/");
};

main().catch(console.error);
