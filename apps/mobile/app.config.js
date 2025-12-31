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

/**
 * Returns scheme based on build variant
 */
const getScheme = () => {
  if (IS_DEV) {
    return "yapmate-dev";
  }

  if (IS_PREVIEW) {
    return "yapmate-preview";
  }

  return "yapmate";
};

export default ({ config }) => {
  const baseAppName = config.name;
  const scheme = getScheme();

  return {
    ...config,
    name: getAppName(baseAppName),
    scheme,
    ios: {
      ...config.ios,
      bundleIdentifier: getUniqueIdentifier(config.ios?.bundleIdentifier),
      associatedDomains: ["applinks:yapmate.com"],
    },
    android: {
      ...config.android,
      package: getUniqueIdentifier(config.android?.package),
    },
  };
};
