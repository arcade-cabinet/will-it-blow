const path = require('path');
const {getDefaultConfig} = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Asset extensions: GLB models, textures, fonts
config.resolver.assetExts.push('glb', 'gltf', 'png', 'jpg', 'ttf', 'woff', 'woff2');

// three/tsl and three/webgpu are subpath exports that Metro can't resolve
// via package.json `exports` field. Map them to the actual build files.
// NOTE: Do NOT redirect bare `three` to three/webgpu — that build includes
// TSL NodeMaterial code that crashes on Hermes. Use standard three import
// and let react-native-wgpu provide the WebGPU surface at the native layer.
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Explicit aliases for three/* sub-paths that Metro can't resolve
  if (moduleName === 'three/tsl') {
    return {type: 'sourceFile', filePath: path.resolve(__dirname, 'node_modules/three/build/three.tsl.js')};
  }
  if (moduleName === 'three/webgpu') {
    return {type: 'sourceFile', filePath: path.resolve(__dirname, 'node_modules/three/build/three.webgpu.js')};
  }

  if (typeof originalResolveRequest === 'function') {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
