# R3F Migration Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace reactylon + Babylon.js with React Three Fiber + Three.js for declarative 3D, Jest-testable components, and unified platform support.

**Architecture:** Install R3F ecosystem alongside Babylon (temporarily). Rewrite each 3D component bottom-up (leaf components first, GameWorld last). Remove Babylon deps after all components are migrated. Pure logic and UI overlay code is untouched.

**Tech Stack:** `three`, `@react-three/fiber` (with `/native` import), `@react-three/drei`, `@react-three/cannon`, `@react-three/test-renderer`, `expo-gl`

---

## Context for the Implementer

This is a React Native 0.83 + Expo 55 game. The 3D scene currently uses Babylon.js via `reactylon`. Every 3D component follows the same imperative pattern:

```tsx
// OLD pattern (Babylon.js)
const scene = useScene();
useEffect(() => {
  const mesh = MeshBuilder.CreateSphere('name', { diameter: 1 }, scene);
  const mat = new StandardMaterial('name', scene);
  mat.disableLighting = true;
  mat.emissiveColor = new Color3(r, g, b);
  mesh.material = mat;
  return () => { mesh.dispose(); mat.dispose(); };
}, [scene]);
return null;
```

We're replacing this with:

```tsx
// NEW pattern (R3F)
return (
  <mesh>
    <sphereGeometry args={[0.5, 12, 12]} />
    <meshBasicMaterial color={[r, g, b]} />
  </mesh>
);
```

