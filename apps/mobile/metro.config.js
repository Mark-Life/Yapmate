const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("node:path");

// Metro config must be CommonJS, so use __dirname (not import.meta.dirname)
// biome-ignore lint/correctness/noGlobalDirnameFilename: need for metro
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch monorepo packages
config.watchFolders = [monorepoRoot];

// Enable symlinks for bun's node_modules structure
config.resolver.unstable_enableSymlinks = true;

// Resolve packages from monorepo root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(monorepoRoot, "node_modules"),
];

module.exports = withNativeWind(config, {
  input: "./src/globals.css",
  inlineRem: 16,
});
