const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

// Get the default Expo config
const config = getDefaultConfig(__dirname);

// Add SVG transformer configuration
const { transformer, resolver } = config;
config.transformer = {
  ...transformer,
  babelTransformerPath: require.resolve("react-native-svg-transformer"),
};
config.resolver = {
  ...resolver,
  assetExts: resolver.assetExts.filter((ext) => ext !== "svg"),
  sourceExts: [...resolver.sourceExts, "svg"],
  // Fix Firebase package.json exports issues
  unstable_enablePackageExports: false,
};

// Apply NativeWind configuration and export
module.exports = withNativeWind(config, { input: "./global.css" });