Key R3F differences from Babylon.js:
- `sphereGeometry` takes radius (not diameter). Babylon `diameter: 1` → R3F `args={[0.5, segments, segments]}`
- `meshBasicMaterial` = unlit (like Babylon's `disableLighting: true` + `emissiveColor`)
- `meshStandardMaterial` = PBR (like Babylon's `PBRMaterial`)
- `useFrame((state, delta) => { ... })` replaces `scene.onBeforeRenderObservable.add()`
- `useThree()` gives access to `camera`, `scene`, `gl` (renderer)
- `onClick`, `onPointerOver` props on `<mesh>` replace `ActionManager`
- No manual `.dispose()` calls — React lifecycle handles cleanup
- `useRef<THREE.Mesh>(null)` + `ref={meshRef}` to access mesh in `useFrame`
- Three.js uses Y-up, same as Babylon.js. Positions are compatible.
- Three.js `Color` takes hex string `"#eb9e59"` or `new THREE.Color(r, g, b)` (0-1 range, same as Babylon)

**IMPORTANT:** The app will NOT compile between tasks 2-11. This is expected — we're rewriting all 3D files. Pure logic tests (177 tests) will keep passing throughout. The app will work again after Task 11 (GameWorld migration). Component-level tests via `@react-three/test-renderer` can be written and run during the migration.

---

### Task 1: Install R3F Dependencies and Update Configs

**Files:**
- Modify: `package.json`
- Modify: `metro.config.js`
- Modify: `babel.config.js`
- Modify: `jest.config.js`

**Step 1: Install R3F packages alongside Babylon (both present temporarily)**

Run:
```bash
pnpm add three @react-three/fiber @react-three/drei @react-three/cannon expo-gl
pnpm add --save-dev @types/three @react-three/test-renderer
```

Expected: All packages install without errors. `package.json` now has both `reactylon`/`@babylonjs/*` AND `three`/`@react-three/*`.

**Step 2: Update metro.config.js to include GLB/GLTF assets**

Replace the entire file with:

```js
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// GLB/GLTF models must be treated as binary assets by Metro bundler
// so they can be loaded by drei's useGLTF on native
config.resolver.assetExts.push('glb', 'gltf');

module.exports = config;
```

**Step 3: Update babel.config.js — remove reactylon plugin**

Replace the entire file with:

```js
module.exports = function (api) {
    api.cache(true);
    return {
        presets: ['babel-preset-expo'],
    };
};
```

The `babel-plugin-reactylon` plugin is only needed for reactylon's JSX transform. R3F uses standard React JSX.

**Step 4: Update jest.config.js — add Three.js/R3F transform patterns**

Replace the entire file with:

```js
module.exports = {
  preset: 'react-native',
  testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
  transformIgnorePatterns: [
    'node_modules/(?!(react-native|@react-native|expo|@expo|babel-preset-expo|three|@react-three)/)',
  ],
};
```

The key change: added `three` and `@react-three` to the transform allowlist so Jest can process their ESM exports.

**Step 5: Verify pure logic tests still pass**

Run: `pnpm test -- --ci --forceExit`

Expected: All 199 tests pass. (Pure logic + InputActions + HapticService + gameStore tests are unaffected.)

**Step 6: Commit**

```bash
git add package.json package-lock.json metro.config.js babel.config.js jest.config.js
git commit -m "feat: install R3F ecosystem alongside Babylon.js, update configs"
```

---

### Task 2: Migrate CRT Shader to Three.js

**Files:**
- Modify: `src/components/effects/CrtShader.ts`
- Create: `src/components/effects/__tests__/CrtShader.test.ts`

**Step 1: Write the test**

Create `src/components/effects/__tests__/CrtShader.test.ts`:

```ts
import { createCrtMaterial } from '../CrtShader';

describe('CrtShader', () => {
  it('creates a ShaderMaterial with correct uniforms', () => {
    const mat = createCrtMaterial('test');
    expect(mat.uniforms.time.value).toBe(0);
    expect(mat.uniforms.flickerIntensity.value).toBe(1.0);
    expect(mat.uniforms.staticIntensity.value).toBe(0.05);
    expect(mat.uniforms.reactionIntensity.value).toBe(0.0);
  });

  it('has vertex and fragment shaders defined', () => {
    const mat = createCrtMaterial('test');
    expect(mat.vertexShader).toContain('gl_Position');
    expect(mat.fragmentShader).toContain('gl_FragColor');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- --testPathPattern CrtShader --ci --forceExit`

Expected: FAIL — current `createCrtMaterial` returns a Babylon ShaderMaterial, not a Three.js one.

**Step 3: Rewrite CrtShader.ts for Three.js**

Replace `src/components/effects/CrtShader.ts` entirely:

```ts
import * as THREE from 'three';

const CRT_VERTEX = `
precision highp float;

varying vec2 vUV;

void main() {
  vUV = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const CRT_FRAGMENT = `
precision highp float;

varying vec2 vUV;

uniform float time;
uniform float flickerIntensity;
uniform float staticIntensity;
uniform float reactionIntensity;

float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUV;

  // Barrel distortion
  vec2 centered = uv - 0.5;
  float dist = length(centered);
  uv = 0.5 + centered * (1.0 + 0.18 * dist * dist);

  // Horizontal roll distortion
  float rollSpeed = 0.8 + reactionIntensity * 1.5;
  float rollY = fract(time * rollSpeed * 0.1);
  float rollBand = smoothstep(0.0, 0.08, abs(uv.y - rollY)) *
                   smoothstep(0.0, 0.08, abs(uv.y - rollY - 1.0));
  float rollShift = (1.0 - rollBand) * 0.02 * (1.0 + reactionIntensity * 3.0);
  uv.x += rollShift;

  // Horizontal tear
  float tearLine = step(0.995, rand(vec2(floor(time * 8.0), 0.0)));
  float tearY = rand(vec2(floor(time * 8.0), 1.0));
  float tearActive = tearLine * step(abs(uv.y - tearY), 0.01);
  uv.x += tearActive * 0.05 * (1.0 + reactionIntensity * 2.0);

  // Base CRT phosphor glow
  vec3 baseGreen = vec3(0.04, 0.14, 0.06);
  vec3 warmAmber = vec3(0.12, 0.08, 0.02);
  float amberPulse = reactionIntensity * 0.5 + 0.15 * sin(time * 1.5);
  vec3 color = mix(baseGreen, warmAmber, clamp(amberPulse, 0.0, 1.0));

  // Brighter center glow
  float centerGlow = 1.0 + 0.3 * exp(-dist * dist * 8.0);
  color *= centerGlow;

  // Scanlines
  float scanFreq = 320.0;
  float scanWobble = sin(time * 0.7 + uv.x * 20.0) * 0.5;
  float scanline = sin(uv.y * scanFreq + time * 2.0 + scanWobble) * 0.06;
  color += scanline;

  // RGB phosphor separation
  float chromaOffset = 0.003 + reactionIntensity * 0.004;
  float rShift = rand(vec2(floor(uv.y * scanFreq), time * 0.01)) * chromaOffset;
  color.r += 0.02 * sin(uv.x * 100.0 + rShift);
  color.b += 0.015 * sin(uv.x * 100.0 - chromaOffset * 50.0);

  // Phosphor dot pattern
  float dotX = mod(uv.x * 600.0, 3.0);
  float dotMask = 0.92 + 0.08 * step(1.0, dotX) * step(dotX, 2.0);
  color *= dotMask;

  // Flicker
  float flicker = 1.0 - flickerIntensity * rand(vec2(time * 0.1, 0.0)) * 0.12;
  flicker -= reactionIntensity * 0.05 * sin(time * 30.0);

  // Static noise
  float noiseAmount = staticIntensity + reactionIntensity * 0.08;
  float noise = rand(uv + time) * noiseAmount;

  // Vignette
  float vignette = 1.0 - 0.7 * dist * dist;

  // Screen edge glow
  float edgeDist = max(abs(centered.x), abs(centered.y));
  float edgeGlow = smoothstep(0.42, 0.48, edgeDist) * 0.08;
  color += vec3(0.0, edgeGlow * 0.5, edgeGlow * 0.3);

  // Combine
  color = color * flicker * vignette + noise * vec3(0.1, 0.12, 0.08);

  // CRT color temperature
  color *= vec3(0.75, 1.0, 0.82);

  // Boost brightness
  color *= 1.3 + reactionIntensity * 0.4;

  // Out-of-bounds
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    color = vec3(0.0);
  }

  gl_FragColor = vec4(color, 1.0);
}
`;

export function createCrtMaterial(name: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: CRT_VERTEX,
    fragmentShader: CRT_FRAGMENT,
    uniforms: {
      time: { value: 0 },
      flickerIntensity: { value: 1.0 },
      staticIntensity: { value: 0.05 },
      reactionIntensity: { value: 0.0 },
    },
  });
}
```

Key changes from Babylon version:
- `worldViewProjection` → `projectionMatrix * modelViewMatrix` (Three.js provides these automatically)
- `attribute vec3 position; attribute vec2 uv;` removed (Three.js provides these automatically)
- Function signature drops `scene` parameter (Three.js materials are scene-independent)
- Returns `THREE.ShaderMaterial` instead of `ShaderMaterial` from `@babylonjs/core`

**Step 4: Run tests**

Run: `pnpm test -- --testPathPattern CrtShader --ci --forceExit`

Expected: 2 tests PASS.

**Step 5: Run all tests to verify no regressions**

Run: `pnpm test -- --ci --forceExit`

Expected: 201 tests pass (199 existing + 2 new).

**Step 6: Commit**

```bash
git add src/components/effects/CrtShader.ts src/components/effects/__tests__/CrtShader.test.ts
git commit -m "feat: migrate CRT shader from Babylon.js to Three.js ShaderMaterial"
```

---

### Task 3: Rewrite MrSausage3D as R3F Declarative Component

**Files:**
- Modify: `src/components/characters/MrSausage3D.tsx`
- Create: `src/components/characters/__tests__/MrSausage3D.test.tsx`

This is the largest rewrite — 630 lines of imperative Babylon becomes ~350 lines of declarative R3F JSX.

**Step 1: Write the test**

Create `src/components/characters/__tests__/MrSausage3D.test.tsx`:

```tsx
import React from 'react';
import ReactThreeTestRenderer from '@react-three/test-renderer';
import { MrSausage3D } from '../MrSausage3D';

describe('MrSausage3D', () => {
  it('renders without crashing', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <MrSausage3D reaction="idle" />
    );
    expect(renderer.scene.children.length).toBeGreaterThan(0);
  });

  it('creates a root group at the specified position', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <MrSausage3D reaction="idle" position={[1, 2, 3]} />
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(1);
    expect(root.instance.position.y).toBe(2);
    expect(root.instance.position.z).toBe(3);
  });

  it('applies scale uniformly', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <MrSausage3D reaction="idle" scale={0.5} />
    );
    const root = renderer.scene.children[0];
    expect(root.instance.scale.x).toBe(0.5);
    expect(root.instance.scale.y).toBe(0.5);
    expect(root.instance.scale.z).toBe(0.5);
  });

  it('accepts all valid reactions without error', async () => {
    const reactions = ['idle', 'flinch', 'laugh', 'disgust', 'excitement', 'nervous', 'nod', 'talk'] as const;
    for (const reaction of reactions) {
      const renderer = await ReactThreeTestRenderer.create(
        <MrSausage3D reaction={reaction} />
      );
      expect(renderer.scene.children.length).toBeGreaterThan(0);
      await renderer.unmount();
    }
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- --testPathPattern MrSausage3D --ci --forceExit`

Expected: FAIL — current component uses Babylon imports.

**Step 3: Rewrite MrSausage3D.tsx**

Replace `src/components/characters/MrSausage3D.tsx` entirely with:

```tsx
import React, { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { REACTIONS, type Reaction } from './reactions';

interface MrSausage3DProps {
  reaction?: Reaction;
  position?: [number, number, number];
  scale?: number;
  rotationY?: number;
  trackCamera?: boolean;
}

/** Toon-style unlit material color (replaces Babylon disableLighting + emissiveColor) */
const toon = (hex: string) => <meshBasicMaterial color={hex} />;

export const MrSausage3D = ({
  reaction = 'idle',
  position = [0, 0, 0],
  scale = 1,
  rotationY = 0,
  trackCamera = false,
}: MrSausage3DProps) => {
  const rootRef = useRef<THREE.Group>(null);
  const reactionRef = useRef<Reaction>(reaction);
  reactionRef.current = reaction;

  // Refs for animated parts
  const headRef = useRef<THREE.Mesh>(null);
  const stacheCenterRef = useRef<THREE.Mesh>(null);
  const curlLRef = useRef<THREE.Mesh>(null);
  const curlRRef = useRef<THREE.Mesh>(null);
  const mouthRef = useRef<THREE.Mesh>(null);
  const lowerLipRef = useRef<THREE.Mesh>(null);
  const lidLRef = useRef<THREE.Mesh>(null);
  const lidRRef = useRef<THREE.Mesh>(null);
  const irisLRef = useRef<THREE.Mesh>(null);
  const irisRRef = useRef<THREE.Mesh>(null);
  const pupilLRef = useRef<THREE.Mesh>(null);
  const pupilRRef = useRef<THREE.Mesh>(null);
  const cheekMatRef = useRef<THREE.MeshBasicMaterial>(null);

  // Animation state
  const timeRef = useRef(0);
  const reactionElapsedRef = useRef(0);
  const prevReactionRef = useRef<Reaction>(reaction);
  const nextBlinkRef = useRef(2 + Math.random() * 3);
  const blinkPhaseRef = useRef(0);
  const trackYawRef = useRef(0);
  const trackPitchRef = useRef(0);

  const { camera } = useThree();

  useFrame((_, delta) => {
    if (!rootRef.current) return;
    const root = rootRef.current;
    timeRef.current += delta;
    const time = timeRef.current;

    const currentReaction = reactionRef.current;
    const reactionDef = REACTIONS[currentReaction];

    if (currentReaction !== prevReactionRef.current) {
      prevReactionRef.current = currentReaction;
      reactionElapsedRef.current = 0;
    }
    reactionElapsedRef.current += delta * 1000;

    const active = reactionDef.loop || reactionElapsedRef.current <= reactionDef.duration;

    // Camera tracking
    if (trackCamera) {
      const camPos = camera.position;
      const rootWorldPos = new THREE.Vector3();
      root.getWorldPosition(rootWorldPos);
      const dir = camPos.clone().sub(rootWorldPos);

      const targetYaw = Math.atan2(dir.x, dir.z) - rotationY;
      const dist = Math.sqrt(dir.x * dir.x + dir.z * dir.z);
      const targetPitch = -Math.atan2(dir.y, dist) * 0.3;

      const maxYaw = 0.4;
      const maxPitch = 0.2;
      const clampedYaw = Math.max(-maxYaw, Math.min(maxYaw, targetYaw));
      const clampedPitch = Math.max(-maxPitch, Math.min(maxPitch, targetPitch));

      trackYawRef.current += (clampedYaw - trackYawRef.current) * Math.min(3.0 * delta, 1.0);
      trackPitchRef.current += (clampedPitch - trackPitchRef.current) * Math.min(3.0 * delta, 1.0);
    }

    // Natural blink
    nextBlinkRef.current -= delta;
    if (nextBlinkRef.current <= 0 && blinkPhaseRef.current === 0) {
      blinkPhaseRef.current = 1;
      nextBlinkRef.current = 2.5 + Math.random() * 4;
    }
    if (blinkPhaseRef.current > 0) {
      blinkPhaseRef.current += delta * 12;
      if (blinkPhaseRef.current >= 2) blinkPhaseRef.current = 0;
    }
    const bp = blinkPhaseRef.current;
    const naturalBlink = bp > 0 ? (bp < 1 ? bp : 2 - bp) : 0;

    // Default state
    let lidCloseL = naturalBlink;
    let lidCloseR = naturalBlink;
    let pupilX = 0;
    let pupilY = 0;
    let pupilSize = 1.0;
    let mouthOpen = 0;
    let cheekBlush = 0;

    const baseY = position[1];
    const trackYaw = trackYawRef.current;
    const trackPitch = trackPitchRef.current;

    // Per-reaction animation
    switch (currentReaction) {
      case 'idle': {
        root.position.y = baseY + Math.sin(time * 1.8) * 0.15;
        root.rotation.y = rotationY + trackYaw + Math.sin(time * 0.6) * 0.06;
        root.rotation.x = trackPitch;
        root.rotation.z = Math.sin(time * 1.2) * 0.03;
        if (stacheCenterRef.current) stacheCenterRef.current.rotation.z = Math.sin(time * 3) * 0.04;
        if (curlLRef.current) curlLRef.current.rotation.z = Math.sin(time * 3) * 0.05;
        if (curlRRef.current) curlRRef.current.rotation.z = -Math.sin(time * 3) * 0.05;
        pupilX = Math.sin(time * 0.4) * 0.02;
        pupilY = Math.sin(time * 0.3) * 0.01;
        break;
      }
      case 'flinch': {
        if (active) {
          root.rotation.z = -0.15;
          root.rotation.x = -0.1 + trackPitch;
          root.position.y = baseY + 0.2;
          root.rotation.y = rotationY + trackYaw;
          pupilSize = 0.5;
          mouthOpen = 0.8;
          cheekBlush = 0.1;
        } else {
          const decay = 1 - Math.exp(-10 * delta);
          root.rotation.z += (0 - root.rotation.z) * decay;
          root.rotation.x += (trackPitch - root.rotation.x) * decay;
          root.position.y = baseY;
          root.rotation.y = rotationY + trackYaw;
        }
        break;
      }
      case 'laugh': {
        root.position.x = position[0] + Math.sin(time * 22) * 0.12;
        root.position.y = baseY + Math.abs(Math.sin(time * 7)) * 0.3;
        root.rotation.z = Math.sin(time * 18) * 0.06;
        root.rotation.y = rotationY + trackYaw;
        root.rotation.x = trackPitch;
        if (stacheCenterRef.current) stacheCenterRef.current.rotation.z = Math.sin(time * 5) * 0.08;
        lidCloseL = 0.8;
        lidCloseR = 0.8;
        mouthOpen = 0.6 + Math.sin(time * 12) * 0.3;
        cheekBlush = 0.3;
        break;
      }
      case 'disgust': {
        if (active) {
          root.rotation.z = 0.12;
          root.rotation.x = -0.2 + trackPitch;
          root.rotation.y = rotationY + trackYaw;
          lidCloseL = 0.6;
          lidCloseR = 0.15;
          mouthOpen = 0.3;
          cheekBlush = 0.85;
          pupilSize = 0.7;
          pupilX = 0.04;
        } else {
          const decay = 1 - Math.exp(-10 * delta);
          root.rotation.z += (0 - root.rotation.z) * decay;
          root.rotation.x += (trackPitch - root.rotation.x) * decay;
          root.rotation.y = rotationY + trackYaw;
        }
        root.position.y = baseY;
        break;
      }
      case 'excitement': {
        root.position.y = baseY + Math.abs(Math.sin(time * 6)) * 0.5;
        if (headRef.current) {
          const pulse = 1 + Math.sin(time * 8) * 0.04;
          headRef.current.scale.y = 1.05 * pulse;
        }
        root.rotation.z = Math.sin(time * 10) * 0.05;
        root.rotation.y = rotationY + trackYaw;
        root.rotation.x = trackPitch;
        pupilSize = 1.5;
        mouthOpen = 0.5 + Math.sin(time * 4) * 0.2;
        cheekBlush = 0.2;
        break;
      }
      case 'nervous': {
        root.position.x = position[0] + Math.sin(time * 14) * 0.04;
        root.position.y = baseY + Math.sin(time * 2) * 0.06;
        root.rotation.z = Math.sin(time * 3) * 0.04;
        root.rotation.y = rotationY + trackYaw;
        root.rotation.x = trackPitch;
        pupilX = Math.sin(time * 8) * 0.07;
        pupilY = Math.sin(time * 5) * 0.02;
        mouthOpen = 0.05 + Math.sin(time * 6) * 0.05;
        cheekBlush = 0.15;
        pupilSize = 0.8;
        break;
      }
      case 'nod': {
        const nodPhase = (reactionElapsedRef.current / 300) * Math.PI;
        root.rotation.x = Math.abs(Math.sin(nodPhase)) * 0.25 + trackPitch;
        root.rotation.y = rotationY + trackYaw;
        root.position.y = baseY;
        const nodClose = Math.abs(Math.sin(nodPhase)) * 0.4;
        lidCloseL = Math.max(naturalBlink, nodClose);
        lidCloseR = Math.max(naturalBlink, nodClose);
        break;
      }
      case 'talk': {
        root.position.y = baseY + Math.sin(time * 2) * 0.05;
        if (headRef.current) {
          const talkPulse = 1 + Math.sin(time * 10) * 0.015;
          headRef.current.scale.y = 1.05 * talkPulse;
        }
        if (stacheCenterRef.current) stacheCenterRef.current.rotation.z = Math.sin(time * 7) * 0.03;
        root.rotation.y = rotationY + trackYaw;
        root.rotation.x = trackPitch;
        mouthOpen = 0.15 + Math.abs(Math.sin(time * 8)) * 0.35;
        if (stacheCenterRef.current) {
          stacheCenterRef.current.position.y = -0.35 - mouthOpen * 0.08;
        }
        break;
      }
    }

    // Apply facial rig
    const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

    // Lids
    if (lidLRef.current) lidLRef.current.scale.y = clamp(lidCloseL, 0, 1) * 0.5;
    if (lidRRef.current) lidRRef.current.scale.y = clamp(lidCloseR, 0, 1) * 0.5;

    // Pupils
    const cx = clamp(pupilX, -0.08, 0.08);
    const cy = clamp(pupilY, -0.06, 0.06);
    if (irisLRef.current) { irisLRef.current.position.x = cx; irisLRef.current.position.y = cy; }
    if (pupilLRef.current) { pupilLRef.current.position.x = cx; pupilLRef.current.position.y = cy; }
    if (irisRRef.current) { irisRRef.current.position.x = cx; irisRRef.current.position.y = cy; }
    if (pupilRRef.current) { pupilRRef.current.position.x = cx; pupilRRef.current.position.y = cy; }

    // Pupil size
    if (pupilLRef.current) { pupilLRef.current.scale.x = pupilSize; pupilLRef.current.scale.y = pupilSize; }
    if (pupilRRef.current) { pupilRRef.current.scale.x = pupilSize; pupilRRef.current.scale.y = pupilSize; }

    // Mouth
    const mo = clamp(mouthOpen, 0, 1);
    if (mouthRef.current) mouthRef.current.scale.y = mo * 0.6;
    if (lowerLipRef.current) lowerLipRef.current.position.y = -0.88 - mo * 0.25;

    // Cheeks
    if (cheekMatRef.current) {
      const cb = clamp(cheekBlush, 0, 1);
      const r = 0.92 + (0.85 - 0.92) * cb;
      const g = 0.62 + (0.15 - 0.62) * cb;
      const b = 0.35 + (0.1 - 0.35) * cb;
      cheekMatRef.current.color.setRGB(r, g, b);
      cheekMatRef.current.opacity = 0.6 + cb * 0.4;
    }
  });

  // Build mustard zigzag positions
  const mustardBalls = Array.from({ length: 10 }, (_, i) => {
    const t = i / 9;
    const y = 0.6 + t * 1.0;
    const x = Math.sin(t * Math.PI * 3) * 0.2;
    const z = -1.55 + t * 0.3;
    return [x, y, z] as [number, number, number];
  });

  // Build pleat positions
  const pleats = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    return [Math.cos(angle) * 1.05, 2.2, Math.sin(angle) * 1.05] as [number, number, number];
  });

  return (
    <group ref={rootRef} position={position} scale={[scale, scale, scale]} rotation={[0, rotationY, 0]}>
      {/* HEAD */}
      <mesh ref={headRef} scale={[1.0, 1.05, 0.95]}>
        <sphereGeometry args={[1.8, 24, 24]} />
        <meshBasicMaterial color="#eb9e59" />
      </mesh>

      {/* LEFT EYE */}
      <group position={[-0.55, 0.72, -1.35]}>
        <mesh scale={[1.0, 0.85, 0.4]}>
          <sphereGeometry args={[0.25, 12, 12]} />
          <meshBasicMaterial color="#f2f2eb" />
        </mesh>
        <mesh ref={irisLRef} position={[0, 0, -0.12]} scale={[1, 1, 0.3]}>
          <sphereGeometry args={[0.11, 10, 10]} />
          <meshBasicMaterial color="#408c4d" />
        </mesh>
        <mesh ref={pupilLRef} position={[0, 0, -0.15]} scale={[1, 1, 0.3]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
        <mesh ref={lidLRef} position={[0, 0.12, -0.02]} scale={[1.05, 0, 0.45]}>
          <sphereGeometry args={[0.27, 10, 10]} />
          <meshBasicMaterial color="#d98c4d" />
        </mesh>
      </group>

      {/* RIGHT EYE */}
      <group position={[0.55, 0.72, -1.35]}>
        <mesh scale={[1.0, 0.85, 0.4]}>
          <sphereGeometry args={[0.25, 12, 12]} />
          <meshBasicMaterial color="#f2f2eb" />
        </mesh>
        <mesh ref={irisRRef} position={[0, 0, -0.12]} scale={[1, 1, 0.3]}>
          <sphereGeometry args={[0.11, 10, 10]} />
          <meshBasicMaterial color="#408c4d" />
        </mesh>
        <mesh ref={pupilRRef} position={[0, 0, -0.15]} scale={[1, 1, 0.3]}>
          <sphereGeometry args={[0.06, 8, 8]} />
          <meshBasicMaterial color="#050505" />
        </mesh>
        <mesh ref={lidRRef} position={[0, 0.12, -0.02]} scale={[1.05, 0, 0.45]}>
          <sphereGeometry args={[0.27, 10, 10]} />
          <meshBasicMaterial color="#d98c4d" />
        </mesh>
      </group>

      {/* SUNGLASSES */}
      <mesh position={[-0.6, 0.25, -1.45]} scale={[0.95, 0.75, 0.35]}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial color="#0f0f1f" />
      </mesh>
      <mesh position={[0.6, 0.25, -1.45]} scale={[0.95, 0.75, 0.35]}>
        <sphereGeometry args={[0.55, 16, 16]} />
        <meshBasicMaterial color="#0f0f1f" />
      </mesh>
      <mesh position={[0, 0.3, -1.55]}>
        <boxGeometry args={[0.5, 0.12, 0.12]} />
        <meshBasicMaterial color="#26262e" />
      </mesh>
      <mesh position={[0, 0.62, -1.52]}>
        <boxGeometry args={[2.1, 0.15, 0.12]} />
        <meshBasicMaterial color="#26262e" />
      </mesh>
      <mesh position={[-1.0, 0.55, -1.0]}>
        <boxGeometry args={[0.1, 0.1, 1.0]} />
        <meshBasicMaterial color="#26262e" />
      </mesh>
      <mesh position={[1.0, 0.55, -1.0]}>
        <boxGeometry args={[0.1, 0.1, 1.0]} />
        <meshBasicMaterial color="#26262e" />
      </mesh>

      {/* MOUTH */}
      <mesh ref={mouthRef} position={[0, -0.85, -1.4]} scale={[1.2, 0, 0.35]}>
        <sphereGeometry args={[0.35, 12, 12]} />
        <meshBasicMaterial color="#260a05" />
      </mesh>
      <mesh position={[0, -0.7, -1.48]}>
        <boxGeometry args={[0.8, 0.06, 0.15]} />
        <meshBasicMaterial color="#bf5940" />
      </mesh>
      <mesh ref={lowerLipRef} position={[0, -0.88, -1.42]}>
        <boxGeometry args={[0.65, 0.06, 0.12]} />
        <meshBasicMaterial color="#bf5940" />
      </mesh>

      {/* CHEEKS */}
      <mesh position={[-1.1, -0.1, -1.2]} scale={[0.5, 0.4, 0.2]}>
        <sphereGeometry args={[0.4, 10, 10]} />
        <meshBasicMaterial ref={cheekMatRef} color="#eb9e59" transparent opacity={0.6} />
      </mesh>
      <mesh position={[1.1, -0.1, -1.2]} scale={[0.5, 0.4, 0.2]}>
        <sphereGeometry args={[0.4, 10, 10]} />
        <meshBasicMaterial color="#eb9e59" transparent opacity={0.6} />
      </mesh>

      {/* MUSTACHE */}
      <mesh ref={stacheCenterRef} position={[0, -0.35, -1.5]}>
        <boxGeometry args={[1.4, 0.35, 0.3]} />
        <meshBasicMaterial color="#592e0f" />
      </mesh>
      <mesh ref={curlLRef} position={[-1.05, -0.38, -1.4]} rotation={[- 0.15, Math.PI / 2, 0]} scale={[1, 1, 0.5]}>
        <torusGeometry args={[0.425, 0.11, 16, 20]} />
        <meshBasicMaterial color="#592e0f" />
      </mesh>
      <mesh position={[-1.55, -0.2, -1.35]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshBasicMaterial color="#592e0f" />
      </mesh>
      <mesh ref={curlRRef} position={[1.05, -0.38, -1.4]} rotation={[-0.15, -Math.PI / 2, 0]} scale={[1, 1, 0.5]}>
        <torusGeometry args={[0.425, 0.11, 16, 20]} />
        <meshBasicMaterial color="#592e0f" />
      </mesh>
      <mesh position={[1.55, -0.2, -1.35]}>
        <sphereGeometry args={[0.16, 10, 10]} />
        <meshBasicMaterial color="#592e0f" />
      </mesh>

      {/* CHEF HAT */}
      <mesh position={[0, 1.4, 0]}>
        <cylinderGeometry args={[1.4, 1.4, 0.3, 28]} />
        <meshBasicMaterial color="#e0e0d9" />
      </mesh>
      <mesh position={[0, 2.2, 0]}>
        <cylinderGeometry args={[0.9, 1.15, 1.3, 24]} />
        <meshBasicMaterial color="#f2f2f2" />
      </mesh>
      {pleats.map((pos, i) => (
        <mesh key={`pleat_${i}`} position={pos}>
          <boxGeometry args={[0.06, 1.2, 0.06]} />
          <meshBasicMaterial color="#e0e0d9" />
        </mesh>
      ))}
      <mesh position={[0, 2.95, 0]} scale={[1.0, 0.6, 1.0]}>
        <sphereGeometry args={[1.1, 18, 18]} />
        <meshBasicMaterial color="#f2f2f2" />
      </mesh>
      <mesh position={[0.3, 3.1, -0.2]} scale={[1.0, 0.5, 0.8]}>
        <sphereGeometry args={[0.6, 12, 12]} />
        <meshBasicMaterial color="#f2f2f2" />
      </mesh>

      {/* MUSTARD ZIGZAG */}
      {mustardBalls.map((pos, i) => (
        <mesh key={`mustard_${i}`} position={pos}>
          <sphereGeometry args={[0.1, 8, 8]} />
          <meshBasicMaterial color="#ffd10d" />
        </mesh>
      ))}
    </group>
  );
};
```

**Step 4: Run tests**

Run: `pnpm test -- --testPathPattern MrSausage3D --ci --forceExit`

Expected: 4 tests PASS.

**Step 5: Run all tests**

Run: `pnpm test -- --ci --forceExit`

Expected: 205 tests pass (201 + 4 new).

**Step 6: Commit**

```bash
git add src/components/characters/MrSausage3D.tsx src/components/characters/__tests__/MrSausage3D.test.tsx
git commit -m "feat: rewrite MrSausage3D as declarative R3F component"
```

---

### Task 4: Rewrite CrtTelevision for R3F

**Files:**
- Modify: `src/components/kitchen/CrtTelevision.tsx`

**Step 1: Rewrite CrtTelevision.tsx**

Replace `src/components/kitchen/CrtTelevision.tsx` entirely:

```tsx
import React, { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { createCrtMaterial } from '../effects/CrtShader';
import { MrSausage3D } from '../characters/MrSausage3D';
import type { Reaction } from '../characters/reactions';

const REACTION_INTENSITY: Record<Reaction, number> = {
  idle: 0.0, flinch: 0.6, laugh: 0.9, disgust: 0.5,
  excitement: 0.8, nervous: 0.3, nod: 0.2, talk: 0.4,
};

const TV = {
  housing: { width: 3.2, height: 2.6, depth: 1.6 },
  screen: { width: 2.2, height: 1.6 },
  screenZ: 0.81,
  bezel: { width: 2.5, height: 1.85, depth: 0.12 },
  bezelZ: 0.82,
  sausageScale: 0.22,
  sausageYOffset: -0.15,
};

interface CrtTelevisionProps {
  reaction?: Reaction;
  position?: [number, number, number];
}

export const CrtTelevision = ({
  reaction = 'idle',
  position = [0, 2.5, -5.5],
}: CrtTelevisionProps) => {
  const crtMat = useMemo(() => createCrtMaterial('tvCrt'), []);
  const timeRef = useRef(0);
  const reactionRef = useRef<Reaction>(reaction);
  reactionRef.current = reaction;

  const housingMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const glassMatRef = useRef<THREE.MeshStandardMaterial>(null);
  const ledMatRef = useRef<THREE.MeshBasicMaterial>(null);

  let currentReactionIntensity = 0;

  useFrame((_, delta) => {
    timeRef.current += delta;
    const t = timeRef.current;

    crtMat.uniforms.time.value = t;

    const target = REACTION_INTENSITY[reactionRef.current] ?? 0;
    const lerpSpeed = target > currentReactionIntensity ? 8.0 : 3.0;
    currentReactionIntensity += (target - currentReactionIntensity) * Math.min(lerpSpeed * delta, 1.0);
    crtMat.uniforms.reactionIntensity.value = currentReactionIntensity;

    // LED blink
    if (ledMatRef.current) {
      const brightness = 0.5 + 0.5 * Math.sin(t * 3);
      ledMatRef.current.color.setRGB(brightness, 0, 0);
    }

    // Housing glow from CRT light bleed
    if (housingMatRef.current) {
      const glowPulse = 0.02 + currentReactionIntensity * 0.04;
      const flicker = 1.0 + Math.sin(t * 4) * 0.3 * (1.0 + currentReactionIntensity);
      const g = glowPulse * flicker;
      housingMatRef.current.emissive.setRGB(g * 0.6, g, g * 0.7);
    }

    // Glass reflection pulse
    if (glassMatRef.current) {
      const glassGlow = 0.01 + currentReactionIntensity * 0.03;
      glassMatRef.current.emissive.setRGB(glassGlow * 0.5, glassGlow, glassGlow * 0.7);
    }
  });

  const [px, py, pz] = position;
  const fw = TV.bezel.width / 2 + 0.06;
  const fh = TV.bezel.height / 2 + 0.06;

  return (
    <group position={position}>
      {/* Housing */}
      <mesh>
        <boxGeometry args={[TV.housing.width, TV.housing.height, TV.housing.depth]} />
        <meshStandardMaterial ref={housingMatRef} color="#211a14" roughness={0.8} />
      </mesh>

      {/* Bezel recess */}
      <mesh position={[0, 0, TV.bezelZ - 0.04]}>
        <boxGeometry args={[TV.bezel.width + 0.15, TV.bezel.height + 0.15, 0.08]} />
        <meshBasicMaterial color="#0d0a08" />
      </mesh>

      {/* CRT Screen */}
      <mesh position={[0, 0, TV.screenZ]} material={crtMat}>
        <planeGeometry args={[TV.screen.width, TV.screen.height]} />
      </mesh>

      {/* Glass bezel */}
      <mesh position={[0, 0, TV.bezelZ + 0.02]}>
        <planeGeometry args={[TV.bezel.width, TV.bezel.height]} />
        <meshStandardMaterial ref={glassMatRef} color="#080a08" transparent opacity={0.15} roughness={0.1} metalness={0.5} />
      </mesh>

      {/* Frame bars */}
      <mesh position={[0, fh, TV.bezelZ]}><boxGeometry args={[TV.bezel.width + 0.24, 0.12, TV.bezel.depth]} /><meshBasicMaterial color="#14120f" /></mesh>
      <mesh position={[0, -fh, TV.bezelZ]}><boxGeometry args={[TV.bezel.width + 0.24, 0.12, TV.bezel.depth]} /><meshBasicMaterial color="#14120f" /></mesh>
      <mesh position={[-fw, 0, TV.bezelZ]}><boxGeometry args={[0.12, TV.bezel.height, TV.bezel.depth]} /><meshBasicMaterial color="#14120f" /></mesh>
      <mesh position={[fw, 0, TV.bezelZ]}><boxGeometry args={[0.12, TV.bezel.height, TV.bezel.depth]} /><meshBasicMaterial color="#14120f" /></mesh>

      {/* Knobs */}
      <mesh position={[TV.housing.width / 2 - 0.2, 0.3, TV.bezelZ]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.15, 12]} />
        <meshBasicMaterial color="#332e26" />
      </mesh>
      <mesh position={[TV.housing.width / 2 - 0.2, -0.15, TV.bezelZ]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.11, 0.11, 0.15, 12]} />
        <meshBasicMaterial color="#332e26" />
      </mesh>

      {/* Speaker grille slots */}
      {[0, 1, 2, 3].map(i => (
        <mesh key={`grille_${i}`} position={[-0.4, -TV.housing.height / 2 + 0.25 + i * 0.08, TV.bezelZ]}>
          <boxGeometry args={[1.0, 0.03, 0.06]} />
          <meshBasicMaterial color="#0f0d0a" />
        </mesh>
      ))}

      {/* Bracket */}
      <mesh position={[0, -1.4, -0.3]}>
        <boxGeometry args={[1.2, 0.15, 0.6]} />
        <meshBasicMaterial color="#1a1a1a" />
      </mesh>

      {/* Antennas */}
      <mesh position={[-0.5, 1.8, -pz + pz]} rotation={[0, 0, 0.35]}>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
        <meshBasicMaterial color="#999999" />
      </mesh>
      <mesh position={[0.5, 1.8, 0]} rotation={[0, 0, -0.35]}>
        <cylinderGeometry args={[0.03, 0.03, 1.2, 8]} />
        <meshBasicMaterial color="#999999" />
      </mesh>

      {/* Power LED */}
      <mesh position={[TV.housing.width / 2 - 0.2, -0.5, TV.bezelZ]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshBasicMaterial ref={ledMatRef} color="red" />
      </mesh>

      {/* Mr. Sausage inside the TV */}
      <MrSausage3D
        reaction={reaction}
        position={[0, TV.sausageYOffset, TV.screenZ + 0.05]}
        scale={TV.sausageScale}
        rotationY={Math.PI}
        trackCamera
      />
    </group>
  );
};
```

**Step 2: Run all tests**

Run: `pnpm test -- --ci --forceExit`

Expected: All tests pass. (CrtTelevision has no dedicated test file — it's tested visually and via MrSausage3D integration.)

**Step 3: Commit**

```bash
git add src/components/kitchen/CrtTelevision.tsx
git commit -m "feat: rewrite CrtTelevision for R3F with Three.js ShaderMaterial"
```

---

### Task 5: Rewrite KitchenEnvironment for R3F

**Files:**
- Modify: `src/components/kitchen/KitchenEnvironment.tsx`

This is a large file (465 lines): procedural room enclosure (floor, ceiling, 4 walls with PBR textures), grime decals, GLB loading, lighting with fluorescent flicker.

**Step 1: Rewrite KitchenEnvironment.tsx**

Replace entirely. The R3F version uses:
- `useGLTF` from drei for kitchen.glb loading
- `useTexture` from drei for PBR texture sets
- `useFrame` for flicker animation
- Declarative `<mesh>`, `<pointLight>`, `<hemisphereLight>` JSX
- `<Environment>` from drei or manual environment map

```tsx
import React, { useRef, useMemo, useEffect } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF, useTexture } from '@react-three/drei';
import * as THREE from 'three';

const ROOM_W = 13;
const ROOM_D = 13;
const ROOM_H = 5.5;
const TILE_LINE = 2.4;

function getAssetPath(subdir: string, file: string): string {
  if (typeof document !== 'undefined') {
    const base = document.querySelector('base');
    if (base?.href) {
      const url = new URL(base.href);
      return `${url.pathname.replace(/\/$/, '')}/${subdir}/${file}`;
    }
  }
  return `/${subdir}/${file}`;
}

/** A single grime decal — transparent plane offset from wall */
function GrimeDecal({
  colorFile, opacityFile, normalFile, roughnessFile,
  width, height, position, rotationY,
}: {
  colorFile: string; opacityFile: string; normalFile: string; roughnessFile: string;
  width: number; height: number; position: [number, number, number]; rotationY: number;
}) {
  const texRoot = 'textures';
  const colorTex = useTexture(getAssetPath(texRoot, colorFile));
  const opacityTex = useTexture(getAssetPath(texRoot, opacityFile));
  const normalTex = useTexture(getAssetPath(texRoot, normalFile));
  const roughnessTex = useTexture(getAssetPath(texRoot, roughnessFile));

  return (
    <mesh position={position} rotation={[0, rotationY, 0]} renderOrder={10}>
      <planeGeometry args={[width, height]} />
      <meshStandardMaterial
        map={colorTex}
        alphaMap={opacityTex}
        normalMap={normalTex}
        roughnessMap={roughnessTex}
        transparent
        color="#73613f"
        envMapIntensity={0.5}
        metalness={0}
        roughness={1}
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}

/** Procedural room: floor, ceiling, 4 walls with tiled PBR textures */
function RoomEnclosure() {
  const texRoot = 'textures';

  // Floor textures
  const floorTextures = useTexture({
    map: getAssetPath(texRoot, 'tile_floor_color.jpg'),
    normalMap: getAssetPath(texRoot, 'tile_floor_normal.jpg'),
    roughnessMap: getAssetPath(texRoot, 'tile_floor_roughness.jpg'),
  });

  // Ceiling textures
  const ceilingTextures = useTexture({
    map: getAssetPath(texRoot, 'concrete_color.jpg'),
    normalMap: getAssetPath(texRoot, 'concrete_normal.jpg'),
    roughnessMap: getAssetPath(texRoot, 'concrete_roughness.jpg'),
  });

  // Wall tile textures
  const wallTileTextures = useTexture({
    map: getAssetPath(texRoot, 'tile_wall_color.jpg'),
    normalMap: getAssetPath(texRoot, 'tile_wall_normal.jpg'),
    roughnessMap: getAssetPath(texRoot, 'tile_wall_roughness.jpg'),
    aoMap: getAssetPath(texRoot, 'tile_wall_ao.jpg'),
  });

  // Wall concrete textures
  const wallConcreteTextures = useTexture({
    map: getAssetPath(texRoot, 'concrete_color.jpg'),
    normalMap: getAssetPath(texRoot, 'concrete_normal.jpg'),
    roughnessMap: getAssetPath(texRoot, 'concrete_roughness.jpg'),
  });

  // Apply tiling to all textures
  useMemo(() => {
    const setRepeat = (tex: THREE.Texture, u: number, v: number) => {
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.repeat.set(u, v);
    };
    Object.values(floorTextures).forEach(t => setRepeat(t as THREE.Texture, 4, 4));
    Object.values(ceilingTextures).forEach(t => setRepeat(t as THREE.Texture, 3, 3));
    Object.values(wallTileTextures).forEach(t => setRepeat(t as THREE.Texture, 4, 2));
    Object.values(wallConcreteTextures).forEach(t => setRepeat(t as THREE.Texture, 2, 1.5));
  }, [floorTextures, ceilingTextures, wallTileTextures, wallConcreteTextures]);

  const wallConfigs = [
    { pos: [0, 0, -ROOM_D / 2] as [number, number, number], rotY: 0, w: ROOM_W },
    { pos: [0, 0, ROOM_D / 2] as [number, number, number], rotY: Math.PI, w: ROOM_W },
    { pos: [-ROOM_W / 2, 0, 0] as [number, number, number], rotY: Math.PI / 2, w: ROOM_D },
    { pos: [ROOM_W / 2, 0, 0] as [number, number, number], rotY: -Math.PI / 2, w: ROOM_D },
  ];

  return (
    <>
      {/* Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial
          {...floorTextures}
          color="#8c877f"
          envMapIntensity={0.1}
          metalness={0}
          roughness={1}
        />
      </mesh>

      {/* Ceiling */}
      <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, ROOM_H, 0]}>
        <planeGeometry args={[ROOM_W, ROOM_D]} />
        <meshStandardMaterial
          {...ceilingTextures}
          color="#807a73"
          envMapIntensity={0.3}
          metalness={0}
          roughness={1}
        />
      </mesh>

      {/* Walls — lower tile + upper concrete */}
      {wallConfigs.map((cfg, i) => (
        <group key={`wall_${i}`}>
          <mesh
            position={[cfg.pos[0], TILE_LINE / 2, cfg.pos[2]]}
            rotation={[0, cfg.rotY, 0]}
          >
            <planeGeometry args={[cfg.w, TILE_LINE]} />
            <meshStandardMaterial
              {...wallTileTextures}
              color="#999485"
              side={THREE.DoubleSide}
              envMapIntensity={0.3}
              metalness={0}
              roughness={1}
            />
          </mesh>
          <mesh
            position={[cfg.pos[0], TILE_LINE + (ROOM_H - TILE_LINE) / 2, cfg.pos[2]]}
            rotation={[0, cfg.rotY, 0]}
          >
            <planeGeometry args={[cfg.w, ROOM_H - TILE_LINE]} />
            <meshStandardMaterial
              {...wallConcreteTextures}
              color="#8c857a"
              side={THREE.DoubleSide}
              envMapIntensity={0.3}
              metalness={0}
              roughness={1}
            />
          </mesh>
        </group>
      ))}
    </>
  );
}

/** Kitchen GLB model with per-material overrides */
function KitchenModel() {
  const { scene } = useGLTF(getAssetPath('models', 'kitchen.glb'));

  useEffect(() => {
    const overrides: Record<string, { albedo: [number, number, number]; directI: number; killEmissive?: boolean }> = {
      blancblanc:    { albedo: [0.28, 0.27, 0.24], directI: 0.3 },
      blanccarreaux: { albedo: [0.30, 0.28, 0.24], directI: 0.4 },
      blancemission: { albedo: [0.25, 0.24, 0.20], directI: 0.25, killEmissive: true },
    };

    scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
        const mat = child.material;
        mat.envMapIntensity = 0.05;

        const override = overrides[mat.name];
        if (override) {
          mat.color.setRGB(...override.albedo);
          if (override.killEmissive) {
            mat.emissive.setRGB(0, 0, 0);
            mat.emissiveIntensity = 0;
          }
        }
      }
    });

    // Signal e2e tests
    if (typeof window !== 'undefined' && (window as any).__gov) {
      (window as any).__gov.sceneReady = true;
    }
  }, [scene]);

  return <primitive object={scene} />;
}

