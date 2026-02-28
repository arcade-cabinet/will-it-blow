module.exports = {
  preset: 'react-native',
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|react-native|@react-native|expo|@expo|babel-preset-expo|three|@react-three)/)',
  ],
};
