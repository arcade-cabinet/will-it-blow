# Filament Migration Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace React Three Fiber + Three.js + Rapier with react-native-filament (Google Filament renderer + Bullet3 physics) so the game runs natively on iOS/Android without any WebAssembly.

**Architecture:** FilamentScene/FilamentView for 3D rendering (Metal/Vulkan), Bullet3 for physics via useWorld/useRigidBody hooks, worklet-based render callbacks for animation. Koota ECS, engine logic, config, and input system are unchanged. New `src/scene/` directory replaces old `src/components/` with Filament equivalents.

**Tech Stack:** react-native-filament, react-native-worklets-core, react-native-gesture-handler, Bullet3 (via Filament), Koota ECS, op-sqlite + Drizzle ORM, expo-audio, Maestro

**Spec:** `docs/superpowers/specs/2026-03-14-filament-migration-design.md`

---

## Chunk 1: Phase 1 — Scaffold + Chainsaw + Hello World

### Task 1: Remove all R3F/Three.js/Rapier packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove R3F + Three.js + Rapier + web packages**

```bash
pnpm remove @react-three/fiber @react-three/drei @react-three/rapier @react-three/postprocessing @react-three/xr @dimforge/rapier3d-compat three @use-gesture/react react-native-wgpu expo-sqlite expo-gl @playwright/test @playwright/experimental-ct-react tone zustand miniplex miniplex-react
```

- [ ] **Step 2: Install Filament + native deps**

```bash
pnpm add react-native-filament react-native-worklets-core @op-engineering/op-sqlite
pnpm add -D babel-plugin-inline-import
```

Verify react-native-gesture-handler is already installed:
```bash
grep "react-native-gesture-handler" package.json
```

- [ ] **Step 3: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: remove R3F/Three.js/Rapier, add react-native-filament + op-sqlite"
```

### Task 2: Delete all R3F source files

**Files:**
- Delete: 55 source files in `src/components/`, `src/player/`
- Delete: all associated tests
- Delete: web infrastructure files

- [ ] **Step 1: Delete R3F component directories**

```bash
rm -rf src/components/stations/
rm -rf src/components/environment/
rm -rf src/components/kitchen/
rm -rf src/components/camera/
rm -rf src/components/sausage/
rm -rf src/components/characters/
rm -rf src/components/effects/
rm -rf src/components/challenges/
rm -rf src/components/controls/
rm -rf src/player/
```

- [ ] **Step 2: Delete 2D overlay components (all of them)**

```bash
rm -f src/components/ui/DialogueOverlay.tsx
rm -f src/components/ui/GameOverScreen.tsx
rm -f src/components/ui/LoadingScreen.tsx
rm -f src/components/ui/SettingsScreen.tsx
rm -f src/components/ui/ChallengeHeader.tsx
rm -f src/components/ui/StrikeCounter.tsx
rm -f src/components/ui/ProgressGauge.tsx
rm -f src/components/ui/RoundTransition.tsx
rm -f src/components/ui/GrindingHUD.tsx
rm -f src/components/ui/StuffingHUD.tsx
rm -f src/components/ui/CookingHUD.tsx
rm -f src/components/ui/BlowoutHUD.tsx
rm -f src/components/ui/IngredientChallenge.tsx
rm -f src/components/ui/TastingChallenge.tsx
```

- [ ] **Step 3: Delete web infrastructure + audio + tests**

```bash
rm -rf e2e/
rm -f playwright.config.ts
rm -f public/coi-serviceworker.js
rm -f src/engine/AudioEngine.ts
rm -f src/engine/AudioEngine.web.ts
rm -f src/engine/assetUrl.ts
rm -f src/db/usePersistence.ts
```

- [ ] **Step 4: Delete all tests for deleted files**

```bash
rm -rf src/components/ui/__tests__/
rm -rf src/components/environment/__tests__/
rm -rf src/components/challenges/__tests__/
rm -rf src/config/__tests__/
rm -f src/engine/__tests__/AudioEngine.test.ts
rm -f src/engine/__tests__/assetUrl.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "chainsaw: delete 55 R3F source files, all web infra, Playwright, overlays"
```

### Task 3: Create Filament hello world scene

**Files:**
- Create: `src/scene/Scene.tsx`

- [ ] **Step 1: Create the scene directory**

```bash
mkdir -p src/scene
```

- [ ] **Step 2: Write Scene.tsx**

```tsx
// src/scene/Scene.tsx
import {FilamentScene, FilamentView, DefaultLight, Camera} from 'react-native-filament';
import {useCallback} from 'react';
import {StyleSheet} from 'react-native';
import type {RenderCallback} from 'react-native-filament';

