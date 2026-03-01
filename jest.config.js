module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|react-native|@react-native|@react-native-async-storage|expo|@expo|babel-preset-expo|three|@react-three|zustand)/)',
  ],
  moduleNameMapper: {
    '^three/webgpu$': '<rootDir>/__mocks__/three_webgpu.js',
    '^three/tsl$': '<rootDir>/__mocks__/three_tsl.js',
    '.*/engine/AudioEngine$': '<rootDir>/__mocks__/AudioEngine.js',
  },
};
