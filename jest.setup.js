// Mock navigator.userAgent for detect-gpu (used by @react-three/drei in CI)
if (typeof globalThis.navigator === 'undefined') {
  globalThis.navigator = {userAgent: 'node'};
}

// Mock AsyncStorage for tests
jest.mock('@react-native-async-storage/async-storage', () => {
  const store = {};
  return {
    __esModule: true,
    default: {
      getItem: jest.fn(key => Promise.resolve(store[key] ?? null)),
      setItem: jest.fn((key, value) => {
        store[key] = value;
        return Promise.resolve();
      }),
      removeItem: jest.fn(key => {
        delete store[key];
        return Promise.resolve();
      }),
      clear: jest.fn(() => {
        for (const key of Object.keys(store)) delete store[key];
        return Promise.resolve();
      }),
    },
  };
});
