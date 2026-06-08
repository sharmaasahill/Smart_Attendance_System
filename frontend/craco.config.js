// CRACO config: customize Create React App's webpack without ejecting.
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Silence noisy "Failed to parse source map" warnings emitted by
      // third-party packages that ship without source maps (e.g. MediaPipe).
      // App source maps are unaffected.
      webpackConfig.ignoreWarnings = [
        ...(webpackConfig.ignoreWarnings || []),
        /Failed to parse source map/,
      ];
      return webpackConfig;
    },
  },
};
