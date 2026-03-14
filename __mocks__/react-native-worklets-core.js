// Mock for react-native-worklets-core in Jest tests
module.exports = {
  useSharedValue: (initial) => ({value: initial}),
  runOnUI: (fn) => fn,
  runOnJS: (fn) => fn,
};