export function GameScene() {
  const onFrame: RenderCallback = useCallback(() => {
    'worklet';
    // Render loop — will add physics stepping + animation here
  }, []);

  return (
    <FilamentScene>
      <FilamentView style={styles.scene} renderCallback={onFrame}>
        <DefaultLight />
        <Camera />
      </FilamentView>
    </FilamentScene>
  );
}

const styles = StyleSheet.create({
  scene: {flex: 1},
});
```

- [ ] **Step 3: Commit**

```bash
git add src/scene/Scene.tsx
git commit -m "feat: create Filament hello world scene"
```

### Task 4: Rewrite App.tsx for Filament

**Files:**
- Rewrite: `App.tsx`

- [ ] **Step 1: Rewrite App.tsx**

Strip out all R3F Canvas imports and replace with the Filament GameScene. Keep TitleScreen, DifficultySelector, and Koota ECS hooks.

```tsx
// App.tsx
import {StyleSheet, View} from 'react-native';
import {useGameStore} from './src/ecs/hooks';
import {TitleScreen} from './src/components/ui/TitleScreen';
import {GameScene} from './src/scene/Scene';

export default function App() {
  const appPhase = useGameStore(state => state.appPhase);

  return (
    <View style={styles.container}>
      {appPhase === 'title' && <TitleScreen />}
      {appPhase === 'playing' && <GameScene />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: '#000'},
});
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: errors only from deleted file references in engine/config tests (not from App.tsx or Scene.tsx)

- [ ] **Step 3: Commit**

```bash
git add App.tsx
git commit -m "feat: rewrite App.tsx for Filament — title screen + GameScene"
```

### Task 5: Fix remaining test infrastructure

**Files:**
- Modify: `jest.config.js`
- Modify: `__mocks__/AudioEngine.js`
- Modify: various test files that import deleted modules

- [ ] **Step 1: Update jest.config.js**

Remove Three.js/R3F module mappers. Add Filament mock:

```javascript
module.exports = {
  preset: 'react-native',
  setupFiles: ['./jest.setup.js'],
  testPathIgnorePatterns: ['/node_modules/', '/e2e/', '/.claude/', '/.maestro/'],
  transformIgnorePatterns: [
    'node_modules/(?!(.pnpm|react-native|@react-native|expo|@expo|babel-preset-expo|koota)/)',
  ],
  moduleNameMapper: {
    '^react-native-filament$': '<rootDir>/__mocks__/react-native-filament.js',
    '.*/engine/AudioEngine$': '<rootDir>/__mocks__/AudioEngine.js',
  },
};
```

- [ ] **Step 2: Create Filament mock**

Create `__mocks__/react-native-filament.js`:

```javascript
module.exports = {
  FilamentScene: ({children}) => children,
  FilamentView: ({children}) => children,
  DefaultLight: () => null,
  Camera: () => null,
  Model: () => null,
  useWorld: () => ({}),
  useRigidBody: () => ({}),
  useBoxShape: () => ({}),
  useSphereShape: () => ({}),
  useCylinderShape: () => ({}),
  useStaticPlaneShape: () => ({}),
  useFilamentContext: () => ({transformManager: {setEntityRotation: jest.fn()}}),
  useModel: () => ({state: 'loaded', rootEntity: 1}),
};
```

- [ ] **Step 3: Update AudioEngine mock**

```javascript
// __mocks__/AudioEngine.js
const audioEngine = {
  initialize: jest.fn().mockResolvedValue(undefined),
  playSound: jest.fn(),
  playChop: jest.fn(),
  setSizzleLevel: jest.fn(),
  setGrinderSpeed: jest.fn(),
  setAmbientDrone: jest.fn(),
  startAmbient: jest.fn(),
  stopAmbient: jest.fn(),
  setVolume: jest.fn(),
  setMuted: jest.fn(),
  isMuted: jest.fn().mockReturnValue(false),
  dispose: jest.fn(),
  initialized: true,
};
module.exports = {audioEngine};
```

- [ ] **Step 4: Remove old Three.js mocks**

```bash
rm -f __mocks__/three_webgpu.js
rm -f __mocks__/three_tsl.js
rm -f __mocks__/postprocessing.js
rm -f __mocks__/react-native-skia.js
rm -f __mocks__/expo-keep-awake.js
```

- [ ] **Step 5: Run tests**

