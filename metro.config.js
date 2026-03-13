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

// Asset extensions: GLB models, WASM (expo-sqlite), textures, fonts
config.resolver.assetExts.push('glb', 'gltf', 'png', 'jpg', 'ttf', 'woff', 'woff2', 'wasm');

// Remove wasm from sourceExts if present (it's a binary asset, not source)
config.resolver.sourceExts = config.resolver.sourceExts.filter(ext => ext !== 'wasm');

// Add COEP and COOP headers to enable SharedArrayBuffer for expo-sqlite WASM
config.server.enhanceMiddleware = (middleware) => {
  return (req, res, next) => {
    res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
    res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
    middleware(req, res, next);
  };
};

module.exports = config;