/** Fluorescent tube fixture with light */
function FluorescentTube({ position, lightRef }: {
  position: [number, number, number];
  lightRef: React.RefObject<THREE.PointLight | null>;
}) {
  return (
    <group position={position}>
      {/* Tube (emissive box) */}
      <mesh>
        <boxGeometry args={[0.12, 0.06, 2.5]} />
        <meshBasicMaterial color="#f2fff0" />
      </mesh>
      {/* Housing */}
      <mesh position={[0, 0.06, 0]}>
        <boxGeometry args={[0.3, 0.08, 2.7]} />
        <meshStandardMaterial color="#808080" roughness={0.8} />
      </mesh>
      {/* Light */}
      <pointLight
        ref={lightRef}
        position={[0, -0.05, 0]}
        color="#f2fff0"
        intensity={2.0}
        distance={12}
      />
    </group>
  );
}

export const KitchenEnvironment = () => {
  const tube0Ref = useRef<THREE.PointLight>(null);
  const tube1Ref = useRef<THREE.PointLight>(null);
  const tube2Ref = useRef<THREE.PointLight>(null);

  // Flicker state
  const flickerTimeRef = useRef(0);
  const nextFlickerRef = useRef(2 + Math.random() * 3);
  const flickeringTubeRef = useRef(-1);
  const flickerEndRef = useRef(0);

  useFrame((_, delta) => {
    flickerTimeRef.current += delta;
    const t = flickerTimeRef.current;
    const tubes = [tube0Ref.current, tube1Ref.current, tube2Ref.current];

    if (t > nextFlickerRef.current && flickeringTubeRef.current === -1) {
      flickeringTubeRef.current = Math.floor(Math.random() * 3);
      flickerEndRef.current = t + 0.1 + Math.random() * 0.3;
      nextFlickerRef.current = t + 3 + Math.random() * 8;
    }

    for (let i = 0; i < tubes.length; i++) {
      if (!tubes[i]) continue;
      if (i === flickeringTubeRef.current && t < flickerEndRef.current) {
        tubes[i]!.intensity = Math.sin(t * 60) > 0 ? 0.4 : 2.0;
      } else {
        tubes[i]!.intensity = 2.0;
      }
    }

    if (flickeringTubeRef.current !== -1 && t >= flickerEndRef.current) {
      flickeringTubeRef.current = -1;
    }
  });

  return (
    <>
      <RoomEnclosure />

      {/* Grime decals — drips */}
      <GrimeDecal colorFile="grime_drip_color.jpg" opacityFile="grime_drip_opacity.jpg" normalFile="grime_drip_normal.jpg" roughnessFile="grime_drip_roughness.jpg" width={6} height={4} position={[-2, 3.5, -ROOM_D / 2 + 0.02]} rotationY={0} />
      <GrimeDecal colorFile="grime_drip_color.jpg" opacityFile="grime_drip_opacity.jpg" normalFile="grime_drip_normal.jpg" roughnessFile="grime_drip_roughness.jpg" width={5} height={3.5} position={[-ROOM_W / 2 + 0.02, 3.2, -2]} rotationY={Math.PI / 2} />
      <GrimeDecal colorFile="grime_drip_color.jpg" opacityFile="grime_drip_opacity.jpg" normalFile="grime_drip_normal.jpg" roughnessFile="grime_drip_roughness.jpg" width={7} height={3} position={[2, 3.8, ROOM_D / 2 - 0.02]} rotationY={Math.PI} />
      <GrimeDecal colorFile="grime_drip_color.jpg" opacityFile="grime_drip_opacity.jpg" normalFile="grime_drip_normal.jpg" roughnessFile="grime_drip_roughness.jpg" width={5} height={3} position={[ROOM_W / 2 - 0.02, 3.0, 1]} rotationY={-Math.PI / 2} />

      {/* Grime decals — baseboard */}
      <GrimeDecal colorFile="grime_base_color.jpg" opacityFile="grime_base_opacity.jpg" normalFile="grime_base_normal.jpg" roughnessFile="grime_base_roughness.jpg" width={ROOM_W} height={1.2} position={[0, 0.6, -ROOM_D / 2 + 0.03]} rotationY={0} />
      <GrimeDecal colorFile="grime_base_color.jpg" opacityFile="grime_base_opacity.jpg" normalFile="grime_base_normal.jpg" roughnessFile="grime_base_roughness.jpg" width={ROOM_D} height={1.0} position={[-ROOM_W / 2 + 0.03, 0.5, 0]} rotationY={Math.PI / 2} />
      <GrimeDecal colorFile="grime_base_color.jpg" opacityFile="grime_base_opacity.jpg" normalFile="grime_base_normal.jpg" roughnessFile="grime_base_roughness.jpg" width={ROOM_W} height={1.1} position={[0, 0.55, ROOM_D / 2 - 0.03]} rotationY={Math.PI} />
      <GrimeDecal colorFile="grime_base_color.jpg" opacityFile="grime_base_opacity.jpg" normalFile="grime_base_normal.jpg" roughnessFile="grime_base_roughness.jpg" width={ROOM_D} height={0.9} position={[ROOM_W / 2 - 0.03, 0.45, 0]} rotationY={-Math.PI / 2} />

      <KitchenModel />

      {/* Lighting */}
      <hemisphereLight color="#d9e6d1" groundColor="#4d473d" intensity={0.6} />
      <pointLight position={[0, 2.0, 0]} color="#d9e0cc" intensity={0.8} distance={14} />

      {/* Fluorescent tubes */}
      <FluorescentTube position={[-2.5, 4.2, 1.5]} lightRef={tube0Ref} />
      <FluorescentTube position={[1.5, 4.2, -1.0]} lightRef={tube1Ref} />
      <FluorescentTube position={[-2.5, 4.2, -3.0]} lightRef={tube2Ref} />
    </>
  );
};
```

**Step 2: Run all tests**

Run: `pnpm test -- --ci --forceExit`

Expected: All tests pass.

**Step 3: Commit**

```bash
git add src/components/kitchen/KitchenEnvironment.tsx
git commit -m "feat: rewrite KitchenEnvironment for R3F with useGLTF + declarative lighting"
```

---

### Task 6: Rewrite FridgeStation for R3F

**Files:**
- Modify: `src/components/kitchen/FridgeStation.tsx`

Key change: Babylon `ActionManager` → R3F `onClick` prop on `<mesh>`.

**Step 1: Rewrite FridgeStation.tsx**

Replace entirely. The R3F version uses `onClick` on each ingredient mesh and `useFrame` for selection/hint animations. Convert all `MeshBuilder.Create*` to declarative JSX. The `hexToColor3` helper becomes unnecessary — R3F accepts hex strings directly.

Pattern for each ingredient mesh:
```tsx
<mesh
  key={i}
  position={[x, y, z]}
  onClick={() => !selectedIds.has(i) && onSelect(i)}
