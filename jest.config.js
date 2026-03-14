module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.claude/', '/.maestro/', '/docs/'],
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|react-native|@react-native|@react-native-async-storage|expo|@expo|babel-preset-expo|koota)/)',
  ],
  moduleNameMapper: {
    '^react-native-filament$': '<rootDir>/__mocks__/react-native-filament.js',
    '^react-native-worklets-core$': '<rootDir>/__mocks__/react-native-worklets-core.js',
    '.*/engine/AudioEngine$': '<rootDir>/__mocks__/AudioEngine.js',
    '.*/audio/AudioEngine$': '<rootDir>/__mocks__/AudioEngine.js',
  },
};
