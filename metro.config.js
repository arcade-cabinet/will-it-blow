const {getDefaultConfig} = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

// GLB/GLTF models must be treated as binary assets by Metro bundler
// so they can be loaded by drei's useGLTF on native
config.resolver.assetExts.push('glb', 'gltf');

// ── WebGPU Resolution ──────────────────────────────────────────
// react-native-wgpu provides a W3C-compliant WebGPU surface on native,
// so Three.js and R3F should use their web/WebGPU code paths.

// Map bare 'three' imports to 'three/webgpu' for the WebGPU renderer + TSL
const threeWebGPU = path.resolve(
  __dirname,
  'node_modules/three/src/Three.WebGPU.js',
);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Redirect 'three' → 'three/webgpu' (but not sub-paths like 'three/examples/...')
  if (moduleName === 'three' && platform !== 'web') {
    return context.resolveRequest(context, threeWebGPU, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