>
  <sphereGeometry args={[radius, segments, segments]} />
  <meshBasicMaterial ref={matRef} color={ingredient.color} />
</mesh>
```

The full component follows the same structure as the Babylon version but with declarative JSX for all static geometry (fridge body, door, shelves, interior light) and `useFrame` for the selection slide-forward + hint glow animations.

Use refs for animated ingredient materials to update color/opacity in `useFrame`.

**Step 2: Run tests, commit**

```bash
git add src/components/kitchen/FridgeStation.tsx
git commit -m "feat: rewrite FridgeStation for R3F with onClick picking"
```

---

### Task 7: Rewrite GrinderStation for R3F

**Files:**
- Modify: `src/components/kitchen/GrinderStation.tsx`

Same pattern: convert all `MeshBuilder.Create*` → JSX, `scene.onBeforeRenderObservable` → `useFrame`. Use refs for animated parts (crank arm, knob, meat chunks, output particles, splatter particles).

Key animations to preserve:
- Crank arm rotation around grinder body (position + rotation from `crankAngle`)
- Meat chunks shrink as progress increases
- Output particles appear proportional to progress
- Splatter burst on strike (particles with gravity)
- Grinder body vibration during grinding

**Step 1: Rewrite, Step 2: Test, Step 3: Commit**

```bash
git add src/components/kitchen/GrinderStation.tsx
git commit -m "feat: rewrite GrinderStation for R3F with useFrame animations"
```

---

### Task 8: Rewrite StufferStation for R3F

**Files:**
- Modify: `src/components/kitchen/StufferStation.tsx`

Same pattern. Key animations:
- Plunger descends as fill increases
- Casing inflates (scale) based on fill level
- Casing color shifts green→yellow→red based on pressure (use `useFrame` to update material color)
- High-pressure pulsing
- Burst particles with gravity

The `pressureToColor` and `lerpColor` helper functions stay identical (pure math, engine-agnostic). Just change `Color3` → `THREE.Color`.

**Step 1: Rewrite, Step 2: Test, Step 3: Commit**

```bash
git add src/components/kitchen/StufferStation.tsx
git commit -m "feat: rewrite StufferStation for R3F with pressure animations"
```

---

### Task 9: Rewrite StoveStation for R3F

**Files:**
- Modify: `src/components/kitchen/StoveStation.tsx`

Same pattern. Key animations:
- Burner color (dark red → bright orange) based on heat level
- Sausage color (pink → brown → black) based on temperature
- Thermometer fill height + color (blue → green → red)
- Sizzle particles (spawn + gravity + fade)
- Smoke particles (spawn + rise + expand + fade)
- Sausage wobble when hot

The `sausageColor` function stays identical — change `Color3.Lerp` → `new THREE.Color().lerpColors()`.

**Step 1: Rewrite, Step 2: Test, Step 3: Commit**

```bash
git add src/components/kitchen/StoveStation.tsx
git commit -m "feat: rewrite StoveStation for R3F with sizzle/smoke particles"
```

---

### Task 10: Rewrite Ingredient3D for R3F

**Files:**
- Modify: `src/components/ingredients/Ingredient3D.tsx`

Convert shape-based mesh creation to a switch over `shape.base` returning JSX geometry:

```tsx
function ShapeGeometry({ shape }: { shape: IngredientShape }) {
  switch (shape.base) {
    case 'sphere': return <sphereGeometry args={[0.5, 12, 12]} />;
    case 'box': return <boxGeometry args={[0.9, 0.9, 0.9]} />;
    case 'cylinder': return <cylinderGeometry args={[0.4, 0.4, shape.detail === 'flat' ? 0.3 : 1, 12]} />;
    // ... etc
  }
}
```

**Step 1: Rewrite, Step 2: Test, Step 3: Commit**

```bash
git add src/components/ingredients/Ingredient3D.tsx
git commit -m "feat: rewrite Ingredient3D for R3F with shape-based geometry"
```

---

### Task 11: Create Unified GameWorld.tsx with R3F Canvas

**Files:**
- Modify: `src/components/GameWorld.web.tsx` → rewrite as `src/components/GameWorld.tsx`
- Delete: `src/components/GameWorld.native.tsx`
- Delete: `src/components/GameWorld.tsx` (the old stub that re-exports GameWorld.web)

**Step 1: Create unified GameWorld.tsx**

Delete `GameWorld.web.tsx`, `GameWorld.native.tsx`, and the stub `GameWorld.tsx`. Create a single new `GameWorld.tsx`:

```tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber/native';
import * as THREE from 'three';
import { useGameStore } from '../store/gameStore';
import { KitchenEnvironment } from './kitchen/KitchenEnvironment';
import { CrtTelevision } from './kitchen/CrtTelevision';
import { FridgeStation } from './kitchen/FridgeStation';
import { GrinderStation } from './kitchen/GrinderStation';
import { StufferStation } from './kitchen/StufferStation';
import { StoveStation } from './kitchen/StoveStation';
import { getRandomIngredientPool } from '../engine/Ingredients';
import { matchesCriteria } from '../engine/IngredientMatcher';
import { pickVariant } from '../engine/ChallengeRegistry';
import type { IngredientVariant } from '../data/challenges/variants';