Run: `npx jest --no-watchman`
Expected: remaining tests pass (ECS, engine, config, store tests). Count will be much lower since we deleted UI/component tests.

- [ ] **Step 6: Commit**

```bash
git add jest.config.js __mocks__/
git commit -m "fix: update test infrastructure for Filament (mocks, config)"
```

### Task 6: Rebuild iOS and verify Filament renders

- [ ] **Step 1: Clean and prebuild**

```bash
rm -rf ios/
npx expo prebuild --platform ios --clean
```

- [ ] **Step 2: Build and run**

```bash
npx expo run:ios
```

- [ ] **Step 3: Verify with Maestro screenshot**

Use Maestro to launch app, tap START COOKING → Medium, then screenshot. Should see Filament's default scene (lit empty space) instead of a crash.

```bash
# After app is on simulator:
# maestro launch + screenshot via MCP tools
```

- [ ] **Step 4: Commit**

```bash
git commit --allow-empty -m "verify: Filament hello world renders on iOS simulator"
```

---

## Chunk 2: Phase 2 — Kitchen Environment

### Task 7: Create kitchen room with Filament

**Files:**
- Create: `src/scene/Kitchen.tsx`
- Create: `src/scene/Lighting.tsx`

- [ ] **Step 1: Create Lighting.tsx**

```tsx
// src/scene/Lighting.tsx
import {DefaultLight} from 'react-native-filament';
import {useCallback} from 'react';
import {useSharedValue} from 'react-native-worklets-core';

export function KitchenLighting() {
  // Horror lighting: dim ambient + flickering point lights
  // DefaultLight provides basic illumination
  // TODO: Add point lights with flicker animation once Entity API is understood
  return <DefaultLight />;
}
```

- [ ] **Step 2: Create Kitchen.tsx**

Load kitchen GLB model (94 GLBs available in `public/models/`). Start with the room enclosure:

```tsx
// src/scene/Kitchen.tsx
import {Model} from 'react-native-filament';

// Kitchen furniture GLBs
const KITCHEN_MODELS = [
  {source: require('../../public/models/workplan.glb'), position: [0, 0, -2] as const},
  {source: require('../../public/models/kitchen_oven_large.glb'), position: [2, 0, -2] as const},
  {source: require('../../public/models/fridge.glb'), position: [-2, 0, -2] as const},
];

export function Kitchen() {
  return (
    <>
      {KITCHEN_MODELS.map((m, i) => (
        <Model key={i} source={m.source} translate={m.position} />
      ))}
    </>
  );
}
```

- [ ] **Step 3: Wire into Scene.tsx**

```tsx
import {Kitchen} from './Kitchen';
import {KitchenLighting} from './Lighting';

// Inside FilamentView:
<KitchenLighting />
<Kitchen />
```

- [ ] **Step 4: Add physics world with floor collider**

```tsx
// In Scene.tsx
import {useWorld, useRigidBody, useStaticPlaneShape} from 'react-native-filament';

// Inside GameScene component:
const world = useWorld([0, -9.8, 0]);
const floorShape = useStaticPlaneShape([0, 1, 0], 0);
const floor = useRigidBody({id: 'floor', mass: 0, shape: floorShape, world});
```

- [ ] **Step 5: Rebuild and verify on simulator**

```bash
npx expo run:ios
```

Take Maestro screenshot. Should see kitchen furniture models in the scene.

- [ ] **Step 6: Commit**

```bash
git add src/scene/Kitchen.tsx src/scene/Lighting.tsx src/scene/Scene.tsx
git commit -m "feat: kitchen environment with GLB models + physics floor"
```

---

## Chunk 3: Phase 3 — Player + Movement

### Task 8: Create player capsule with Bullet physics

**Files:**
- Create: `src/scene/PlayerCapsule.tsx`

- [ ] **Step 1: Create PlayerCapsule.tsx**

```tsx
// src/scene/PlayerCapsule.tsx
import {useCylinderShape, useRigidBody} from 'react-native-filament';
import type {DiscreteDynamicWorld} from 'react-native-filament';
import playerConfig from '../config/player.json';

const SPAWN = playerConfig.capsule.spawnPosition as [number, number, number];

interface PlayerCapsuleProps {
  world: DiscreteDynamicWorld;
}

export function usePlayerCapsule(world: DiscreteDynamicWorld) {
  const shape = useCylinderShape(
    playerConfig.capsule.radius,
    playerConfig.capsule.height,
  );

  const body = useRigidBody({
    id: 'player',
    mass: 70,
    shape,
    world,
    transform: SPAWN,
    damping: [0.95, 0.95],
  });

  return body;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scene/PlayerCapsule.tsx
git commit -m "feat: player capsule with Bullet physics body"
```

