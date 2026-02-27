# Camera Rail & Fluorescent Lighting Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace manual waypoint navigation with an automatic camera rail that walks between stations on challenge completion, and replace dim lighting with harsh overhead fluorescent tubes.

**Architecture:** Remove the WaypointGraph/WaypointNavigator/navigationStore system entirely. Add a `STATION_CAMERAS` array in GameWorld.web.tsx defining 5 camera positions (one per challenge). On `completeChallenge`, smoothly dolly the camera to the next station over ~2.5 seconds. Rewrite KitchenEnvironment to use 3 fluorescent tube meshes with harsh white SpotLights and random flicker. Fix the CRT shader to be purely procedural (no textureSampler).

**Tech Stack:** React Native, Babylon.js 8.53, reactylon 3.5, Zustand, Expo 55

---

### Task 1: Delete Waypoint Navigation System

**Files:**
- Delete: `src/engine/WaypointGraph.ts`
- Delete: `src/store/navigationStore.ts`
- Delete: `src/components/navigation/WaypointNavigator.tsx`
- Delete: `src/components/navigation/NavigationArrow.tsx`
- Delete: `__tests__/WaypointGraph.test.ts`
- Modify: `App.tsx:5,11,21,47-57` — remove navigation imports and WaypointNavigator usage
- Modify: `src/components/challenges/TastingChallenge.tsx:4,40,77-79` — remove navigationStore import and navigateTo('center') call
- Modify: `src/engine/ChallengeRegistry.ts:1,33` — replace WaypointId type with plain string

**Step 1: Delete the 5 files**

```bash
rm src/engine/WaypointGraph.ts
rm src/store/navigationStore.ts
rm src/components/navigation/WaypointNavigator.tsx
rm src/components/navigation/NavigationArrow.tsx
rm __tests__/WaypointGraph.test.ts
```

**Step 2: Update App.tsx**

Remove imports for `useNavigationStore` (line 5) and `WaypointNavigator` (line 11). Remove the `currentWaypoint` and `navigateTo` destructure from GameUI (line 21). Remove the entire `<WaypointNavigator>` block (lines 54-57).

Final `GameUI` should look like:

```tsx
const GameUI = () => {
	const { gameStatus, currentChallenge, completeChallenge } = useGameStore();
	const [mrSausageReaction, setMrSausageReaction] = useState<Reaction>("idle");

	const handleIngredientReaction = useCallback((reaction: Reaction) => {
		setMrSausageReaction(reaction);
	}, []);

	const isIngredientChallenge = gameStatus === "playing" && currentChallenge === 0;
	const isGrindingChallenge = gameStatus === "playing" && currentChallenge === 1;
	const isStuffingChallenge = gameStatus === "playing" && currentChallenge === 2;
	const isCookingChallenge = gameStatus === "playing" && currentChallenge === 3;
	const isTastingChallenge = gameStatus === "playing" && currentChallenge === 4;

	return (
		<View style={styles.overlay} pointerEvents="box-none">
			{gameStatus === "menu" && <TitleScreen />}

			{gameStatus === "playing" && (
				<>
					<ChallengeHeader />
					<StrikeCounter />
					{!isIngredientChallenge && !isGrindingChallenge && !isStuffingChallenge && !isCookingChallenge && !isTastingChallenge && (
						<HintButton onHint={() => {}} />
					)}
					{/* Challenge overlays — same as before, no WaypointNavigator */}
					{isIngredientChallenge && (
						<IngredientChallenge onComplete={completeChallenge} onReaction={handleIngredientReaction} />
					)}
					{isGrindingChallenge && (
						<GrindingChallenge onComplete={completeChallenge} onReaction={handleIngredientReaction} />
					)}
					{isStuffingChallenge && (
						<StuffingChallenge onComplete={completeChallenge} onReaction={handleIngredientReaction} />
					)}
					{isCookingChallenge && (
						<CookingChallenge onComplete={completeChallenge} onReaction={handleIngredientReaction} />
					)}
					{isTastingChallenge && (
						<TastingChallenge onComplete={completeChallenge} onReaction={handleIngredientReaction} />
					)}
				</>
			)}

			{(gameStatus === "victory" || gameStatus === "defeat") && <GameOverScreen />}
		</View>
	);
};
```

**Step 3: Update ChallengeRegistry.ts**

Replace `import type { WaypointId } from "./WaypointGraph";` with nothing. Change `station: WaypointId` to `station: string` in the `ChallengeConfig` interface. The station string values ("fridge", "grinder", etc.) remain unchanged — they're just plain strings now.

