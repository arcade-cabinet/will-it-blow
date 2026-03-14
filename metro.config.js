const {getDefaultConfig} = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Asset extensions: GLB models, textures, fonts
config.resolver.assetExts.push('glb', 'gltf', 'png', 'jpg', 'ttf', 'woff', 'woff2');

// SQL migrations for op-sqlite + drizzle
config.resolver.sourceExts.push('sql');

module.exports = config;