### Task 9: Create FPS camera

**Files:**
- Create: `src/scene/FPSCamera.tsx`

- [ ] **Step 1: Create FPSCamera.tsx**

```tsx
// src/scene/FPSCamera.tsx
import {Camera} from 'react-native-filament';
import {useCallback, useRef} from 'react';
import {useSharedValue} from 'react-native-worklets-core';
import type {RenderCallback} from 'react-native-filament';
import playerConfig from '../config/player.json';

const EYE_HEIGHT = playerConfig.capsule.eyeHeight;

export function useFPSCamera() {
  const yaw = useSharedValue(0);
  const pitch = useSharedValue(-0.05);
  const playerPos = useSharedValue<[number, number, number]>([0, 2, 2]);

  const updateCamera: RenderCallback = useCallback(() => {
    'worklet';
    // Camera position = player position + eye height
    // Look direction = yaw/pitch applied
    // This gets called in the FilamentView renderCallback
  }, [yaw, pitch, playerPos]);

  return {yaw, pitch, playerPos, updateCamera};
}

export function FPSCameraComponent({
  cameraManipulator,
}: {
  cameraManipulator?: any;
}) {
  // Use direct camera positioning for FPS (not orbit manipulator)
  return <Camera />;
}
```

- [ ] **Step 2: Wire touch input to yaw/pitch**

Use react-native-gesture-handler Pan gesture over the FilamentView:

```tsx
// In Scene.tsx, wrap FilamentView with GestureDetector:
import {Gesture, GestureDetector} from 'react-native-gesture-handler';

const lookGesture = Gesture.Pan()
  .onUpdate((e) => {
    yaw.value -= e.changeX * 0.002;
    pitch.value = Math.max(-1.4, Math.min(1.4, pitch.value - e.changeY * 0.002));
  });
```

- [ ] **Step 3: Wire WASD/touch movement to player body velocity**

Read InputManager frame, apply velocity to Bullet rigid body in render callback.

- [ ] **Step 4: Rebuild and verify**

```bash
npx expo run:ios
```

Verify with Maestro: player can look around (gesture on right side), move (gesture on left side or keyboard in simulator).

- [ ] **Step 5: Commit**

```bash
git add src/scene/FPSCamera.tsx src/scene/Scene.tsx
git commit -m "feat: FPS camera with gesture-based look + player movement"
```

### Task 10: Intro sequence (eyelid blink)

**Files:**
- Create: `src/scene/IntroSequence.tsx`

- [ ] **Step 1: Create IntroSequence.tsx**

Filament equivalent of the eyelid blink: two dark planes attached to camera that animate open over 7 seconds.

```tsx
// src/scene/IntroSequence.tsx
// Two opaque planes covering the viewport, animated via shared values
// Phase 0: eyes closed (0-2s)
// Phase 1: blinks (2-7s) — planes move apart with pauses
// Phase 2: eyes open, planes removed
```

Implementation uses Filament planes with opacity animation, or simply a React Native overlay `<View>` with animated opacity (since eyelids are 2D black rectangles, not 3D content).

- [ ] **Step 2: Commit**

```bash
git add src/scene/IntroSequence.tsx
git commit -m "feat: intro blink/wake-up sequence for Filament"
```

---

## Chunk 4: Phase 4 — Stations

### Task 11: Create station component pattern

**Files:**
- Create: `src/scene/stations/StationBase.tsx`

- [ ] **Step 1: Define the station component pattern**

Each station: GLB model + Bullet collider + interaction handler + Koota state read/write.

```tsx
// src/scene/stations/StationBase.tsx
import {Model, useRigidBody, useBoxShape} from 'react-native-filament';
import type {DiscreteDynamicWorld} from 'react-native-filament';

interface StationProps {
  id: string;
  source: any; // require('./model.glb')
  position: [number, number, number];
  colliderSize: [number, number, number];
  world: DiscreteDynamicWorld;
}

export function Station({id, source, position, colliderSize, world}: StationProps) {
  const shape = useBoxShape(colliderSize);
  const body = useRigidBody({id, mass: 0, shape, world, transform: position});

  return <Model source={source} translate={position} />;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/scene/stations/StationBase.tsx
git commit -m "feat: station base component pattern (GLB + Bullet collider)"
```

### Task 12-19: Create each station component