```typescript
// Remove line 1 entirely (the import)
// Change line 33:
export interface ChallengeConfig {
	id: ChallengeId;
	name: string;
	station: string;
	cameraOffset: [number, number, number];
	description: string;
}
```

**Step 4: Update TastingChallenge.tsx**

Remove the `import { useNavigationStore }` line 4. Remove the `const { navigateTo } = useNavigationStore();` (line 40). Remove the `navigateTo('center')` call (lines 77-79) — the camera rail handles this automatically now.

**Step 5: Run tests to verify**

```bash
npm test -- --ci --forceExit
```

Expected: Tests pass. The WaypointGraph tests are gone (deleted). All other tests should be unaffected since they don't import navigation code.

**Step 6: Commit**

```bash
git add -A
git commit -m "refactor: remove waypoint navigation system

Replace with camera rail (next task). Delete WaypointGraph, navigationStore,
WaypointNavigator, NavigationArrow, and all references."
```

---

### Task 2: Add Camera Rail System to GameWorld.web.tsx

**Files:**
- Modify: `src/components/GameWorld.web.tsx` — replace all waypoint/navigation logic with station camera array and auto-walk

**Context:** `GameWorld.web.tsx` currently imports `useNavigationStore`, `getWaypoint`, `WaypointId` and has a `navigateToWaypoint` callback that interpolates camera position. We're replacing all of that with a simpler system: a `STATION_CAMERAS` array indexed by challenge number (0-4), and an effect that auto-walks the camera when `currentChallenge` changes.

**Step 1: Define STATION_CAMERAS array**

Add this near the top of the file (after imports):

```typescript
/** Camera positions for each challenge station, in order along the basement. */
const STATION_CAMERAS: { position: [number, number, number]; lookAt: [number, number, number] }[] = [
  // 0: Fridge (left side of room)
  { position: [-4, 1.6, -2], lookAt: [-5, 1.2, -4] },
  // 1: Grinder (center-left)
  { position: [-1.5, 1.6, -3], lookAt: [-1.5, 1.0, -5] },
  // 2: Stuffer (center-right)
  { position: [1.5, 1.6, -2], lookAt: [2.5, 1.0, -4] },
  // 3: Stove (right side)
  { position: [4, 1.6, -3], lookAt: [4, 0.8, -5.5] },
  // 4: Tasting (back to center, facing CRT TV on back wall)
  { position: [0, 1.6, -3], lookAt: [0, 2.5, -6.8] },
];
```

**Step 2: Replace the entire GameWorld component**

Remove all imports of `useNavigationStore`, `getWaypoint`, `WaypointId`. Remove the `navigateToWaypoint` callback, the `navWaypoint` state, the `camObserverRef`, the `setNavigateTo` effect, and the cleanup effect.

Replace with:

```typescript
import * as CANNON from 'cannon-es';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Scene } from 'reactylon';
import { Engine } from 'reactylon/web';
import {
  CannonJSPlugin,
  type Camera,
  Color3,
  Color4,
  FreeCamera,
  HemisphericLight,
  type Observer,
  type Scene as BabylonScene,
  Vector3,
} from '@babylonjs/core';
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

(globalThis as any).CANNON = CANNON;

// ... STATION_CAMERAS defined above ...

export const GameWorld = () => {
  const { gameStatus, currentChallenge, variantSeed, challengeProgress, challengePressure, challengeIsPressing, challengeTemperature, challengeHeatLevel, strikes } = useGameStore();
  const [camera, setCamera] = useState<Camera>();
  const walkObserverRef = useRef<Observer<BabylonScene> | null>(null);

  // ... fridge/grinder/stuffer/stove state (same as before) ...

  const onSceneReady = (scene: any) => {
    scene.clearColor = new Color4(0.02, 0.02, 0.02, 1);
    scene.enablePhysics(new Vector3(0, -9.81, 0), new CannonJSPlugin());

    // Dim ambient fill (fluorescent tubes provide main light)
    const ambientLight = new HemisphericLight('ambientLight', new Vector3(0, 1, 0), scene);
    ambientLight.intensity = 0.15;
    ambientLight.groundColor = new Color3(0.1, 0.1, 0.1);

    // Start camera at station 0 (fridge)
    const start = STATION_CAMERAS[0];
    const cam = new FreeCamera(
      'playerCamera',
      new Vector3(start.position[0], start.position[1], start.position[2]),
      scene,
    );
    cam.setTarget(new Vector3(start.lookAt[0], start.lookAt[1], start.lookAt[2]));
    cam.minZ = 0.1;

    // Disable WASD movement
    cam.keysUp = [];
    cam.keysDown = [];
    cam.keysLeft = [];
    cam.keysRight = [];

    // Enable mouse/touch rotation
    cam.attachControl(scene.getEngine().getRenderingCanvas(), true);

    scene.activeCamera = cam;
    setCamera(cam);
  };

  // Auto-walk camera when currentChallenge changes
  useEffect(() => {
    if (!camera || gameStatus !== 'playing') return;

    const cam = camera as FreeCamera;
    const scene = cam.getScene();
    const target = STATION_CAMERAS[currentChallenge];
    if (!target) return;

    // Clean up any in-progress walk
    if (walkObserverRef.current) {
      scene.onBeforeRenderObservable.remove(walkObserverRef.current);
      walkObserverRef.current = null;
    }

    const startPos = cam.position.clone();
    const endPos = new Vector3(target.position[0], target.position[1], target.position[2]);
    const endTarget = new Vector3(target.lookAt[0], target.lookAt[1], target.lookAt[2]);
    const startTarget = cam.getTarget().clone();

    // Skip animation if already at position (e.g. first challenge)
    if (Vector3.Distance(startPos, endPos) < 0.1) return;

    let t = 0;
    const observer = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      t = Math.min(t + dt * 0.4, 1); // ~2.5 second walk
      const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // ease-in-out quadratic

      cam.position = Vector3.Lerp(startPos, endPos, ease);
      cam.setTarget(Vector3.Lerp(startTarget, endTarget, ease));

      if (t >= 1) {
        scene.onBeforeRenderObservable.remove(observer);
        walkObserverRef.current = null;
      }
    });
    walkObserverRef.current = observer;
  }, [camera, currentChallenge, gameStatus]);

  // Cleanup walk on unmount
  useEffect(() => {
    return () => {
      if (walkObserverRef.current && camera) {
        const scene = (camera as FreeCamera).getScene();
        scene.onBeforeRenderObservable.remove(walkObserverRef.current);
      }
    };
  }, [camera]);

  // ... rest unchanged (engineProps, return JSX) ...
};
```

**Key differences from old code:**
- No `useNavigationStore` import
- No `navigateToWaypoint` callback
- No `setNavigateTo` registration
- Camera starts at `STATION_CAMERAS[0]` instead of `getWaypoint('center')`
- `useEffect` on `[camera, currentChallenge, gameStatus]` does the auto-walk
- Walk speed: `t + dt * 0.4` → ~2.5 seconds, ease-in-out quadratic

**Step 3: Update GameWorld.native.tsx similarly**

The native version should also remove navigation imports and use the same `STATION_CAMERAS` pattern. Read the file and make equivalent changes (remove `useNavigationStore`, `getWaypoint`, `WaypointId` imports; remove any navigation registration effects; start camera at STATION_CAMERAS[0]).

**Step 4: Run tests**

```bash
npm test -- --ci --forceExit
```

Expected: All tests pass (none test GameWorld directly — it uses Babylon.js).

**Step 5: Type check**

```bash
npx tsc --noEmit 2>&1 | grep -v "\.test\." | head -20
```

Expected: 0 source errors.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add auto-rail camera system

Camera auto-walks between stations on challenge completion.
~2.5 second ease-in-out dolly. No manual navigation needed."
```

---

### Task 3: Rewrite KitchenEnvironment Lighting

**Files:**
- Modify: `src/components/kitchen/KitchenEnvironment.tsx` — replace single swinging bulb with 3 fluorescent tube fixtures

**Context:** Current lighting is a single warm PointLight (intensity 1.5, diffuse (1.0, 0.85, 0.6)) with a swinging bulb animation. The new lighting should be 3 long fluorescent tube fixtures mounted on the ceiling, casting harsh downward white light with a slight green tint, and random flicker.

**Step 1: Replace the lighting section**

Remove the entire "Swinging lightbulb" section (bulbLight, bulb sphere, wire, shadow generator, swing animation). Replace with:

```typescript
// --- Fluorescent Tube Fixtures ---
// 3 tubes running along Z-axis, spread across X
const tubePositions = [
  new Vector3(-3, 3.8, -2),
  new Vector3(0, 3.8, -3.5),
  new Vector3(3, 3.8, -2),
];

const tubeMeshes: any[] = [];
const tubeLights: SpotLight[] = [];
const tubeMats: StandardMaterial[] = [];