const MENU_CAMERA = {
  position: new THREE.Vector3(0, 1.6, 2),
  lookAt: new THREE.Vector3(-2, 1.6, -2),
};

const STATION_CAMERAS = [
  { position: new THREE.Vector3(0, 1.6, 0), lookAt: new THREE.Vector3(-3, 1.4, -3) },
  { position: new THREE.Vector3(-1, 1.6, 0), lookAt: new THREE.Vector3(-4, 1.4, 0) },
  { position: new THREE.Vector3(0, 1.6, 1), lookAt: new THREE.Vector3(3, 1.2, 2) },
  { position: new THREE.Vector3(0, 1.6, 0), lookAt: new THREE.Vector3(2.5, 2.0, 1.5) },
  { position: new THREE.Vector3(-1, 1.6, -1), lookAt: new THREE.Vector3(0, 2.5, -5.5) },
];

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

/** Smoothly walks the camera between station waypoints */
function CameraWalker() {
  const { camera } = useThree();
  const { gameStatus, currentChallenge } = useGameStore();

  const progressRef = useRef(1); // Start at 1 = no animation
  const startPosRef = useRef(MENU_CAMERA.position.clone());
  const startLookRef = useRef(MENU_CAMERA.lookAt.clone());
  const targetPosRef = useRef(MENU_CAMERA.position.clone());
  const targetLookRef = useRef(MENU_CAMERA.lookAt.clone());

  // Track challenge changes to trigger walks
  const prevChallengeRef = useRef(-1);

  useEffect(() => {
    if (gameStatus !== 'playing') return;
    const target = STATION_CAMERAS[currentChallenge];
    if (!target) return;
    if (currentChallenge === prevChallengeRef.current) return;

    prevChallengeRef.current = currentChallenge;

    // Skip if already close
    if (camera.position.distanceTo(target.position) < 0.1) return;

    startPosRef.current.copy(camera.position);
    // Extract current look direction
    const lookDir = new THREE.Vector3();
    camera.getWorldDirection(lookDir);
    startLookRef.current.copy(camera.position).add(lookDir.multiplyScalar(5));

    targetPosRef.current.copy(target.position);
    targetLookRef.current.copy(target.lookAt);
    progressRef.current = 0;
  }, [camera, currentChallenge, gameStatus]);

  useFrame((_, delta) => {
    if (progressRef.current >= 1) return;
    progressRef.current = Math.min(progressRef.current + delta * 0.4, 1);
    const t = easeInOutQuad(progressRef.current);

    camera.position.lerpVectors(startPosRef.current, targetPosRef.current, t);
    const lookTarget = new THREE.Vector3().lerpVectors(startLookRef.current, targetLookRef.current, t);
    camera.lookAt(lookTarget);
  });

  return null;
}

