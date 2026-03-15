# Filament Migration — Design Spec

**Date:** 2026-03-14
**Status:** Approved
**Branch:** feat/greenfield-complete
**Supersedes:** `2026-03-13-native-first-pivot-design.md` (Phase 0 FAILED — Hermes has no WebAssembly)

## Problem Statement

Phase 0 of the native-first pivot proved that `@react-three/rapier` (WASM Rapier physics) cannot work on native iOS/Android because Hermes has no WebAssembly support. Additionally, Three.js WebGPU/TSL builds crash Hermes at module load time (`Cannot read property 'clone' of undefined`).

However, Phase 0 also proved that React Native's UI layer works perfectly on native — the TitleScreen and DifficultySelector rendered flawlessly on iPhone 17 Pro simulator. The blocker is specifically the 3D rendering + physics stack.

## Decision

**Replace React Three Fiber + Three.js + Rapier with react-native-filament (Margelo).**

react-native-filament provides:
- **Google Filament renderer** — PBR, Metal (iOS) / Vulkan (Android), no WebAssembly
- **Bullet3 physics** — native C++, no WASM, hooks API (`useWorld`, `useRigidBody`, `useBoxShape`)
- **GLB/GLTF loading** — `<Model source={require('./model.glb')} />`
- **Worklet-based animation** — `RenderCallback` on UI thread via `react-native-worklets-core`
- **Gesture integration** — works with `react-native-gesture-handler` for camera/interaction

## Architecture

### Stack
```
React Native (UI layer)
  → FilamentScene / FilamentView (3D rendering — Metal/Vulkan)
    → Bullet3 physics (native C++, useWorld/useRigidBody hooks)
      → Koota ECS (state management — unchanged)
        → op-sqlite + Drizzle (persistence — unchanged)
```

Zero WebAssembly. Zero Three.js. Zero R3F.

### What Changes vs What Stays

**STAYS (no changes):**
- `src/ecs/` — Koota ECS (traits, hooks, actions, world) — pure JS, no rendering deps
- `src/engine/` — All game logic (ChallengeRegistry, SausagePhysics, DemandScoring, IngredientMatcher, RoundManager, DifficultyConfig, GameOrchestrator, DialogueEngine)
- `src/config/` — All 16 JSON configs + 8 TypeScript accessors
- `src/data/` — All dialogue data files
- `src/input/` — InputManager, KeyboardMouseProvider, TouchProvider (platform-agnostic polling)
- `src/components/ui/TitleScreen.tsx` — React Native UI (pre-game, not 3D)
- `src/components/ui/DifficultySelector.tsx` — React Native UI (pre-game, not 3D)
- `__mocks__/` — Jest mocks (update for Filament)
- All test infrastructure (Jest config, Biome, TypeScript)

**DELETED (R3F + Three.js + Rapier):**
```
src/components/stations/        # 9 station components (R3F)
src/components/environment/     # BasementRoom, Kitchen, Prop, ScatterProps, SurrealText
src/components/kitchen/         # KitchenSetPieces, LiquidPourer, ProceduralIngredients, TrapDoor*
src/components/camera/          # CameraRail, FirstPersonControls, IntroSequence, PlayerHands
src/components/sausage/         # Sausage, SausageGeometry
src/components/characters/      # MrSausage3D, reactions
src/components/effects/         # CrtShader
src/components/challenges/      # TieGesture
src/components/controls/        # SwipeFPSControls
src/components/ui/DialogueOverlay.tsx
src/components/ui/GameOverScreen.tsx
src/components/ui/LoadingScreen.tsx
src/components/ui/SettingsScreen.tsx
src/components/ui/ChallengeHeader.tsx
src/components/ui/StrikeCounter.tsx
src/components/ui/ProgressGauge.tsx
src/components/ui/RoundTransition.tsx
src/components/ui/*HUD.tsx
src/components/ui/IngredientChallenge.tsx
src/components/ui/TastingChallenge.tsx
src/player/                     # FPSCamera, PlayerCapsule, useMouseLook, usePhysicsMovement, useJump, headBob (R3F-dependent)
src/engine/AudioEngine.ts       # Web Audio API (AudioContext doesn't exist on Hermes)
src/engine/AudioEngine.web.ts   # Tone.js browser audio
src/engine/assetUrl.ts          # Web URL resolution
e2e/                            # Playwright tests
playwright.config.ts
public/coi-serviceworker.js
```

