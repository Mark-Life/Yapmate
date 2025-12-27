const IS_DEV = process.env.APP_VARIANT === "development";
const IS_PREVIEW = process.env.APP_VARIANT === "preview";

/**
 * Returns unique bundle identifier based on build variant
 */
const getUniqueIdentifier = (baseIdentifier) => {
  if (IS_DEV) {
    return `${baseIdentifier}.dev`;
  }

  if (IS_PREVIEW) {
    return `${baseIdentifier}.preview`;
  }

  return baseIdentifier;
};

/**
 * Returns app name based on build variant
 */
const getAppName = (baseName) => {
  if (IS_DEV) {
    return `${baseName} (Dev)`;
  }

  if (IS_PREVIEW) {
    return `${baseName} (Preview)`;
  }

  return baseName;
};

export default ({ config }) => {
  const baseBundleIdentifier =
    config.ios?.bundleIdentifier ?? config.android?.package;
  const baseAppName = config.name;

  return {
    ...config,
    name: getAppName(baseAppName),
    ios: {
      ...config.ios,
      bundleIdentifier: getUniqueIdentifier(baseBundleIdentifier),
    },
    android: {
      ...config.android,
      package: getUniqueIdentifier(baseBundleIdentifier),
    },
  };
};
