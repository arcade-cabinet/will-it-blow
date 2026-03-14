# Native-First Pivot Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Pivot Will It Blow? from web-first to native-first by eliminating browser workarounds, swapping to native SQLite (op-sqlite), rewriting audio for expo-audio, replacing Playwright with Maestro, and validating physics on native iOS.

**Architecture:** R3F + Three.js WebGPU via react-native-wgpu (Metal/Vulkan) → Koota ECS for all state → op-sqlite + Drizzle for persistence → @react-three/rapier for physics (validate on native first, Filament fallback if fails) → expo-audio for sound → Maestro for E2E testing.

**Tech Stack:** React Native 0.83, Expo SDK 55, React Three Fiber 9.5, Three.js 0.183 WebGPU, Koota ECS, op-sqlite, Drizzle ORM, expo-audio, Maestro, Biome 2.4

**Spec:** `docs/superpowers/specs/2026-03-13-native-first-pivot-design.md`

---

## Chunk 1: Phase 0 — Validate Physics on Native

This chunk determines the entire path forward. If `@react-three/rapier` works on iOS native, we keep it. If not, we pivot to react-native-filament (separate spec required).

### Task 1: Fix Sausage.tsx direct WASM require

The `Sausage.tsx` component bypasses the R3F Physics context and directly requires `@dimforge/rapier3d-compat`. This must be fixed regardless of which path we take.

**Files:**
- Modify: `src/components/sausage/Sausage.tsx:94`

- [ ] **Step 1: Read the current Rapier usage in Sausage.tsx**

Find line 94: `const RAPIER = (window as any).RAPIER || require('@dimforge/rapier3d-compat');`
This bypasses the `<Physics>` context and directly loads the WASM module.

- [ ] **Step 2: Replace direct require with useRapier() hook**

Import `useRapier` from `@react-three/rapier` and use it to access the initialized RAPIER module:

```tsx
// At component level (not inside useEffect):
import { useRapier } from '@react-three/rapier';

// Inside the component function, before the useEffect:
const { rapier: RAPIER, world } = useRapier();
```

Then in the useEffect body, remove line 94 entirely — `RAPIER` is already available from the hook.

**Important:** `useRapier()` can only be called inside a component that is a child of `<Physics>`. `Sausage` is rendered inside `<Physics>` in App.tsx, so this works.

- [ ] **Step 3: Remove the @dimforge/rapier3d-compat fallback check**

In the same useEffect, remove the early return that checked if RAPIER.RigidBodyDesc exists — the `useRapier()` hook guarantees the module is initialized.

- [ ] **Step 4: Run tests**

Run: `npx jest --no-watchman -- Sausage`
Expected: existing tests still pass (Sausage tests mock rapier)

- [ ] **Step 5: Commit**

```bash
git add src/components/sausage/Sausage.tsx
git commit -m "fix: use useRapier() context in Sausage.tsx instead of direct WASM require"
```

### Task 2: Build and test on iOS simulator

**Files:**
- No code changes — build verification only

- [ ] **Step 1: Ensure Xcode and iOS simulator are available**

Run: `xcode-select -p`
Expected: prints Xcode path (e.g., `/Applications/Xcode.app/Contents/Developer`)

- [ ] **Step 2: Build and run on iOS simulator**

Run: `npx expo run:ios --no-install`
Expected: Expo builds the native app and launches iOS simulator.

Watch for:
- Rapier WASM initialization (should NOT get `rawshape_ball` error)
- Three.js WebGPU renderer initializing via react-native-wgpu
- Canvas rendering (black background, kitchen scene)

- [ ] **Step 3: Verify title screen renders**

On the simulator, verify:
- "WILL IT BLOW?" title text visible
- "START COOKING" button visible
- "SETTINGS" button visible

- [ ] **Step 4: Verify 3D scene loads after selecting difficulty**

Tap "START COOKING" → tap "Medium" → verify:
- Canvas appears with 3D kitchen
- No crash (the Rapier WASM race that killed the web canvas)
- Intro blink sequence plays (black eyelids opening)