**CREATED (Filament):**
```
src/scene/                      # NEW — all Filament 3D components
  Scene.tsx                     # Root: FilamentScene + FilamentView + physics world
  Kitchen.tsx                   # Room geometry (boxes for walls/floor/ceiling)
  Lighting.tsx                  # DefaultLight + point lights for horror ambiance
  FPSCamera.tsx                 # First-person camera using worklet render callback
  PlayerCapsule.tsx             # Bullet rigid body capsule for player movement
  IntroSequence.tsx             # Eyelid blink/wake-up (Filament planes as eyelids)
  PlayerHands.tsx               # First-person hands model
  SurrealText.tsx               # Diegetic blood text on surfaces (Filament text/decals)
  MrSausage.tsx                 # Procedural character with reactions
  TV.tsx                        # CRT television (Filament custom material)
  stations/
    Grinder.tsx                 # Grinder station — Filament models + Bullet colliders
    Stuffer.tsx
    Stove.tsx
    ChoppingBlock.tsx
    BlowoutStation.tsx
    Sink.tsx
    ChestFreezer.tsx
    PhysicsFreezerChest.tsx
    TV.tsx
  props/
    ScatterProps.tsx             # Horror prop GLB loading
    TrapDoor.tsx
    KitchenFurniture.tsx
  sausage/
    Sausage.tsx                 # Bone-chain sausage body (Bullet constraints)
    SausageGeometry.tsx

src/audio/
  AudioEngine.ts                # expo-audio implementation (native, not Web Audio)

src/db/
  client.ts                     # op-sqlite (rewrite)
  drizzleQueries.ts             # Simplified (no try/catch, native just works)

.maestro/                       # Maestro E2E test flows
```

## Filament Component API Patterns

### Basic Scene Setup
```tsx
import { FilamentScene, FilamentView, DefaultLight, Model, Camera } from 'react-native-filament';

function GameScene() {
  return (
    <FilamentScene>
      <FilamentView style={{ flex: 1 }} renderCallback={onFrame}>
        <DefaultLight />
        <Camera />
        {/* All scene content here */}
      </FilamentView>
    </FilamentScene>
  );
}
```

### Physics (Bullet3)
```tsx
import { useWorld, useRigidBody, useBoxShape, useSphereShape } from 'react-native-filament';

function PhysicsScene() {
  const world = useWorld([0, -9.8, 0]);
  const floorShape = useBoxShape([10, 0.1, 10]);
  const playerShape = useCylinderShape(0.3, 1.8);

  // Static floor
  const floor = useRigidBody({
    id: 'floor', mass: 0, shape: floorShape, world,
    transform: [0, 0, 0],
  });

  // Dynamic player
  const player = useRigidBody({
    id: 'player', mass: 70, shape: playerShape, world,
    transform: [0, 2, 2],
    damping: [0.9, 0.9],
  });
}
```

### Animation (Worklet Render Callback)
```tsx
import { useCallback } from 'react';
import { useSharedValue } from 'react-native-worklets-core';
import { RenderCallback, FilamentView } from 'react-native-filament';

function AnimatedScene() {
  const rotation = useSharedValue([0, 0, 0]);

  const onFrame: RenderCallback = useCallback(() => {
    'worklet';
    rotation.value = [0, rotation.value[1] + 0.01, 0];
  }, [rotation]);

  return (
    <FilamentView renderCallback={onFrame}>
      <Model source={require('./grinder.glb')} rotate={rotation} />
    </FilamentView>
  );
}
```

### Gesture Integration
```tsx
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// Pan gesture for FPS look
const lookGesture = Gesture.Pan()
  .onUpdate((e) => {
    yaw.value -= e.translationX * 0.002;
    pitch.value = clamp(pitch.value - e.translationY * 0.002, -1.4, 1.4);
  });
```