const tubeMat = new StandardMaterial('tubeMat', scene);
tubeMat.emissiveColor = new Color3(0.95, 1.0, 0.9); // Slightly green-white
tubeMat.disableLighting = true;
tubeMats.push(tubeMat);

for (let i = 0; i < tubePositions.length; i++) {
  const pos = tubePositions[i];

  // Tube mesh (long thin box)
  const tube = MeshBuilder.CreateBox(
    `fluorescentTube${i}`,
    { width: 0.12, height: 0.06, depth: 3.0 },
    scene,
  );
  tube.material = tubeMat;
  tube.position = pos;
  tubeMeshes.push(tube);

  // Housing/fixture (slightly wider box above tube)
  const housing = MeshBuilder.CreateBox(
    `tubeHousing${i}`,
    { width: 0.3, height: 0.08, depth: 3.2 },
    scene,
  );
  const housingMat = new StandardMaterial(`tubeHousingMat${i}`, scene);
  housingMat.diffuseColor = new Color3(0.6, 0.6, 0.6);
  housingMat.specularColor = new Color3(0.1, 0.1, 0.1);
  housing.material = housingMat;
  housing.position = new Vector3(pos.x, pos.y + 0.06, pos.z);
  tubeMeshes.push(housing);
  tubeMats.push(housingMat);

  // SpotLight pointing straight down
  const light = new SpotLight(
    `tubeLight${i}`,
    new Vector3(pos.x, pos.y - 0.05, pos.z),
    new Vector3(0, -1, 0), // Straight down
    Math.PI / 2.5, // Wide cone
    1.5, // Falloff exponent
    scene,
  );
  light.diffuse = new Color3(0.95, 1.0, 0.9);
  light.intensity = 2.0;
  light.range = 8;
  tubeLights.push(light);
}

// --- Flicker animation ---
let flickerTime = 0;
// Track which tube is flickering and when
let nextFlickerAt = 2 + Math.random() * 3;
let flickeringTube = -1;
let flickerEnd = 0;