One task per station. Each follows the same pattern but adds station-specific interaction logic (grind, stuff, cook, etc.) wired to Koota ECS actions.

**Files per station:**
- Create: `src/scene/stations/Grinder.tsx`
- Create: `src/scene/stations/Stuffer.tsx`
- Create: `src/scene/stations/Stove.tsx`
- Create: `src/scene/stations/ChoppingBlock.tsx`
- Create: `src/scene/stations/BlowoutStation.tsx`
- Create: `src/scene/stations/Sink.tsx`
- Create: `src/scene/stations/ChestFreezer.tsx`
- Create: `src/scene/stations/TV.tsx`

For each station:

- [ ] **Step 1: Create the component file**

Use StationBase for the model + collider, add interaction-specific logic. Read/write Koota via `useGameStore` hooks. Use gesture handlers for drag interactions (grinder plunger, stove dials, etc.).

- [ ] **Step 2: Wire into Scene.tsx**

Add the station component inside FilamentView with its world-space position.

- [ ] **Step 3: Verify on simulator**

Station model visible, interaction works (tap/drag), game phase advances.

- [ ] **Step 4: Commit each station individually**

```bash
git add src/scene/stations/Grinder.tsx src/scene/Scene.tsx
git commit -m "feat: Grinder station (Filament + Bullet + Koota)"
```

Repeat for all 8 stations.

---

## Chunk 5: Phases 5-8 — Feedback, Audio, Sausage, E2E

### Task 20: SurrealText diegetic feedback

**Files:**
- Create: `src/scene/SurrealText.tsx`

- [ ] **Step 1: Implement texture-based text rendering**