## Station Component Migration Pattern

Each R3F station becomes a Filament station. Example for Grinder:

**Before (R3F):**
```tsx
import { Box, Cylinder } from '@react-three/drei';
import { RigidBody } from '@react-three/rapier';
import { useFrame } from '@react-three/fiber';

export function Grinder() {
  return (
    <RigidBody type="fixed">
      <Box args={[0.6, 0.8, 0.8]}>
        <meshStandardMaterial color="#888" />
      </Box>
    </RigidBody>
  );
}
```

**After (Filament):**
```tsx
import { Model, useRigidBody, useBoxShape } from 'react-native-filament';

export function Grinder({ world }) {
  const shape = useBoxShape([0.6, 0.8, 0.8]);
  const body = useRigidBody({
    id: 'grinder', mass: 0, shape, world,
    transform: [-1.5, 0.4, -1.0],
  });

  return <Model source={require('../../../assets/models/grinder.glb')} translate={[-1.5, 0.4, -1.0]} />;
}
```

For stations with procedural geometry (boxes, cylinders), we have two options:
1. **GLB models** — Pre-build geometry in Blender, export as GLB. Better visuals, more work upfront.
2. **Filament primitives** — Filament supports programmatic mesh creation. More code but matches current approach.

**Recommendation:** Use GLB models for everything. The game already has GLB assets. Procedural geometry was an R3F convenience — Filament's strength is loading authored 3D content.

## SurrealText (Diegetic Feedback)

This is the most challenging migration. R3F SurrealText uses `drei`'s `<Text>` (troika-three-text) to render 3D text in the scene. Filament does not have a built-in text rendering component.

**Options:**
1. **Texture-based text** — Render text to a canvas/bitmap, apply as texture to a plane in the scene. Filament supports dynamic textures.
2. **React Native overlay with transparency** — Position RN `<Text>` elements absolutely over the FilamentView at screen-space coordinates matching 3D surface positions. Not truly diegetic but visually identical.
3. **3D text mesh** — Generate text geometry and load as a dynamic mesh. Complex but most authentic.

**Recommendation:** Option 1 (texture-based). Render blood-text to an offscreen canvas, apply to a Filament plane positioned on the wall/ceiling. The drip/melt animation updates the texture each frame. This preserves the diegetic immersion while being technically feasible.

## FPS Camera + Player Movement

Filament's camera API uses `useCameraManipulator` for orbit cameras. For FPS, we need direct camera control:

```tsx
const onFrame: RenderCallback = useCallback(() => {
  'worklet';
  // Read player rigid body position from Bullet
  const pos = playerBody.getPosition();
  // Apply eye height offset
  camera.lookAt(
    [pos.x, pos.y + 1.6, pos.z],  // eye position
    [pos.x + Math.sin(yaw.value), pos.y + 1.6, pos.z + Math.cos(yaw.value)],  // look target
    [0, 1, 0]  // up vector
  );
}, [playerBody, yaw]);
```

Touch input: left-side invisible zone drives player velocity on the Bullet rigid body. Right-side zone updates yaw/pitch shared values. Same dual-zone pattern as grovekeeper's TouchProvider.

## Dependency Changes

### DELETE
```
@react-three/fiber
@react-three/drei
@react-three/rapier
@react-three/postprocessing
@react-three/xr
@dimforge/rapier3d-compat
@use-gesture/react
react-native-wgpu
three
expo-sqlite
expo-gl
@playwright/test
@playwright/experimental-ct-react
tone
zustand
miniplex
miniplex-react
```

### ADD
```
react-native-filament
react-native-gesture-handler    # May already be installed
react-native-worklets-core      # Worklet-based render callbacks
@op-engineering/op-sqlite
babel-plugin-inline-import
```

### KEEP
```
koota
expo-audio
expo-haptics
expo-asset
expo-linking
react-native-reanimated         # May be needed by worklets-core
```

## Execution Phases