/** The 3D scene graph — all kitchen components rendered inside R3F Canvas */
function SceneContents() {
  const { gameStatus, currentChallenge, variantSeed, challengeProgress, challengePressure, challengeIsPressing, challengeTemperature, challengeHeatLevel, strikes } = useGameStore();

  const [fridgeSelectedIds, setFridgeSelectedIds] = useState<Set<number>>(new Set());
  const [fridgeHintActive] = useState(false);

  const showFridge = gameStatus === 'playing' && currentChallenge === 0;
  const showGrinder = gameStatus === 'playing' && currentChallenge === 1;
  const showStuffer = gameStatus === 'playing' && currentChallenge === 2;
  const showStove = gameStatus === 'playing' && currentChallenge === 3;
  const showTasting = gameStatus === 'playing' && currentChallenge === 4;

  // Grinder animation state
  const grinderCrankAngle = useRef(0);
  const prevStrikesRef = useRef(strikes);

  useFrame(() => {
    if (showGrinder) {
      grinderCrankAngle.current = (challengeProgress / 100) * Math.PI * 8;
    }
  });

  const [grinderSplattering, setGrinderSplattering] = useState(false);
  useEffect(() => {
    if (showGrinder && strikes > prevStrikesRef.current) {
      setGrinderSplattering(true);
      const timeout = setTimeout(() => setGrinderSplattering(false), 800);
      prevStrikesRef.current = strikes;
      return () => clearTimeout(timeout);
    }
    prevStrikesRef.current = strikes;
  }, [showGrinder, strikes]);

  const [stufferBurst, setStufferBurst] = useState(false);
  const prevStufferStrikesRef = useRef(strikes);
  useEffect(() => {
    if (showStuffer && strikes > prevStufferStrikesRef.current) {
      setStufferBurst(true);
      const timeout = setTimeout(() => setStufferBurst(false), 1000);
      prevStufferStrikesRef.current = strikes;
      return () => clearTimeout(timeout);
    }
    prevStufferStrikesRef.current = strikes;
  }, [showStuffer, strikes]);

  const fridgeData = useMemo(() => {
    if (!showFridge) return null;
    const pool = getRandomIngredientPool(10);
    const v = pickVariant('ingredients', variantSeed) as IngredientVariant | null;
    const matching = new Set<number>();
    if (v) {
      pool.forEach((ing, i) => {
        if (matchesCriteria(ing, v.criteria)) matching.add(i);
      });
    }
    return { pool, matching };
  }, [showFridge, variantSeed]);

  return (
    <>
      <CameraWalker />
      <KitchenEnvironment />
      <CrtTelevision reaction={gameStatus === 'defeat' ? 'laugh' : showTasting ? 'talk' : 'idle'} />
      {showFridge && fridgeData && (
        <FridgeStation
          ingredients={fridgeData.pool}
          selectedIds={fridgeSelectedIds}
          hintActive={fridgeHintActive}
          matchingIndices={fridgeData.matching}
          onSelect={(index) => {
            setFridgeSelectedIds((prev) => {
              const next = new Set(prev);
              next.add(index);
              return next;
            });
          }}
        />
      )}
      {showGrinder && (
        <GrinderStation
          grindProgress={challengeProgress}
          crankAngle={grinderCrankAngle.current}
          isSplattering={grinderSplattering}
        />
      )}
      {showStuffer && (
        <StufferStation
          fillLevel={challengeProgress}
          pressureLevel={challengePressure}
          isPressing={challengeIsPressing}
          hasBurst={stufferBurst}
        />
      )}
      {showStove && (
        <StoveStation
          temperature={challengeTemperature}
          heatLevel={challengeHeatLevel}
          holdProgress={challengeProgress}
        />
      )}
    </>
  );
}

