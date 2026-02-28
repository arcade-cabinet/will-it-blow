const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// GLB/GLTF models must be treated as binary assets by Metro bundler
// so they can be loaded by drei's useGLTF on native
config.resolver.assetExts.push('glb', 'gltf');

module.exports = config;