Create a system that renders text to an offscreen bitmap (via React Native's `<Canvas>` from Skia or a simple image generator), then applies it as a texture to a Filament plane positioned on kitchen surfaces.

Fallback: transparent React Native `<Text>` overlay positioned at screen-space coordinates matching 3D positions. Not perfectly diegetic but functional.

- [ ] **Step 2: Wire game state to text content**

Read from Koota ECS: gamePhase, demands, strikes, score, dialogue. Render appropriate text on surfaces (ceiling, back wall, counter, freezer wall).

- [ ] **Step 3: Commit**

```bash
git add src/scene/SurrealText.tsx
git commit -m "feat: diegetic SurrealText feedback via texture planes on surfaces"
```

### Task 21: Mr. Sausage character

**Files:**
- Create: `src/scene/MrSausage.tsx`

- [ ] **Step 1: Create procedural character or load GLB**

If a MrSausage GLB model exists, load it. Otherwise, create from Filament primitives (spheres, cylinders). Wire reaction animations to Koota mrSausageReaction trait.

- [ ] **Step 2: Commit**

```bash
git add src/scene/MrSausage.tsx
git commit -m "feat: Mr. Sausage character with reaction animations"
```

### Task 22: Audio engine (expo-audio)

**Files:**
- Create: `src/audio/AudioEngine.ts`

- [ ] **Step 1: Write AudioEngine with expo-audio**

```tsx
// src/audio/AudioEngine.ts
import {Audio} from 'expo-audio';

export type SoundId = 'chop' | 'grind' | 'squelch' | 'sizzle' | 'pressure' | 'burst' | 'tie' | 'strike' | 'success' | 'error' | 'click' | 'phaseAdvance' | 'rankReveal' | 'ambient';

const SOUND_MAP: Partial<Record<SoundId, any>> = {
  chop: require('../../public/audio/chop_1.ogg'),
  sizzle: require('../../public/audio/sizzle_1.ogg'),
  // ... map all 14 sound IDs to OGG assets
};

class AudioEngineImpl {
  private _initialized = false;
  private muted = false;
  private sfxVolume = 0.8;

  get initialized() { return this._initialized; }

  async initialize() {
    if (this._initialized) return;
    await Audio.setAudioModeAsync({playsInSilentModeIOS: true});
    this._initialized = true;
  }

  async playSound(name: SoundId) {
    if (this.muted || !this._initialized) return;
    const file = SOUND_MAP[name];
    if (!file) return;
    try {
      const {sound} = await Audio.Sound.createAsync(file, {volume: this.sfxVolume});
      await sound.playAsync();
    } catch { /* non-critical */ }
  }

  playChop() { this.playSound('chop'); }
  setSizzleLevel(_n: number) { /* TODO: loop */ }
  setGrinderSpeed(_n: number) { /* TODO: loop */ }
  setAmbientDrone(_active: boolean) { /* TODO: loop */ }
  startAmbient() { this.setAmbientDrone(true); }
  stopAmbient() { this.setAmbientDrone(false); }
  setVolume(_type: string, level: number) { this.sfxVolume = Math.max(0, Math.min(1, level)); }
  setMuted(muted: boolean) { this.muted = muted; }
  isMuted() { return this.muted; }
  dispose() { /* cleanup */ }
}

export const audioEngine = new AudioEngineImpl();
```

- [ ] **Step 2: Commit**

```bash
git add src/audio/AudioEngine.ts
git commit -m "feat: AudioEngine with expo-audio (native, no Web Audio API)"
```

### Task 23: op-sqlite persistence

**Files:**
- Rewrite: `src/db/client.ts`
- Modify: `src/db/drizzleQueries.ts`
- Modify: `drizzle.config.ts`
- Modify: `babel.config.js`
- Modify: `metro.config.js`

- [ ] **Step 1: Rewrite client.ts**

```tsx
import {open} from '@op-engineering/op-sqlite';
import {drizzle} from 'drizzle-orm/op-sqlite';
import * as schema from './schema';

const opsqliteDb = open({name: 'willitblow.db'});
export const db = drizzle(opsqliteDb, {schema});
```

- [ ] **Step 2: Simplify drizzleQueries.ts** — remove all try/catch getDb() wrappers

- [ ] **Step 3: Update drizzle.config.ts** — remove `driver: 'expo'`

- [ ] **Step 4: Update babel.config.js** — add inline-import for .sql

- [ ] **Step 5: Update metro.config.js** — add 'sql' to sourceExts

- [ ] **Step 6: Run drizzle-kit generate**

```bash
npx drizzle-kit generate
```

- [ ] **Step 7: Commit**

```bash
git add src/db/ drizzle.config.ts babel.config.js metro.config.js
git commit -m "feat: op-sqlite + Drizzle persistence (native, no WASM)"
```

### Task 24: Sausage bone-chain physics

**Files:**
- Create: `src/scene/sausage/Sausage.tsx`

- [ ] **Step 1: Create sausage with Bullet constraints**

Use Bullet rigid bodies connected by constraints to simulate the bone chain. Each segment is a sphere body, connected to neighbors by point-to-point or hinge constraints.

- [ ] **Step 2: Wire extrusion animation**

When game phase transitions through grinder → stuffer, animate sausage segments appearing.

- [ ] **Step 3: Commit**

```bash
git add src/scene/sausage/
git commit -m "feat: sausage bone-chain physics with Bullet constraints"
```

### Task 25: Maestro E2E setup

**Files:**
- Create: `.maestro/config.yaml`
- Create: `.maestro/flows/01-title-screen.yaml`
- Create: `.maestro/flows/02-difficulty.yaml`
- Create: `.maestro/flows/12-full-round.yaml`

- [ ] **Step 1: Install Maestro**

```bash
brew install maestro
```

- [ ] **Step 2: Create config + flows**

```yaml
# .maestro/config.yaml
appId: com.jbcom.willitblow
```

```yaml
# .maestro/flows/01-title-screen.yaml
appId: com.jbcom.willitblow
---
- launchApp:
    clearState: true
- assertVisible: "WILL IT"
- assertVisible: "BLOW"
- assertVisible: "START COOKING"
```

- [ ] **Step 3: Run on simulator**

```bash
maestro test .maestro/flows/01-title-screen.yaml
```

- [ ] **Step 4: Commit**

```bash
git add .maestro/
git commit -m "feat: Maestro E2E test flows"
```

### Task 26: Strip app.json + final config

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Update app.json for native-only**

```json
{
  "expo": {
    "name": "WillItBlow",
    "slug": "will-it-blow",
    "version": "0.1.0",
    "platforms": ["ios", "android"],
    "android": {"package": "com.jbcom.willitblow"},
    "plugins": ["expo-asset"]
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app.json
git commit -m "config: native-only app.json, remove web platform"
```

### Task 27: Full device playtest

- [ ] **Step 1: Build for real device**

```bash
npx expo run:ios --device
```

- [ ] **Step 2: Play full round**

Walk around → freezer → chop → grind → stuff → tie → cook → verdict. Document issues.

- [ ] **Step 3: Run Maestro**

```bash
maestro test .maestro/flows/12-full-round.yaml
```

- [ ] **Step 4: Fix issues, commit individually**

- [ ] **Step 5: Final milestone commit**

```bash
git commit --allow-empty -m "milestone: Filament migration complete — full round playable on device"
```