export const GameWorld = () => {
  return (
    <Canvas
      camera={{
        fov: 70,
        near: 0.1,
        far: 100,
        position: [MENU_CAMERA.position.x, MENU_CAMERA.position.y, MENU_CAMERA.position.z],
      }}
      gl={{ preserveDrawingBuffer: true, antialias: true }}
      style={{ width: '100%', height: '100%' }}
    >
      <color attach="background" args={['#050505']} />
      <SceneContents />
    </Canvas>
  );
};
```

**Step 2: Delete old platform-split files**

```bash
rm src/components/GameWorld.web.tsx
rm src/components/GameWorld.native.tsx
```

The stub `GameWorld.tsx` is replaced by the new file above (same path).

**Step 3: Run tests**

Run: `pnpm test -- --ci --forceExit`

Expected: All tests pass (no tests import GameWorld directly).

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: unified GameWorld.tsx with R3F Canvas — eliminates platform split"
```

---

### Task 12: Remove Babylon Dependencies and Clean Up

**Files:**
- Modify: `package.json`
- Modify: `babel.config.js` (already done in Task 1, verify)

**Step 1: Uninstall Babylon packages**

Run:
```bash
pnpm remove reactylon @babylonjs/core @babylonjs/gui @babylonjs/loaders @babylonjs/havok babel-plugin-reactylon
```

