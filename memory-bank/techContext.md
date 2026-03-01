# Tech Context — Will It Blow?

## Core Stack

| Technology | Version | Role |
|-----------|---------|------|
| React Native | 0.83.2 | UI framework, cross-platform runtime |
| Three.js | 0.183.1 | 3D engine (WebGPU renderer, TSL shaders) |
| React Three Fiber | 9.5.0 | React reconciler for Three.js (declarative JSX scene graph) |
| @react-three/drei | 10.7.7 | R3F helpers: useGLTF, useTexture, Environment, etc. |
| @react-three/xr | 6.6.29 | WebXR support (web only) |
| @react-three/cannon | 6.6.0 | Physics (available, not primary) |
| react-native-wgpu | 0.5.7 | Dawn-based WebGPU surface for native (iOS/Android) |
| Expo | 55.0.0 | Build toolchain, dev server, deployment |
| Zustand | 5.0.11 | State management (single store, no React Context) |
| Tone.js | 15.1.22 | Web audio synthesis (procedural SFX) |
| react-reconciler | ^0.33.0 | React reconciler (was pinned at 0.31.0 during migration) |

## Build & Dev Tools

| Tool | Version/Config | Purpose |
|------|---------------|---------|
| **pnpm** | — | Package manager (NOT npm or yarn). Lockfile: `pnpm-lock.yaml` |
| **Biome** | 2.4 | Linter + formatter (NOT ESLint/Prettier) |
| **Metro** | — | Bundler. WebGPU resolver maps `'three'` to `'three/webgpu'` on native |
| **Jest** | — | Test runner with react-native preset |
| **@react-three/test-renderer** | — | R3F component testing in Node.js |
| **TypeScript** | — | Type checking via `pnpm typecheck` (node --stack-size=8192) |
| **GitHub Actions** | — | CI (tests on push) + CD (GitHub Pages deploy) |

## Commands

```bash
# Development
npx expo start --web          # Web dev server (primary dev target)

# Testing
pnpm test                     # Run all Jest tests (256+)
pnpm test:ci                  # CI mode (--ci --forceExit)

# Linting & formatting
pnpm lint                     # Check lint + format errors (Biome)
pnpm format                   # Auto-fix lint + format errors (Biome)

# Type checking
pnpm typecheck                # node --stack-size=8192 (required for Three.js types)
```

## WebGPU Pipeline

- **Web:** Browser-native WebGPU via Three.js `WebGPURenderer`
- **Native:** `react-native-wgpu` provides a Dawn-based WebGPU surface
- **Metro resolver:** Bare `'three'` imports remapped to `'three/webgpu'` on native platforms
- **Shaders:** TSL (Three Shading Language) `NodeMaterial` — compiles to WGSL for WebGPU or GLSL for WebGL2 fallback. Raw GLSL `ShaderMaterial` is NOT compatible with WebGPU renderer.
- **TSL imports:** Node functions from `'three/tsl'`, `NodeMaterial` from `'three/webgpu'`

## Platform Split

Only one platform-specific file remains:

- `AudioEngine.web.ts` — Full Tone.js synthesis (7 SFX instruments + 2 melodies)
- `AudioEngine.ts` — Native no-op stub

Everything else (including the entire 3D layer) is unified cross-platform.

## Testing Stack

- **Framework:** Jest with react-native preset
- **R3F components:** `@react-three/test-renderer` (renders Three.js scene graph in Node.js)
- **Coverage:** 256+ tests across ~24 test files
- **Pure logic tests:** SausagePhysics, Ingredients, ChallengeRegistry, IngredientMatcher, DialogueEngine, gameStore
- **Component tests:** MrSausage3D, CrtTelevision, KitchenEnvironment, FridgeStation, GrinderStation, StufferStation, StoveStation, Ingredient3D, GameWorld, CrtShader
- **Jest config:** `transformIgnorePatterns` must allowlist `three` and `@react-three` (ESM modules)
- **Mocking:** `useGLTF` must be mocked (file loading unavailable in Node.js). `__mocks__/@react-three/xr.js` auto-resolved for GameWorld tests.

## CI/CD

- `.github/workflows/ci.yml` — Tests on push to `main` and `feat/**` branches
- `.github/workflows/cd.yml` — Web export via Expo, deploy to GitHub Pages on push to main
- **Live:** https://arcade-cabinet.github.io/will-it-blow/

## Assets

| Asset | Size | Location | Notes |
|-------|------|----------|-------|
| kitchen.glb | 15.5 MB | public/models/ | PBR-textured kitchen (Blender bake, Draco compressed) |
| kitchen-original.glb | 970 KB | public/models/ | Original untextured GLB |
| sausage.glb | 1 MB | public/models/ | Legacy model (unused) |
| PBR textures | ~10 MB total | public/textures/ | AmbientCG 1K-JPG sets (tile, concrete, grime) |
| environment.env | — | public/textures/ | Prefiltered IBL cubemap |

## Known Technical Pitfalls

1. **TypeScript stack overflow:** `npx tsc --noEmit` crashes — Three.js recursive types exceed Node default stack. Use `pnpm typecheck` (sets --stack-size=8192). `skipLibCheck: true` alone is insufficient.
2. **import.meta in Metro:** Zustand ESM uses `import.meta.env.MODE`. Must have `unstable_transformImportMeta: true` in babel.config.js.
3. **TSL vs GLSL:** WebGPU renderer rejects raw GLSL ShaderMaterial. Use TSL NodeMaterial.
4. **useGLTF in tests:** Must mock `@react-three/drei`'s `useGLTF` — file loading doesn't work in Node.js.
5. **Stale closures in useFrame:** Use `useRef` for values read inside `useFrame` callbacks.
6. **`let` + closure = `never` type:** TypeScript can't track mutations inside callbacks. Assign to `const` after null guard.
7. **Metro WebGPU resolver:** On native, bare `'three'` is remapped to `'three/webgpu'`. Direct `'three/webgpu'` imports work everywhere.
