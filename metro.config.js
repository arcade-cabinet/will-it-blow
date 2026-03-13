const {getDefaultConfig} = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

const originalResolveRequest = config.resolver.resolveRequest;

// Ensure native imports of `three` use the WebGPU entry point.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  const isNativePlatform =
    platform === 'ios' || platform === 'android' || platform === 'native';

  if (
    isNativePlatform &&
    (moduleName === 'three' || moduleName.startsWith('three/'))
  ) {
    const webgpuModuleName = moduleName.replace(
      /^three(\/)?/,
      'three/webgpu$1',
    );

    if (typeof originalResolveRequest === 'function') {
      return originalResolveRequest(context, webgpuModuleName, platform);
    }

    return context.resolveRequest(context, webgpuModuleName, platform);
  }

  if (typeof originalResolveRequest === 'function') {
    return originalResolveRequest(context, moduleName, platform);
  }

  return context.resolveRequest(context, moduleName, platform);
};

// GLB/GLTF models must be treated as binary assets by Metro bundler
// so they can be loaded by drei's useGLTF on native
config.resolver.assetExts.push('glb', 'gltf', 'png', 'jpg', 'ttf', 'woff', 'woff2');

module.exports = config;