**Step 2: Verify no Babylon imports remain**

Run:
```bash
grep -r "from 'reactylon'" src/ || echo "No reactylon imports"
grep -r "from '@babylonjs" src/ || echo "No babylonjs imports"
```

Expected: Both echo "No ... imports"

**Step 3: Run all tests**

Run: `pnpm test -- --ci --forceExit`

Expected: All tests pass.

**Step 4: Type check**

Run: `npx tsc --noEmit`

Expected: No new type errors (ignore existing Jest type warnings in test files).

**Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: remove Babylon.js + reactylon dependencies"
```

---

### Task 13: Visual Integration Verification

**Files:** None (verification only)

**Step 1: Start dev server**

Run: `npx expo start --web`

**Step 2: Visual checks**

Open the app in browser and verify:
1. Menu screen renders (butcher shop sign)
2. Click "NEW GAME" → loading screen appears
3. Loading completes → kitchen scene renders:
   - Floor, walls, ceiling with PBR textures visible
   - Kitchen GLB model loads and displays
   - Fluorescent tubes with occasional flicker
   - CRT TV on back wall with Mr. Sausage inside
   - Mr. Sausage has idle animation (bobbing, blinking)
4. Fridge station: ingredients visible, clickable
5. Camera auto-walks between stations as challenges progress
6. Grinder station: crank animates, meat chunks shrink
7. Stuffer station: casing inflates, pressure colors change
8. Stove station: burner glows, sausage color changes, sizzle particles

**Step 3: Run full test suite one final time**

Run: `pnpm test -- --ci --forceExit`

Expected: All tests pass.

**Step 4: Commit any final adjustments**

```bash
git add -A
git commit -m "fix: visual integration adjustments after R3F migration"
```

---

## Summary

| Task | What | Test Impact |
|------|------|-------------|
| 1 | Install deps + configs | 0 new tests, all 199 pass |
| 2 | CRT shader migration | +2 tests |
| 3 | MrSausage3D rewrite | +4 tests |
| 4 | CrtTelevision rewrite | 0 new tests |
| 5 | KitchenEnvironment rewrite | 0 new tests |
| 6 | FridgeStation rewrite | 0 new tests |
| 7 | GrinderStation rewrite | 0 new tests |
| 8 | StufferStation rewrite | 0 new tests |
| 9 | StoveStation rewrite | 0 new tests |
| 10 | Ingredient3D rewrite | 0 new tests |
| 11 | Unified GameWorld.tsx | 0 new tests |
| 12 | Remove Babylon deps | 0 new tests |
| 13 | Visual verification | 0 new tests |

Total: 13 tasks, ~205 tests at end.