- [ ] **Step 5: Document result**

If physics works: create file `docs/phase0-result.md` with "PASS — @react-three/rapier works on native iOS. Proceeding with current stack."

If physics fails: create file `docs/phase0-result.md` with "FAIL — @react-three/rapier crashes on native. Pivot to react-native-filament required." **STOP HERE** and notify the user. A new spec is needed.

- [ ] **Step 6: Commit**

```bash
git add docs/phase0-result.md
git commit -m "docs: Phase 0 result — physics validation on native iOS"
```

---

## Chunk 2: Phase 1 — The Chainsaw (Delete + Swap Dependencies)

**PREREQUISITE:** Phase 0 must PASS before starting this chunk.

### Task 3: Delete web-only files and their tests

**Files:**
- Delete: 18 source files + 15 test files + 2 config files + 1 directory

- [ ] **Step 1: Delete Playwright infrastructure**

```bash
rm -rf e2e/
rm -f playwright.config.ts
```

- [ ] **Step 2: Delete browser workaround files**

```bash
rm -f public/coi-serviceworker.js
rm -f src/engine/AudioEngine.web.ts
rm -f src/engine/assetUrl.ts
```

- [ ] **Step 3: Delete 2D overlay components (Phase 1 batch — NOT DialogueOverlay)**

```bash
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
rm -f src/components/controls/SwipeFPSControls.tsx
```

- [ ] **Step 4: Delete tests for deleted files**

```bash
rm -f src/components/ui/__tests__/GameOverScreen.test.tsx
rm -f src/components/ui/__tests__/LoadingScreen.test.tsx
rm -f src/components/ui/__tests__/SettingsScreen.test.tsx
rm -f src/components/ui/__tests__/ChallengeHeader.test.tsx
rm -f src/components/ui/__tests__/StrikeCounter.test.tsx
rm -f src/components/ui/__tests__/ProgressGauge.test.tsx
rm -f src/components/ui/__tests__/RoundTransition.test.tsx
rm -f src/components/ui/__tests__/GrindingHUD.test.tsx
rm -f src/components/ui/__tests__/StuffingHUD.test.tsx
rm -f src/components/ui/__tests__/CookingHUD.test.tsx
rm -f src/components/ui/__tests__/BlowoutHUD.test.tsx
rm -f src/components/ui/__tests__/IngredientChallenge.test.tsx
rm -f src/components/ui/__tests__/TastingChallenge.test.tsx
rm -f src/components/challenges/__tests__/TieGesture.test.tsx
rm -f src/engine/__tests__/assetUrl.test.ts
```

- [ ] **Step 5: Commit the deletions**

```bash
git add -A
git commit -m "chainsaw: delete 18 web-only source files + 15 test files + Playwright"
```

### Task 4: Remove dead packages

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Remove packages**

```bash
pnpm remove @dimforge/rapier3d-compat @use-gesture/react expo-sqlite expo-gl @playwright/test @playwright/experimental-ct-react tone zustand miniplex miniplex-react
```

- [ ] **Step 2: Add native packages**

```bash
pnpm add @op-engineering/op-sqlite
pnpm add -D babel-plugin-inline-import
```

- [ ] **Step 3: Verify install succeeded**

Run: `ls node_modules/@op-engineering/op-sqlite/package.json`
Expected: file exists

- [ ] **Step 4: Commit**

```bash
git add package.json pnpm-lock.yaml
git commit -m "deps: remove 10 web/WASM packages, add op-sqlite + babel-plugin-inline-import"
```

### Task 5: Clean up App.tsx imports of deleted files

**Files:**
- Modify: `App.tsx`

- [ ] **Step 1: Remove imports for deleted components**

Remove these import lines from App.tsx:
```
import {SwipeFPSControls} from './src/components/controls/SwipeFPSControls';
```

Also remove the `usePersistence` import (will be rewritten for op-sqlite later):
```
import {usePersistence} from './src/db/usePersistence';
```

