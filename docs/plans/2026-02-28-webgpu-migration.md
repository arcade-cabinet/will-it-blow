# WebGPU Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Will It Blow? from WebGL to WebGPU via `react-native-wgpu`, enabling unified rendering across web, iOS, Android, and visionOS with a single codebase.

**Architecture:** Replace `expo-gl` (deprecated OpenGL ES) with `react-native-wgpu` (Dawn-based WebGPU). Three.js r183 already ships WebGPU support — import from `three/webgpu`. R3F v9 supports async `gl` prop for WebGPU renderer initialization. The CRT shader must be converted from raw GLSL `ShaderMaterial` to TSL `NodeMaterial` (GLSL doesn't work with WebGPU). Metro resolver maps `three` → `three/webgpu` and forces R3F's web entry point on native (since react-native-wgpu provides a W3C-compliant WebGPU surface).

**Tech Stack:** react-native-wgpu ^0.4, Three.js r183 WebGPU, R3F v9.5, TSL (Three Shading Language), @react-three/xr ^6.6

---

## Task 1: Update Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Add react-native-wgpu and @react-three/xr**

```bash
cd /Users/jbogaty/src/arcade-cabinet/will-it-blow
pnpm add react-native-wgpu@^0.4.1 @react-three/xr@^6.6.0
```

**Step 2: Remove expo-gl**

```bash
pnpm remove expo-gl
```

**Step 3: Verify dependencies resolve**

```bash
pnpm add
```

Expected: Clean install with no peer dependency conflicts.

**Step 4: Verify TypeScript still compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

Expected: No new type errors from dependency changes (existing warnings are acceptable).

**Step 5: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: replace expo-gl with react-native-wgpu, add @react-three/xr"
```

---

## Task 2: Update Metro Config with WebGPU Resolver

**Files:**
- Modify: `metro.config.js`

**Step 1: Add WebGPU module resolution**

The metro config needs two key resolver changes:
1. Resolve `three` → `three/webgpu` so all Three.js imports automatically use the WebGPU build
2. Force R3F to use its web module path on native (react-native-wgpu provides W3C WebGPU, not React Native GL)

Replace the entire `metro.config.js` with:

```javascript
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
```

**Important note:** On web, the metro bundler may handle `three` differently. The resolver only redirects on native platforms. For web, the `three/webgpu` import should be handled at the source level in `GameWorld.tsx` (Task 3).

**Step 2: Verify Metro starts**

```bash
npx expo start --web --no-dev 2>&1 | head -20
```

Expected: Metro bundler starts without resolver errors.

**Step 3: Commit**

```bash
git add metro.config.js
git commit -m "config: add WebGPU resolver to metro.config.js"
```

---

## Task 3: Update GameWorld Canvas to Use WebGPU Renderer

**Files:**
- Modify: `src/components/GameWorld.tsx`

**Step 1: Import WebGPURenderer and configure Canvas**

R3F v9's `<Canvas>` accepts an async `gl` prop that receives the canvas element and returns a renderer. For WebGPU, we create a `WebGPURenderer` and `await renderer.init()`.

At the top of `GameWorld.tsx`, add the WebGPU import and renderer factory:

```typescript
import {WebGPURenderer} from 'three/webgpu';
```

Then update the `<Canvas>` component in the `GameWorld` export:

```typescript
export const GameWorld = () => {
  return (
    <Canvas
      camera={{fov: 70, near: 0.1, far: 100, position: [0, 1.6, 2]}}
      style={{width: '100%', height: '100%'}}
      gl={async (canvas) => {
        const renderer = new WebGPURenderer({
          canvas: canvas as HTMLCanvasElement,
          antialias: true,
          preserveDrawingBuffer: true,
        });
        await renderer.init();
        return renderer;
      }}
    >
      <SceneContent />
    </Canvas>
  );
};
```

**Step 2: Update Three.js import to use WebGPU build**

Change the import at the top of the file:

```typescript
// Before:
import * as THREE from 'three';

// After:
import * as THREE from 'three/webgpu';
```

**Step 3: Verify the app starts on web**

```bash
npx expo start --web
```

Open browser, verify the 3D scene renders. The WebGPU renderer should initialize (check browser console for "THREE.WebGPURenderer" log).

**Note:** If `ShaderMaterial` (CRT shader) throws errors, that's expected — Task 4 converts it to TSL. The rest of the scene (meshStandardMaterial, meshBasicMaterial) should render correctly with WebGPU.

**Step 4: Commit**

```bash
git add src/components/GameWorld.tsx
git commit -m "feat: switch Canvas to WebGPURenderer with async init"
```

---

## Task 4: Convert CRT Shader from GLSL to TSL

**Files:**
- Modify: `src/components/effects/CrtShader.ts`
- Modify: `src/components/kitchen/CrtTelevision.tsx`

This is the most complex task. The CRT shader uses raw GLSL vertex/fragment code in a `ShaderMaterial`. WebGPU doesn't support raw GLSL — it needs WGSL or TSL (Three Shading Language). TSL is a JavaScript-based node graph that compiles to both WGSL (WebGPU) and GLSL (WebGL fallback).

**Step 1: Research TSL equivalents**

Key TSL imports from `three/tsl`:
- `uniform` — creates a uniform node
- `uv`, `sin`, `cos`, `float`, `vec2`, `vec3`, `vec4` — value nodes
- `mix`, `clamp`, `smoothstep`, `step`, `abs`, `floor`, `fract`, `length`, `dot`, `exp`, `mod`, `min`, `max` — math nodes
- `Fn` — defines a TSL function

**Step 2: Rewrite CrtShader.ts using TSL**

Replace the entire file with TSL node-based shader:

```typescript
import {
  Fn,
  NodeMaterial,
  abs,
  clamp,
  dot,
  exp,
  float,
  floor,
  fract,
  length,
  max,
  min,
  mix,
  mod,
  sin,
  smoothstep,
  step,
  uniform,
  uv,
  vec2,
  vec3,
} from 'three/tsl';

// Uniforms
const uTime = uniform(float(0));
const uFlickerIntensity = uniform(float(1.0));
const uStaticIntensity = uniform(float(0.06));
const uReactionIntensity = uniform(float(0.0));

// Pseudo-random (same as GLSL version)
const rand = Fn(([co]: [any]) => {
  return fract(sin(dot(co, vec2(12.9898, 78.233))).mul(43758.5453));
});

// Smooth noise for organic effects
const noise2D = Fn(([p]: [any]) => {
  const i = floor(p);
  const f = fract(p);
  const ff = f.mul(f).mul(float(3.0).sub(f.mul(2.0))); // smoothstep
  const a = rand(i);
  const b = rand(i.add(vec2(1.0, 0.0)));
  const c = rand(i.add(vec2(0.0, 1.0)));
  const d = rand(i.add(vec2(1.0, 1.0)));
  return mix(mix(a, b, ff.x), mix(c, d, ff.x), ff.y);
});

// Main CRT fragment shader as TSL
const crtFragment = Fn(() => {
  const rawUv = uv();

  // --- Barrel distortion ---
  const centered = rawUv.sub(0.5);
  const dist = length(centered);
  const distSq = dist.mul(dist);
  const distortedUv = vec2(
    float(0.5).add(centered.x.mul(float(1.0).add(distSq.mul(0.22)))),
    float(0.5).add(centered.y.mul(float(1.0).add(distSq.mul(0.22)))),
  );

  // --- Horizontal roll (VHS tracking) ---
  const rollSpeed = float(0.6).add(uReactionIntensity.mul(2.0));
  const rollY = fract(uTime.mul(rollSpeed).mul(0.08));
  const rollBand = smoothstep(float(0.0), float(0.06), abs(distortedUv.y.sub(rollY)))
    .mul(smoothstep(float(0.0), float(0.06), abs(distortedUv.y.sub(rollY).sub(1.0))));
  const rollShift = float(1.0).sub(rollBand).mul(0.03).mul(float(1.0).add(uReactionIntensity.mul(4.0)));

  const uvX = distortedUv.x.add(rollShift);
  const uvY = distortedUv.y;
  const finalUv = vec2(uvX, uvY);

  // --- Base phosphor glow ---
  const coldGreen = vec3(0.25, 0.85, 0.35);
  const warmAmber = vec3(0.90, 0.60, 0.15);
  const hotWhite = vec3(0.95, 1.0, 0.90);

  const amberMix = float(0.2).add(sin(uTime.mul(1.2)).mul(0.15)).add(uReactionIntensity.mul(0.5));
  const baseColor1 = mix(coldGreen, warmAmber, clamp(amberMix, 0.0, 1.0));
  const baseColor = mix(baseColor1, hotWhite, clamp(uReactionIntensity.mul(0.6), 0.0, 1.0));

  // Center glow
  const centerGlow = float(1.0).add(exp(distSq.mul(-6.0)).mul(0.6));
  let color = baseColor.mul(centerGlow);

  // --- Scanlines ---
  const scanRaw = sin(finalUv.y.mul(280.0).add(uTime.mul(1.5)));
  const scanEffect = float(0.85).add(scanRaw.mul(0.15));
  color = color.mul(scanEffect);

  // --- Flicker ---
  const flicker = float(1.0).sub(
    uFlickerIntensity.mul(rand(vec2(floor(uTime.mul(6.0)), float(0.0)))).mul(0.08)
  );
  color = color.mul(flicker);

  // --- Static noise ---
  const noiseAmount = uStaticIntensity.add(uReactionIntensity.mul(0.12));
  const noiseVal = rand(finalUv.mul(800.0).add(uTime.mul(7.0))).mul(noiseAmount);
  color = color.add(noiseVal.mul(vec3(0.15, 0.2, 0.12)));

  // --- Vignette ---
  const vignette = max(float(1.0).sub(distSq.mul(2.5).mul(0.5)), float(0.0));
  color = color.mul(vignette);

  // --- Final brightness ---
  color = color.mul(float(2.8).add(uReactionIntensity.mul(1.2)));

  // --- Warm color grading ---
  color = color.mul(vec3(0.82, 1.0, 0.88));

  // --- Out of bounds (barrel distortion overflow) ---
  const inBounds = step(float(0.0), distortedUv.x)
    .mul(step(distortedUv.x, float(1.0)))
    .mul(step(float(0.0), distortedUv.y))
    .mul(step(distortedUv.y, float(1.0)));
  color = color.mul(inBounds);

  return vec4(color, float(1.0));
});

export function createCrtMaterial(_name: string): NodeMaterial {
  const material = new NodeMaterial();
  material.fragmentNode = crtFragment();
  return material;
}

// Export uniform references so CrtTelevision can update them per-frame
export const crtUniforms = {
  time: uTime,
  flickerIntensity: uFlickerIntensity,
  staticIntensity: uStaticIntensity,
  reactionIntensity: uReactionIntensity,
};
```

**Step 3: Update CrtTelevision.tsx to use new uniform API**

The current code accesses `crtMaterial.uniforms.time.value`. With TSL, uniforms are accessed via `.value` on the exported uniform nodes.

In `CrtTelevision.tsx`, change the imports and uniform access:

```typescript
// Before:
import {createCrtMaterial} from '../effects/CrtShader';

// After:
import {createCrtMaterial, crtUniforms} from '../effects/CrtShader';
```

In the `useFrame` callback, replace uniform access:

```typescript
// Before:
crtMaterial.uniforms.time.value = s.time;
crtMaterial.uniforms.reactionIntensity.value = s.currentReactionIntensity;

// After:
crtUniforms.time.value = s.time;
crtUniforms.reactionIntensity.value = s.currentReactionIntensity;
```

**Step 4: Update Three.js import in CrtTelevision.tsx**

```typescript
// Before:
import type * as THREE from 'three';

// After:
import type * as THREE from 'three/webgpu';
```

**Step 5: Verify CRT renders on web**

```bash
npx expo start --web
```

Navigate to tasting challenge (station 4) — the CRT TV should display the shader with scanlines, barrel distortion, and phosphor glow. Check browser console for no WebGPU errors.

**Step 6: Commit**

```bash
git add src/components/effects/CrtShader.ts src/components/kitchen/CrtTelevision.tsx
git commit -m "feat: convert CRT shader from GLSL ShaderMaterial to TSL NodeMaterial"
```

---

## Task 5: Update Three.js Imports Across All Files

**Files:**
- Modify: `src/components/kitchen/KitchenEnvironment.tsx`
- Modify: `src/components/kitchen/FridgeStation.tsx`
- Modify: `src/components/kitchen/GrinderStation.tsx`
- Modify: `src/components/kitchen/StufferStation.tsx`
- Modify: `src/components/kitchen/StoveStation.tsx`
- Modify: `src/components/characters/MrSausage3D.tsx`

**Step 1: Update all `import * as THREE from 'three'` to `'three/webgpu'`**

For each file listed above, change:
```typescript
import * as THREE from 'three';
// to:
import * as THREE from 'three/webgpu';
```

Also change any `import type * as THREE from 'three'` to `'three/webgpu'`.

**Note:** The metro resolver (Task 2) handles this on native, but explicit imports ensure web builds also use WebGPU. If metro already resolves `'three'` → `'three/webgpu'` on web too, these explicit changes are still cleaner for code clarity.

**Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | head -30
```

**Step 3: Commit**

```bash
git add src/components/kitchen/*.tsx src/components/characters/MrSausage3D.tsx
git commit -m "refactor: update Three.js imports to three/webgpu"
```

---

## Task 6: Fix Android Release Build

**Files:**
- Modify: `.github/workflows/release.yml`

The current workflow uses `assembleDebug` which doesn't bundle JS or assets — the APK expects a Metro dev server. For distributable APKs, we need the JS bundle embedded.

**Step 1: Switch to release build with embedded JS bundle**

Update `.github/workflows/release.yml`:

```yaml
      - name: Build release APKs (all architectures)
        working-directory: android
        run: ./gradlew assembleRelease

      - name: List built APKs
        run: find android/app/build/outputs/apk -name "*.apk" -type f

      - name: Upload APKs to release
        env:
          GH_TOKEN: ${{ secrets.CI_GITHUB_TOKEN }}
          RELEASE_TAG: ${{ github.event.release.tag_name }}
        run: |
          for apk in android/app/build/outputs/apk/release/*.apk; do
            filename=$(basename "$apk")
            echo "Uploading $filename to release $RELEASE_TAG..."
            gh release upload "$RELEASE_TAG" "$apk" --clobber
          done
```

Key changes:
1. `assembleDebug` → `assembleRelease` (bundles JS + assets)
2. APK path: `apk/debug/*.apk` → `apk/release/*.apk`
3. Step name updated to "Build release APKs"

**Step 2: Handle signing for release builds**

Release builds need signing. For debug-signed release APKs (usable for sideloading), add a signing config that uses the default debug keystore:

After the `expo prebuild` step, add:

```yaml
      - name: Configure debug signing for release build
        run: |
          cat >> android/app/build.gradle << 'SIGNING'

          android {
              signingConfigs {
                  release {
                      storeFile file("debug.keystore")
                      storePassword "android"
                      keyAlias "androiddebugkey"
                      keyPassword "android"
                  }
              }
              buildTypes {
                  release {
                      signingConfig signingConfigs.release
                  }
              }
          }
          SIGNING
```

This uses the default Android debug keystore (auto-generated) to sign the release APK. This creates a distributable APK with bundled JS that works without Metro.

**Step 3: Commit**

```bash
git add .github/workflows/release.yml
git commit -m "ci: switch Android build to assembleRelease with JS bundle"
```

---

## Task 7: Fix Native Asset Loading

**Files:**
- Modify: `src/components/kitchen/KitchenEnvironment.tsx`

The current `getAssetRootUrl()` uses `document.querySelector('base')` which is web-only. On native (react-native-wgpu), assets loaded by `useGLTF` and `useTexture` from drei need to use React Native's asset resolution via `require()` or Expo's asset system.

**Step 1: Update asset loading for cross-platform**

Replace the `getAssetRootUrl` function and asset loading approach:

```typescript
import {Platform} from 'react-native';
import {Asset} from 'expo-asset';

function getAssetRootUrl(subdir: string): string {
  if (Platform.OS === 'web') {
    if (typeof document !== 'undefined') {
      const base = document.querySelector('base');
      if (base?.href) {
        const url = new URL(base.href);
        return `${url.pathname.replace(/\/$/, '')}/${subdir}/`;
      }
    }
    return `/${subdir}/`;
  }
  // Native: assets are bundled by Metro and served from the app bundle
  // drei's useGLTF/useTexture handle this via the asset URI
  return `${subdir}/`;
}
```

**Note:** Full native asset loading may require additional expo-asset configuration. This is a partial fix — native testing will determine if further changes are needed (e.g., using `Asset.fromModule(require(...))` pattern).

**Step 2: Commit**

```bash
git add src/components/kitchen/KitchenEnvironment.tsx
git commit -m "fix: platform-aware asset URL resolution for native builds"
```

---

## Task 8: Add XR Support for Web

**Files:**
- Modify: `src/components/GameWorld.tsx`
- Create: `src/components/xr/XRSessionManager.tsx` (optional, only if needed)

**Step 1: Add XR button to GameWorld**

`@react-three/xr` provides `<XR>` and `<XRButton>` components. The XR session wraps the Canvas content.

```typescript
import {XR, createXRStore} from '@react-three/xr';

// Create XR store outside component
const xrStore = createXRStore();

export const GameWorld = () => {
  return (
    <>
      {/* XR entry button — only visible on WebXR-capable browsers */}
      <button
        onClick={() => xrStore.enterVR()}
        style={{position: 'absolute', zIndex: 20, bottom: 20, right: 20}}
      >
        Enter VR
      </button>
      <Canvas
        camera={{fov: 70, near: 0.1, far: 100, position: [0, 1.6, 2]}}
        style={{width: '100%', height: '100%'}}
        gl={async (canvas) => {
          const renderer = new WebGPURenderer({
            canvas: canvas as HTMLCanvasElement,
            antialias: true,
            preserveDrawingBuffer: true,
          });
          await renderer.init();
          return renderer;
        }}
      >
        <XR store={xrStore}>
          <SceneContent />
        </XR>
      </Canvas>
    </>
  );
};
```

**Step 2: Verify XR button appears on web**

```bash
npx expo start --web
```

The "Enter VR" button should appear. On non-XR browsers it will show but do nothing on click. On Quest Browser or Chrome Android with WebXR, it should request an immersive session.

**Step 3: Commit**

```bash
git add src/components/GameWorld.tsx
git commit -m "feat: add WebXR support via @react-three/xr"
```

---

## Task 9: Update Tests

**Files:**
- Modify: `__tests__/**/*.test.ts` (any tests importing from 'three')
- Modify: `jest.config.js` or `package.json` jest config

**Step 1: Check which tests import Three.js**

```bash
grep -rl "from 'three'" __tests__/ src/**/*.test.* 2>/dev/null
```

**Step 2: Update test Three.js imports**

If any test files import from `'three'`, update to `'three/webgpu'`. However, most tests should be pure logic tests that don't import Three.js (per CLAUDE.md: "Cannot import Babylon.js or reactylon in tests").

**Step 3: Add Jest module name mapper for three/webgpu**

In the Jest configuration, add a module mapper so `three/webgpu` resolves correctly in the test environment:

```json
{
  "moduleNameMapper": {
    "^three/webgpu$": "three"
  }
}
```

This maps `three/webgpu` back to `three` in Jest (since Jest runs in Node.js where WebGPU isn't available, and the WebGL-based Three.js is sufficient for any Three.js types/mocks needed in tests).

**Step 4: Run all tests**

```bash
pnpm test -- --ci --forceExit
```

Expected: All tests pass (currently 265 tests).

**Step 5: Commit**

```bash
git add jest.config.js package.json __tests__/
git commit -m "test: add Jest module mapper for three/webgpu imports"
```

---

## Task 10: Update Documentation

**Files:**
- Modify: `CLAUDE.md`
- Modify: `docs/architecture.md`
- Modify: `docs/3d-rendering.md`

**Step 1: Update CLAUDE.md**

Update the "What This Is" section to mention WebGPU:
- Replace "Babylon.js 8.53 (via reactylon 3.5)" with "Three.js (WebGPU via react-native-wgpu)"
- Update architecture description to mention TSL shaders
- Update the CRT shader description

**Step 2: Update docs**

Update `docs/3d-rendering.md` and `docs/architecture.md` to reflect:
- WebGPU renderer
- TSL shader system
- react-native-wgpu for native
- @react-three/xr for web XR

**Step 3: Commit**

```bash
git add CLAUDE.md docs/
git commit -m "docs: update architecture docs for WebGPU migration"
```

---

## Verification Checklist

After all tasks:

1. `pnpm test -- --ci --forceExit` — all tests pass
2. `npx tsc --noEmit` — no new type errors
3. `npx expo start --web` — 3D scene renders with WebGPU (check console for "THREE.WebGPURenderer")
4. CRT TV shows scanlines, barrel distortion, phosphor glow
5. Camera walks between stations correctly
6. All 5 challenges render their station meshes
7. VR button appears on web (functional on WebXR browsers)
8. CI passes on push
