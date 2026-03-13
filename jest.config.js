module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.claude/'],
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|react-native|@react-native|@react-native-async-storage|expo|@expo|babel-preset-expo|three|@react-three|zustand|three-mesh-bvh|tsl-textures|maath|postprocessing|miniplex|miniplex-react)/)',
  ],
  moduleNameMapper: {
    '^three/webgpu$': '<rootDir>/__mocks__/three_webgpu.js',
    '^three/tsl$': '<rootDir>/__mocks__/three_tsl.js',
    '.*/engine/AudioEngine$': '<rootDir>/__mocks__/AudioEngine.js',
    '^@shopify/react-native-skia$': '<rootDir>/__mocks__/react-native-skia.js',
    '^expo-keep-awake$': '<rootDir>/__mocks__/expo-keep-awake.js',
    '^@react-three/postprocessing$': '<rootDir>/__mocks__/postprocessing.js',
    '^postprocessing$': '<rootDir>/__mocks__/postprocessing.js',
  },
};