- [ ] **Step 2: Remove SwipeFPSControls usage from UILayer**

In the `UILayer` function, find and remove the SwipeFPSControls JSX block (around lines 178-187). Remove the `setJoystick`, `addLookDelta`, `triggerInteract` store reads and the joystickRef/syncJoystick useEffect that powered it.

- [ ] **Step 3: Remove usePersistence() call**

In the `App` component, remove the `usePersistence()` call.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `pnpm typecheck`
Expected: may have errors from `@use-gesture/react` in station files — that's expected and fixed in Task 6.

- [ ] **Step 5: Commit**

```bash
git add App.tsx
git commit -m "fix: remove deleted component imports from App.tsx"
```

### Task 6: Replace useDrag with R3F pointer events in 5 station components

**Files:**
- Modify: `src/components/stations/Grinder.tsx`
- Modify: `src/components/stations/Stuffer.tsx`
- Modify: `src/components/stations/Stove.tsx`
- Modify: `src/components/stations/ChoppingBlock.tsx`
- Modify: `src/components/stations/PhysicsFreezerChest.tsx`

- [ ] **Step 1: Replace useDrag in Grinder.tsx**

Remove `import {useDrag} from '@use-gesture/react'`. Replace the `useDrag` call with `useRef`-based pointer tracking:

```tsx
const isDragging = useRef(false);
const dragStartY = useRef(0);

const handlePlungerDown = (e: any) => {
  isDragging.current = true;
  dragStartY.current = e.point?.y ?? 0;
};
const handlePlungerMove = (e: any) => {
  if (!isDragging.current) return;
  // ... existing drag logic with e.point instead of offset
};
const handlePlungerUp = () => { isDragging.current = false; };
```

Replace `{...bindPlunger()}` spread with `onPointerDown/Move/Up/Leave` props.

- [ ] **Step 2: Replace useDrag in Stuffer.tsx (2 useDrag calls: crank + casing)**

Same pattern as Grinder. Two separate drag handlers for crank and casing.

- [ ] **Step 3: Replace useDrag in Stove.tsx (3 useDrag calls: pan + 2 dials)**

Same pattern. Three separate drag handlers.

- [ ] **Step 4: Replace useDrag in ChoppingBlock.tsx (swipe detection)**

Replace swipe-based useDrag with pointer start/end tracking + threshold for swipe direction.

- [ ] **Step 5: Replace useDrag in PhysicsFreezerChest.tsx (ingredient drag)**

Same pointer event pattern.

- [ ] **Step 6: Verify typecheck is clean**

Run: `pnpm typecheck`
Expected: 0 errors (all @use-gesture/react imports removed)

- [ ] **Step 7: Run tests**