const observer = scene.onBeforeRenderObservable.add(() => {
  const dt = scene.getEngine().getDeltaTime() / 1000;
  flickerTime += dt;

  // Check if it's time for a new flicker
  if (flickerTime > nextFlickerAt && flickeringTube === -1) {
    flickeringTube = Math.floor(Math.random() * tubePositions.length);
    flickerEnd = flickerTime + 0.1 + Math.random() * 0.3; // Flicker for 0.1-0.4s
    nextFlickerAt = flickerTime + 3 + Math.random() * 8; // Next flicker in 3-11s
  }

  // Apply flicker
  for (let i = 0; i < tubeLights.length; i++) {
    if (i === flickeringTube && flickerTime < flickerEnd) {
      // Rapid on/off during flicker
      const flash = Math.sin(flickerTime * 60) > 0 ? 0.3 : 2.0;
      tubeLights[i].intensity = flash;
    } else {
      tubeLights[i].intensity = 2.0;
    }
  }

  // End flicker
  if (flickeringTube !== -1 && flickerTime >= flickerEnd) {
    flickeringTube = -1;
  }
});
```

**Step 2: Add SpotLight import**

Add `SpotLight` to the `@babylonjs/core` import at the top of the file:

```typescript
import {
  Color3,
  MeshBuilder,
  SpotLight,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
```

Remove `PointLight` and `ShadowGenerator` from the import (no longer used).

**Step 3: Update wall/floor/ceiling materials**

Make the walls slightly lighter and more institutional to work with the harsh lighting:

```typescript
// Floor: Stained concrete
floorMat.diffuseColor = new Color3(0.35, 0.33, 0.3);
floorMat.specularColor = new Color3(0.15, 0.15, 0.15);

// Ceiling: Off-white with stains
ceilingMat.diffuseColor = new Color3(0.7, 0.68, 0.65);
ceilingMat.specularColor = new Color3(0.05, 0.05, 0.05);

// Walls: Grimy off-white tile
wallMat.diffuseColor = new Color3(0.6, 0.58, 0.55);
wallMat.specularColor = new Color3(0.1, 0.1, 0.1);
```

**Step 4: Update cleanup**

Replace the old cleanup (bulbLight, bulb, wire, shadowGen disposal) with:

```typescript
return () => {
  if (observer) scene.onBeforeRenderObservable.remove(observer);

  for (const light of tubeLights) light.dispose();
  for (const mesh of tubeMeshes) mesh.dispose();
  for (const mat of tubeMats) mat.dispose();

  floor.dispose();
  floorMat.dispose();
  ceiling.dispose();
  ceilingMat.dispose();

  backWall.dispose();
  frontWall.dispose();
  leftWall.dispose();
  rightWall.dispose();
  wallMat.dispose();
};
```

**Step 5: Run tests + type check**

```bash
npm test -- --ci --forceExit
npx tsc --noEmit 2>&1 | grep -v "\.test\." | head -20
```

Expected: All pass — KitchenEnvironment has no direct tests.

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: harsh fluorescent tube lighting

Replace single warm bulb with 3 overhead fluorescent tubes.
Harsh white-green light, random flicker effect. Basement kitchen vibe."
```

---

### Task 4: Fix CRT Shader (Remove textureSampler Dependency)

**Files:**
- Modify: `src/components/effects/CrtShader.ts` — make fragment shader purely procedural

**Context:** The CRT shader's fragment shader references `uniform sampler2D textureSampler` and uses `texture2D(textureSampler, uv)` for chromatic aberration, but no texture is ever bound. This causes WebGPU `createBindGroup` errors. Since MrSausage3D is rendered as a separate 3D mesh in front of the TV (not displayed as a texture ON the TV), the shader should be purely procedural — green-tinted CRT static/scanlines without sampling any texture.

**Step 1: Rewrite CRT_FRAGMENT to be procedural**

```glsl
precision highp float;

varying vec2 vUV;

uniform float time;
uniform float flickerIntensity;
uniform float staticIntensity;

// Pseudo-random
float rand(vec2 co) {
  return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
}

void main() {
  vec2 uv = vUV;

  // Barrel distortion
  vec2 centered = uv - 0.5;
  float dist = length(centered);
  uv = 0.5 + centered * (1.0 + 0.15 * dist * dist);

  // Base CRT green glow
  vec3 color = vec3(0.05, 0.15, 0.08);

  // Scanlines
  float scanline = sin(uv.y * 400.0 + time * 2.0) * 0.08;

  // Flicker
  float flicker = 1.0 - flickerIntensity * rand(vec2(time * 0.1, 0.0)) * 0.1;

  // Static noise
  float noise = rand(uv + time) * staticIntensity;

  // Vignette
  float vignette = 1.0 - 0.6 * dist * dist;

  // Combine
  color = (color + scanline) * flicker * vignette + noise * 0.15;

  // CRT green tint
  color *= vec3(0.7, 1.0, 0.8);

  // Out-of-bounds black
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    color = vec3(0.0);
  }

  gl_FragColor = vec4(color, 1.0);
}
```

**Step 2: Remove textureSampler from createCrtMaterial**

```typescript
export function createCrtMaterial(name: string, scene: Scene): ShaderMaterial {
  Effect.ShadersStore[`${name}VertexShader`] = CRT_VERTEX;
  Effect.ShadersStore[`${name}FragmentShader`] = CRT_FRAGMENT;

  const material = new ShaderMaterial(name, scene, name, {
    attributes: ['position', 'uv'],
    uniforms: ['worldViewProjection', 'time', 'flickerIntensity', 'staticIntensity'],
    // No samplers — shader is purely procedural
  });

  material.setFloat('time', 0);
  material.setFloat('flickerIntensity', 1.0);
  material.setFloat('staticIntensity', 0.05);

  return material;
}
```

**Step 3: Run tests + type check**

```bash
npm test -- --ci --forceExit
npx tsc --noEmit 2>&1 | grep -v "\.test\." | head -20
```

**Step 4: Commit**

```bash
git add -A
git commit -m "fix: make CRT shader procedural (no textureSampler)

Remove texture2D sampling from fragment shader.
Generates green CRT glow procedurally.
Fixes WebGPU createBindGroup errors."
```

---

### Task 5: Integration Test & Verify

**Files:**
- No new files — verification only

**Step 1: Run full test suite**

```bash
npm test -- --ci --forceExit
```

Expected: All tests pass (should be ~167 tests now — 10 WaypointGraph tests removed).

**Step 2: Type check**

```bash
npx tsc --noEmit 2>&1 | grep -v "\.test\." | head -20
```

Expected: 0 source errors.

**Step 3: Verify git status is clean**

```bash
git status
git log --oneline -5
```

Expected: 4 new commits (tasks 1-4), clean working tree.

**Step 4: Manual web test**

```bash
npx expo start --web
```

Open in browser and verify:
- Title screen renders
- Click NEW GAME → camera is at fridge station
- Complete ingredient challenge → camera auto-walks to grinder
- 3D scene is bright with harsh fluorescent lighting
- Occasional flicker visible
- CRT TV shows green procedural static (no console errors)
- No WebGPU errors in console
