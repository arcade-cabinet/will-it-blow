module.exports = api => {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', {unstable_transformImportMeta: true}]],
    plugins: [
      ['react-native-worklets-core/plugin', {processNestedWorklets: true}],
      'react-native-reanimated/plugin',
    ],
  };
};