### Phase 1: Scaffold + Hello World
1. Install react-native-filament + deps
2. Remove ALL R3F/Three.js/Rapier packages
3. Create minimal `src/scene/Scene.tsx` with FilamentScene + FilamentView + DefaultLight + Camera
4. Wire into App.tsx (replace `<Canvas>`)
5. Verify: Filament renders on iOS simulator (even if just a light + empty scene)

### Phase 2: Kitchen Environment
1. Create room geometry as GLB (or Filament boxes for walls/floor/ceiling)
2. Add horror lighting (dim point lights, flicker animation via render callback)
3. Load kitchen furniture GLBs
4. Add physics world with static colliders for walls/floor
5. Verify: dark kitchen room renders with furniture

### Phase 3: Player + Movement
1. Create PlayerCapsule with Bullet dynamic rigid body
2. Implement FPS camera via render callback (yaw/pitch shared values)
3. Wire InputManager's TouchProvider to drive player velocity
4. Implement useJump with Bullet raycast
5. Add PlayerHands model
6. Implement IntroSequence (eyelid planes with opacity animation)
7. Verify: player walks around kitchen in first person

### Phase 4: Stations
1. Rewrite each station as Filament component (GLB model + Bullet collider + interaction)
2. Wire station interactions to Koota ECS actions
3. Implement per-station game logic (grind, stuff, cook, etc.)
4. Order: ChestFreezer → ChoppingBlock → Grinder → Stuffer → BlowoutStation → Stove → Sink → TV
5. Verify: each station interactive, game phase advances

### Phase 5: Diegetic Feedback + Characters
1. Implement SurrealText via texture-based text on Filament planes
2. Blood text on walls/ceiling for phase instructions, dialogue, demands
3. Strike marks on counter, verdict on far wall
4. Rewrite MrSausage procedural character for Filament
5. Implement CRT TV effect (Filament custom material)
6. Verify: all game feedback is diegetic, Mr. Sausage reacts

### Phase 6: Audio + Persistence
1. Rewrite AudioEngine for expo-audio (load OGGs, play on interaction)
2. Swap expo-sqlite for op-sqlite + Drizzle
3. Wire persistence to Koota (hydrate on load, save on round complete)
4. Verify: audio plays, sessions persist

### Phase 7: Sausage Physics
1. Rewrite sausage bone-chain using Bullet constraints
2. Implement extrusion animation
3. Wire grease/cook visual changes
4. Verify: sausage body responds to physics

### Phase 8: Maestro E2E + Polish
1. Create .maestro/ YAML flows for full game round
2. Device playtest on real iOS device
3. Fix whatever breaks
4. Performance optimization (60fps target)
5. Record gameplay video

## Success Criteria

- [ ] react-native-filament renders kitchen scene on iOS simulator
- [ ] Bullet physics: player walks, stations have colliders, sausage has bone chain
- [ ] All 9 stations interactive via touch
- [ ] Diegetic feedback: blood text on walls for all game state
- [ ] Mr. Sausage dialogue appears as blood text, choices tappable
- [ ] Audio plays via expo-audio
- [ ] op-sqlite persists between launches
- [ ] Full round playable: title → difficulty → walk → freeze → chop → grind → stuff → tie → cook → verdict
- [ ] Maestro flows pass on simulator
- [ ] 60fps on iPhone 14 / Pixel 7
- [ ] Zero WebAssembly, zero Three.js, zero R3F in final bundle

## Risk: SurrealText

The biggest unknown is diegetic text rendering in Filament. Three.js/troika made this easy via `<Text>`. Filament has no equivalent. The texture-based approach (render text to bitmap, apply to plane) is proven in native game engines but hasn't been demonstrated in react-native-filament specifically. This should be prototyped early (Phase 5 step 1) and if it fails, fall back to transparent React Native overlay positioned at screen-space coordinates.

## Sources
- [react-native-filament GitHub](https://github.com/margelo/react-native-filament)
- [react-native-filament Docs](https://margelo.github.io/react-native-filament/)
- [Filament Physics Guide](https://margelo.github.io/react-native-filament/docs/guides/physics)
- [Filament Camera Guide](https://margelo.github.io/react-native-filament/docs/guides/camera)
- [Google Filament Engine](https://github.com/google/filament)