Run: `npx jest --no-watchman`
Expected: remaining tests pass (deleted test files won't run)

- [ ] **Step 8: Commit**

```bash
git add src/components/stations/
git commit -m "fix: replace useDrag with R3F pointer events in all 5 station components"
```

### Task 7: Rewrite db/client.ts for op-sqlite

**Files:**
- Modify: `src/db/client.ts`
- Modify: `drizzle.config.ts`
- Modify: `babel.config.js`
- Modify: `metro.config.js`

- [ ] **Step 1: Update drizzle.config.ts**

```typescript
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/db/schema.ts',
  out: './src/db/migrations',
  dialect: 'sqlite',
} satisfies Config;
```

- [ ] **Step 2: Run drizzle-kit generate to create migration files**

Run: `npx drizzle-kit generate`
Expected: creates `src/db/migrations/` with SQL files

- [ ] **Step 3: Add babel-plugin-inline-import for .sql files**

In `babel.config.js`, add:
```javascript
plugins: [
  ["inline-import", { "extensions": [".sql"] }]
]
```

- [ ] **Step 4: Add sql to Metro sourceExts**

In `metro.config.js`, add to the resolver:
```javascript
config.resolver.sourceExts.push('sql');
```

Also remove the COEP/COOP middleware (the `config.server.enhanceMiddleware` block).

- [ ] **Step 5: Rewrite db/client.ts for op-sqlite**

```typescript
import { open } from '@op-engineering/op-sqlite';
import { drizzle } from 'drizzle-orm/op-sqlite';
import * as schema from './schema';

const opsqliteDb = open({ name: 'willitblow.db' });
export const db = drizzle(opsqliteDb, { schema });
```

- [ ] **Step 6: Update drizzleQueries.ts**

Replace all `try { db = getDb() } catch { return null; }` patterns with direct `db` import:
```typescript
import { db } from './client';
```

Remove all try/catch getDb() wrappers — on native, SQLite just works.

- [ ] **Step 7: Update db tests**

Rewrite `src/db/__tests__/client.test.ts` and `src/db/__tests__/drizzleQueries.test.ts` to test against the new API. Mock `@op-engineering/op-sqlite` for unit tests.

- [ ] **Step 8: Run tests**

Run: `npx jest --no-watchman`
Expected: all tests pass

- [ ] **Step 9: Commit**

```bash
git add src/db/ drizzle.config.ts babel.config.js metro.config.js
git commit -m "feat: swap expo-sqlite for op-sqlite with Drizzle migrations"
```

### Task 8: Strip app.json of web config

**Files:**
- Modify: `app.json`

- [ ] **Step 1: Remove web-specific config**

Remove `"web"` section and `"experiments"` section from `app.json`:

```json
{
  "expo": {
    "name": "WillItBlow",
    "slug": "will-it-blow",
    "version": "0.0.1",
    "platforms": ["ios", "android"],
    "android": {
      "package": "com.jbcom.willitblow"
    },
    "plugins": ["expo-asset"]
  }
}
```

Note: removed `expo-sqlite` from plugins (no longer a dep) and removed `web` from platforms.

- [ ] **Step 2: Commit**

```bash
git add app.json
git commit -m "config: strip web config from app.json, native-only platforms"
```

### Task 9: Verify full build after chainsaw

- [ ] **Step 1: Run typecheck**

Run: `pnpm typecheck`
Expected: 0 errors

- [ ] **Step 2: Run lint**

Run: `pnpm lint`
Expected: 0 errors (run `pnpm format` first if needed)

- [ ] **Step 3: Run tests**

Run: `npx jest --no-watchman`
Expected: all remaining tests pass (count will be lower than 452 since we deleted test files)

- [ ] **Step 4: Build for iOS**

Run: `npx expo run:ios --no-install`
Expected: builds and launches on simulator

- [ ] **Step 5: Commit verification**

```bash
git commit --allow-empty -m "verify: Phase 1 chainsaw complete — typecheck clean, tests pass, iOS builds"
```

---

## Chunk 3: Phase 2 — Native Audio

### Task 10: Rewrite AudioEngine.ts for expo-audio

**Files:**
- Rewrite: `src/engine/AudioEngine.ts`
- Test: `src/engine/__tests__/AudioEngine.test.ts`

- [ ] **Step 1: Read current AudioEngine.ts to understand the API surface**

The current file is 300 lines of Web Audio API (`AudioContext`, oscillators, gain nodes). `AudioContext` does NOT exist in React Native runtime. This needs a full rewrite using `expo-audio`.

Key API methods to preserve:
- `initialize()` / `initialized` getter
- `playSound(name: SoundId)` — 14 sound IDs
- `playChop()`, `setSizzleLevel(n)`, `setGrinderSpeed(n)`, `setAmbientDrone(bool)`
- `setVolume(type, level)`, `setMuted(bool)`, `startAmbient()`, `stopAmbient()`
- `dispose()`

- [ ] **Step 2: Write the test first**

Update `src/engine/__tests__/AudioEngine.test.ts`:

```typescript
import { describe, expect, it, jest } from '@jest/globals';

// Mock expo-audio
jest.mock('expo-audio', () => ({
  Audio: {
    Sound: {
      createAsync: jest.fn().mockResolvedValue({ sound: { playAsync: jest.fn(), stopAsync: jest.fn(), unloadAsync: jest.fn(), setVolumeAsync: jest.fn() } }),
    },
    setAudioModeAsync: jest.fn(),
  },
}));

import { audioEngine } from '../AudioEngine';

describe('AudioEngine (expo-audio)', () => {
  it('exports audioEngine singleton', () => {
    expect(audioEngine).toBeDefined();
  });
  it('has initialize method', () => {
    expect(typeof audioEngine.initialize).toBe('function');
  });
  it('has playSound method', () => {
    expect(typeof audioEngine.playSound).toBe('function');
  });
  it('has playChop method', () => {
    expect(typeof audioEngine.playChop).toBe('function');
  });
  it('has setVolume method', () => {
    expect(typeof audioEngine.setVolume).toBe('function');
  });
  it('has dispose method', () => {
    expect(typeof audioEngine.dispose).toBe('function');
  });
  it('methods do not throw', async () => {
    await audioEngine.initialize();
    expect(() => audioEngine.playChop()).not.toThrow();
    expect(() => audioEngine.setVolume('sfx', 0.5)).not.toThrow();
    expect(() => audioEngine.setMuted(true)).not.toThrow();
    expect(() => audioEngine.startAmbient()).not.toThrow();
    expect(() => audioEngine.stopAmbient()).not.toThrow();
    expect(() => audioEngine.dispose()).not.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx jest --no-watchman -- AudioEngine`
Expected: FAIL (current AudioEngine uses AudioContext not expo-audio)

- [ ] **Step 4: Rewrite AudioEngine.ts with expo-audio**

```typescript
import { Audio } from 'expo-audio';

export type SoundId = 'chop' | 'grind' | 'squelch' | 'sizzle' | 'pressure' | 'burst' | 'tie' | 'strike' | 'success' | 'error' | 'click' | 'phaseAdvance' | 'rankReveal' | 'ambient';

const SOUND_FILES: Partial<Record<SoundId, any>> = {
  chop: require('../../assets/audio/chop_1.ogg'),
  // Map remaining sounds to asset requires
};

class AudioEngineImpl {
  private _initialized = false;
  private sounds: Map<string, Audio.Sound> = new Map();
  private muted = false;
  private sfxVolume = 0.8;

  get initialized() { return this._initialized; }

  async initialize() {
    if (this._initialized) return;
    await Audio.setAudioModeAsync({ playsInSilentModeIOS: true });
    this._initialized = true;
  }

  async playSound(name: SoundId) {
    if (this.muted || !this._initialized) return;
    const file = SOUND_FILES[name];
    if (!file) return;
    try {
      const { sound } = await Audio.Sound.createAsync(file, { volume: this.sfxVolume });
      await sound.playAsync();
      // Auto-cleanup after playback
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) sound.unloadAsync();
      });
    } catch { /* non-critical */ }
  }

  playChop() { this.playSound('chop'); }
  setSizzleLevel(_level: number) { /* TODO: loop sizzle sample */ }
  setGrinderSpeed(_speed: number) { /* TODO: loop grind sample */ }
  setAmbientDrone(_active: boolean) { /* TODO: ambient loop */ }
  startAmbient() { this.setAmbientDrone(true); }
  stopAmbient() { this.setAmbientDrone(false); }
  setVolume(_type: string, level: number) { this.sfxVolume = Math.max(0, Math.min(1, level)); }
  setMuted(muted: boolean) { this.muted = muted; }
  isMuted() { return this.muted; }
  dispose() { this.sounds.forEach(s => s.unloadAsync()); this.sounds.clear(); }
}

export const audioEngine = new AudioEngineImpl();
```

**Note:** This is a working foundation. Looping samples (sizzle, grind, ambient) need a pooled approach — load once, play/pause as needed. That's a refinement, not a blocker.

- [ ] **Step 5: Run tests**

Run: `npx jest --no-watchman -- AudioEngine`
Expected: PASS

- [ ] **Step 6: Also update the Jest mock**

Update `__mocks__/AudioEngine.js` to match the new API if needed.

- [ ] **Step 7: Commit**

```bash
git add src/engine/AudioEngine.ts src/engine/__tests__/AudioEngine.test.ts __mocks__/AudioEngine.js
git commit -m "feat: rewrite AudioEngine for expo-audio (native, no AudioContext)"
```

---

## Chunk 4: Phase 3 — UI Rebuild + Phase 4 — Diegetic Dialogue

### Task 11: Port TouchLookZone from grovekeeper

**Files:**
- Create: `src/player/TouchLookZone.tsx`
- Source: `/Users/jbogaty/src/arcade-cabinet/grovekeeper/components/player/TouchLookZone.tsx`

- [ ] **Step 1: Copy and adapt from grovekeeper**

Copy the file, update imports from `@/` paths to relative paths, update config imports to use `src/config/player.json`.

- [ ] **Step 2: Wire into App.tsx**

Add `<TouchLookZone>` as a React Native overlay (this is an INPUT overlay, not a HUD — it's invisible).

- [ ] **Step 3: Test on simulator**

Verify: touch left side = movement, touch right side = look. No visible joystick.

- [ ] **Step 4: Commit**

```bash
git add src/player/TouchLookZone.tsx App.tsx
git commit -m "feat: port invisible TouchLookZone from grovekeeper for mobile FPS"
```

### Task 12: Rebuild TitleScreen + DifficultySelector with React Native Reusables

**Files:**
- Modify: `src/components/ui/TitleScreen.tsx`
- Modify: `src/components/ui/DifficultySelector.tsx`

- [ ] **Step 1: Install React Native Reusables**

Follow setup from https://reactnativereusables.com — install core package and required peer deps.

- [ ] **Step 2: Rebuild TitleScreen using Reusables components**

Replace inline `StyleSheet.create` styles with Reusables' themed components. Keep the same visual design (butcher shop sign, gold/blood-red palette).

- [ ] **Step 3: Rebuild DifficultySelector using Reusables**

Same approach — Reusables buttons and layout.

- [ ] **Step 4: Test on simulator**

Verify: title screen renders, START COOKING works, difficulty selection works.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/TitleScreen.tsx src/components/ui/DifficultySelector.tsx package.json
git commit -m "feat: rebuild TitleScreen + DifficultySelector with React Native Reusables"
```

### Task 13: Extend SurrealText for dialogue (blood text on walls)

**Files:**
- Modify: `src/components/environment/SurrealText.tsx`

- [ ] **Step 1: Add SURFACES map for positioned text**

```typescript
export const SURFACES = {
  ceiling: { position: [0, 2.99, 0], rotation: [Math.PI/2, 0, 0] },
  backWall: { position: [0, 1.5, -3.98], rotation: [0, 0, 0] },
  leftWall: { position: [-2.98, 1.5, 0], rotation: [0, Math.PI/2, 0] },
  rightWall: { position: [2.98, 1.5, 0], rotation: [0, -Math.PI/2, 0] },
  counter: { position: [1.5, 0.46, 0], rotation: [-Math.PI/2, 0, 0] },
  freezerWall: { position: [-2.5, 2, -2], rotation: [0, Math.PI/4, 0] },
};
```

- [ ] **Step 2: Add dialogue rendering on back wall**

Read dialogue state from Koota. When dialogue line changes, render as new SurrealMessage on backWall surface. Add drip/melt animation on dismiss.

- [ ] **Step 3: Add tappable 3D text for dialogue choices**

When dialogue line has choices, render each choice as a separate `<Text>` on the wall with `onClick` handler that calls `selectChoice(index)`.

- [ ] **Step 4: Add strike marks on counter**

Read strike count from Koota. Render "✕" characters on counter surface.

- [ ] **Step 5: Add verdict display on far wall**

When gamePhase === 'DONE', render rank letter (S/A/B/F) huge on backWall with rank-specific color.

- [ ] **Step 6: Test**

Run: `npx jest --no-watchman`
Verify on simulator: dialogue text appears on wall, choices tappable.

- [ ] **Step 7: Commit**

```bash
git add src/components/environment/SurrealText.tsx
git commit -m "feat: extend SurrealText with SURFACES, dialogue, strikes, verdict (fully diegetic)"
```

### Task 14: Delete DialogueOverlay and TieGesture

**Files:**
- Delete: `src/components/ui/DialogueOverlay.tsx`
- Delete: `src/components/challenges/TieGesture.tsx`
- Modify: `App.tsx`

**PREREQUISITE:** Task 13 must be complete (SurrealText handles dialogue).

- [ ] **Step 1: Remove DialogueOverlay imports and usage from App.tsx**

Remove import and all JSX references to `<DialogueOverlay>`, `INTRO_DIALOGUE`, `VERDICT_*` constants, `showIntroDialogue` state, and the verdict useMemo.

- [ ] **Step 2: Remove TieGesture import and usage from App.tsx**

Remove import and the TieGesture JSX block. The tie-casing interaction is now a 3D interaction on the station mesh.

- [ ] **Step 3: Delete the files**

```bash
rm -f src/components/ui/DialogueOverlay.tsx
rm -f src/components/challenges/TieGesture.tsx
```

- [ ] **Step 4: Verify typecheck + tests**

Run: `pnpm typecheck && npx jest --no-watchman`
Expected: clean

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: delete DialogueOverlay + TieGesture — dialogue is now diegetic blood text"
```

---

## Chunk 5: Phase 5 — Maestro E2E + Phase 6 — Device Playtest

### Task 15: Set up Maestro

**Files:**
- Create: `.maestro/config.yaml`
- Create: `.maestro/flows/01-title-screen.yaml`
- Create: `.maestro/flows/02-difficulty.yaml`
- Create: `.maestro/flows/12-full-round.yaml`

- [ ] **Step 1: Install Maestro CLI**

```bash
brew install maestro
```

- [ ] **Step 2: Create config**

`.maestro/config.yaml`:
```yaml
appId: com.jbcom.willitblow
```

- [ ] **Step 3: Write title screen flow**

`.maestro/flows/01-title-screen.yaml`:
```yaml
appId: com.jbcom.willitblow
---
- launchApp:
    clearState: true
- assertVisible: "WILL IT"
- assertVisible: "BLOW"
- assertVisible: "START COOKING"
```

- [ ] **Step 4: Write difficulty flow**

`.maestro/flows/02-difficulty.yaml`:
```yaml
appId: com.jbcom.willitblow
---
- launchApp:
    clearState: true
- tapOn: "START COOKING"
- assertVisible: "Medium"
- tapOn: "Medium"
```

- [ ] **Step 5: Write remaining flows (03-12)**

Create YAML flow files for each game phase. Use `tapOn`, `swipe`, `assertVisible`, `screenshot` commands.

- [ ] **Step 6: Run flows on simulator**

```bash
maestro test .maestro/flows/01-title-screen.yaml
maestro test .maestro/flows/02-difficulty.yaml
```

Expected: flows pass

- [ ] **Step 7: Commit**

```bash
git add .maestro/
git commit -m "feat: add Maestro E2E test flows for native testing"
```

### Task 16: Device playtest

- [ ] **Step 1: Build for real iOS device**

Run: `npx expo run:ios --device`

- [ ] **Step 2: Play a full round**

Walk around kitchen → open freezer → pick 3 ingredients → chop → grind → stuff → tie → cook → get verdict. Document any issues.

- [ ] **Step 3: Run Maestro on device**

```bash
maestro test .maestro/flows/12-full-round.yaml
```

- [ ] **Step 4: Fix issues and commit**

Fix whatever breaks during the playtest. Commit each fix individually.

- [ ] **Step 5: Record gameplay video**

Screen record a full round on the device for documentation.

- [ ] **Step 6: Final commit**

```bash
git commit --allow-empty -m "milestone: native-first pivot complete — full round playable on device"
```
