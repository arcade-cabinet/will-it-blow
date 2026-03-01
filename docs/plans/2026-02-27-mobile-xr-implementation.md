<!--
title: Mobile-First + XR/AR Implementation Plan
domain: plan
status: historical
engine: babylon
last-verified: 2026-03-01
depends-on: ["2026-02-27-mobile-xr-design.md"]
agent-context: scene-architect
summary: Task-by-task implementation of input abstraction adapters, haptic service, Havok physics migration, GLB fridge loading, and gyroscope camera for multi-platform support.
-->

# Mobile-First + XR/AR Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Will It Blow into a multi-platform immersive experience with mobile touch, haptics, gyroscope, and XR/AR support — all from one codebase.

**Architecture:** Input Abstraction Layer — adapters (Touch, Gyro, XR, Pointer) normalize to common InputActions, written to Zustand store. Game logic stays input-agnostic. HapticService subscribes to store changes and fires vibration patterns. Havok replaces cannon-es for physics.

**Tech Stack:** React Native 0.83 + Babylon.js 8.53 + reactylon 3.5 + @babylonjs/havok + expo-haptics + expo-sensors + react-native-gesture-handler + Zustand 5

---

## Task 1: Install Dependencies + InputActions Types

**Files:**
- Modify: `package.json` (lines 15-33)
- Create: `src/input/InputActions.ts`
- Create: `src/input/__tests__/InputActions.test.ts`

**Context:** This is the foundation layer. InputActions define the common language all adapters speak. Every input source (touch, gyro, XR controller, mouse) normalizes to these action types before reaching game logic.

**Step 1: Install new packages, remove cannon-es**

```bash
pnpm add @babylonjs/havok expo-haptics expo-sensors react-native-gesture-handler
pnpm remove cannon-es
```

Verify: `pnpm ls @babylonjs/havok expo-haptics expo-sensors react-native-gesture-handler` shows all installed. `pnpm ls cannon-es` shows empty.

**Step 2: Write the failing test**

Create `src/input/__tests__/InputActions.test.ts`:

```typescript
import {
  createGrab,
  createRelease,
  createLook,
  createPress,
  createSwipe,
  createTap,
  type InputAction,
} from '../InputActions';

describe('InputActions', () => {
  it('createGrab returns grab action with meshId', () => {
    const action = createGrab('ingredient_3');
    expect(action).toEqual({ type: 'grab', meshId: 'ingredient_3' });
  });

  it('createRelease returns release action with meshId', () => {
    const action = createRelease('ingredient_3');
    expect(action).toEqual({ type: 'release', meshId: 'ingredient_3' });
  });

  it('createLook returns look action with clamped yaw and pitch', () => {
    const action = createLook(0.5, -0.3);
    expect(action).toEqual({ type: 'look', yaw: 0.5, pitch: -0.3 });
  });

  it('createLook clamps yaw to ±0.52 rad (~30°)', () => {
    const action = createLook(1.5, 0);
    expect(action.yaw).toBeCloseTo(0.52, 2);
    const neg = createLook(-1.5, 0);
    expect(neg.yaw).toBeCloseTo(-0.52, 2);
  });

  it('createLook clamps pitch to ±0.35 rad (~20°)', () => {
    const action = createLook(0, 1.0);
    expect(action.pitch).toBeCloseTo(0.35, 2);
  });

  it('createPress returns press action with force 0-1', () => {
    const action = createPress(0.75);
    expect(action).toEqual({ type: 'press', force: 0.75 });
  });

  it('createPress clamps force to [0, 1]', () => {
    expect(createPress(-0.5).force).toBe(0);
    expect(createPress(1.5).force).toBe(1);
  });

  it('createSwipe returns swipe action with direction and velocity', () => {
    const action = createSwipe('cw', 2.5);
    expect(action).toEqual({ type: 'swipe', direction: 'cw', velocity: 2.5 });
  });

  it('createTap returns tap action with meshId', () => {
    const action = createTap('fridge_door');
    expect(action).toEqual({ type: 'tap', meshId: 'fridge_door' });
  });
});
```

**Step 3: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="InputActions" --ci
```

Expected: FAIL — module `../InputActions` not found.

**Step 4: Implement InputActions**

Create `src/input/InputActions.ts`:

```typescript
// --- Action types ---

export interface GrabAction {
  type: 'grab';
  meshId: string;
}

export interface ReleaseAction {
  type: 'release';
  meshId: string;
}

export interface LookAction {
  type: 'look';
  yaw: number;   // radians, clamped ±MAX_YAW
  pitch: number;  // radians, clamped ±MAX_PITCH
}

export interface PressAction {
  type: 'press';
  force: number;  // 0-1 normalized
}

export interface SwipeAction {
  type: 'swipe';
  direction: 'cw' | 'ccw' | 'up' | 'down' | 'left' | 'right';
  velocity: number;
}

export interface TapAction {
  type: 'tap';
  meshId: string;
}

export type InputAction =
  | GrabAction
  | ReleaseAction
  | LookAction
  | PressAction
  | SwipeAction
  | TapAction;

// --- Clamp constants ---

/** Max yaw offset from gyro/XR look (~30°) */
export const MAX_YAW = 0.52;
/** Max pitch offset from gyro/XR look (~20°) */
export const MAX_PITCH = 0.35;

// --- Action creators ---

const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

export function createGrab(meshId: string): GrabAction {
  return { type: 'grab', meshId };
}

export function createRelease(meshId: string): ReleaseAction {
  return { type: 'release', meshId };
}

export function createLook(yaw: number, pitch: number): LookAction {
  return {
    type: 'look',
    yaw: clamp(yaw, -MAX_YAW, MAX_YAW),
    pitch: clamp(pitch, -MAX_PITCH, MAX_PITCH),
  };
}

export function createPress(force: number): PressAction {
  return { type: 'press', force: clamp(force, 0, 1) };
}

export function createSwipe(
  direction: SwipeAction['direction'],
  velocity: number,
): SwipeAction {
  return { type: 'swipe', direction, velocity };
}

export function createTap(meshId: string): TapAction {
  return { type: 'tap', meshId };
}
```

**Step 5: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern="InputActions" --ci
```

Expected: all 9 tests PASS.

**Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/input/InputActions.ts src/input/__tests__/InputActions.test.ts
git commit -m "feat(input): add InputActions types + action creators with TDD

Foundation for the Input Abstraction Layer. All input sources normalize
to these common actions: grab, release, look, press, swipe, tap."
```

---

## Task 2: Add Input Settings to gameStore

**Files:**
- Modify: `src/store/gameStore.ts` (lines 4-62)
- Modify: `__tests__/gameStore.test.ts`

**Context:** Add settings for gyroscope, motion controls, and XR mode to the Zustand store. These control which adapters are active at runtime.

**Step 1: Write the failing test**

Add to `__tests__/gameStore.test.ts`:

```typescript
describe('input settings', () => {
  it('defaults gyroEnabled to false', () => {
    expect(store().gyroEnabled).toBe(false);
  });

  it('defaults motionControlsEnabled to true', () => {
    expect(store().motionControlsEnabled).toBe(true);
  });

  it('defaults xrMode to none', () => {
    expect(store().xrMode).toBe('none');
  });

  it('setGyroEnabled toggles gyroscope', () => {
    store().setGyroEnabled(true);
    expect(store().gyroEnabled).toBe(true);
    store().setGyroEnabled(false);
    expect(store().gyroEnabled).toBe(false);
  });

  it('setMotionControlsEnabled toggles motion controls', () => {
    store().setMotionControlsEnabled(false);
    expect(store().motionControlsEnabled).toBe(false);
  });

  it('setXrMode changes XR mode', () => {
    store().setXrMode('ar');
    expect(store().xrMode).toBe('ar');
    store().setXrMode('vr');
    expect(store().xrMode).toBe('vr');
  });

  it('returnToMenu preserves input settings', () => {
    store().setGyroEnabled(true);
    store().setXrMode('ar');
    store().startNewGame();
    store().returnToMenu();
    expect(store().gyroEnabled).toBe(true);
    expect(store().xrMode).toBe('ar');
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="gameStore" --ci
```

Expected: FAIL — `store().gyroEnabled` is undefined.

**Step 3: Implement the settings**

In `src/store/gameStore.ts`:

1. Add `XrMode` type and fields to `GameState` interface (after line 27):

```typescript
export type XrMode = 'none' | 'ar' | 'vr';
```

Add to the `GameState` interface (after `variantSeed: number;`):

```typescript
  // Input settings (persist across games)
  gyroEnabled: boolean;
  motionControlsEnabled: boolean;
  xrMode: XrMode;

  // Input setting actions
  setGyroEnabled: (enabled: boolean) => void;
  setMotionControlsEnabled: (enabled: boolean) => void;
  setXrMode: (mode: XrMode) => void;
```

2. Add to `INITIAL_GAME_STATE` (after `variantSeed: 0,`):

```typescript
  gyroEnabled: false,
  motionControlsEnabled: true,
  xrMode: 'none' as XrMode,
```

3. Add actions to the store creator (after `setChallengeHeatLevel`):

```typescript
  setGyroEnabled: (enabled: boolean) => set({ gyroEnabled: enabled }),
  setMotionControlsEnabled: (enabled: boolean) => set({ motionControlsEnabled: enabled }),
  setXrMode: (mode: XrMode) => set({ xrMode: mode }),
```

4. **Important:** `returnToMenu` (line 145) must NOT reset input settings — they persist across games. The current `returnToMenu` uses explicit field reset (not spread of INITIAL_GAME_STATE), so no change needed there.

**Step 4: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern="gameStore" --ci
```

Expected: all tests PASS (including new input settings tests).

**Step 5: Type check**

```bash
npx tsc --noEmit
```

Expected: no new errors.

**Step 6: Commit**

```bash
git add src/store/gameStore.ts __tests__/gameStore.test.ts
git commit -m "feat(store): add input settings — gyro, motion controls, XR mode

Settings persist across games (not reset by returnToMenu).
Defaults: gyro=off, motionControls=on, xrMode=none."
```

---

## Task 3: HapticService

**Files:**
- Create: `src/input/HapticService.ts`
- Create: `src/input/__tests__/HapticService.test.ts`

**Context:** HapticService maps game events to vibration patterns via expo-haptics. It subscribes to Zustand store changes and fires haptics automatically. The service is a singleton — mount once at app root.

**Step 1: Write the failing test**

Create `src/input/__tests__/HapticService.test.ts`:

```typescript
// Mock expo-haptics before importing anything
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(),
  notificationAsync: jest.fn(),
  selectionAsync: jest.fn(),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

import * as Haptics from 'expo-haptics';
import {
  getHapticPattern,
  fireHaptic,
  type HapticEvent,
} from '../HapticService';

const mockImpact = Haptics.impactAsync as jest.Mock;
const mockNotification = Haptics.notificationAsync as jest.Mock;
const mockSelection = Haptics.selectionAsync as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe('getHapticPattern', () => {
  it('maps ingredient_tap to light impact', () => {
    expect(getHapticPattern('ingredient_tap')).toEqual({
      type: 'impact',
      style: 'light',
    });
  });

  it('maps strike to heavy impact', () => {
    expect(getHapticPattern('strike')).toEqual({
      type: 'impact',
      style: 'heavy',
    });
  });

  it('maps victory to success notification', () => {
    expect(getHapticPattern('victory')).toEqual({
      type: 'notification',
      style: 'success',
    });
  });

  it('maps defeat to error notification', () => {
    expect(getHapticPattern('defeat')).toEqual({
      type: 'notification',
      style: 'error',
    });
  });

  it('maps stuffing_pressure to medium impact', () => {
    expect(getHapticPattern('stuffing_pressure')).toEqual({
      type: 'impact',
      style: 'medium',
    });
  });

  it('maps cooking_complete to success notification', () => {
    expect(getHapticPattern('cooking_complete')).toEqual({
      type: 'notification',
      style: 'success',
    });
  });

  it('maps temperature_change to selection', () => {
    expect(getHapticPattern('temperature_change')).toEqual({
      type: 'selection',
    });
  });
});

describe('fireHaptic', () => {
  it('fires impact for ingredient_tap', async () => {
    await fireHaptic('ingredient_tap');
    expect(mockImpact).toHaveBeenCalledWith('light');
  });

  it('fires notification for victory', async () => {
    await fireHaptic('victory');
    expect(mockNotification).toHaveBeenCalledWith('success');
  });

  it('fires selection for temperature_change', async () => {
    await fireHaptic('temperature_change');
    expect(mockSelection).toHaveBeenCalled();
  });

  it('does not throw for unknown event', async () => {
    await expect(fireHaptic('nonexistent' as HapticEvent)).resolves.toBeUndefined();
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="HapticService" --ci
```

Expected: FAIL — module `../HapticService` not found.

**Step 3: Implement HapticService**

Create `src/input/HapticService.ts`:

```typescript
import * as Haptics from 'expo-haptics';

// --- Haptic event types ---

export type HapticEvent =
  | 'ingredient_tap'
  | 'grinding_pulse'
  | 'stuffing_pressure'
  | 'strike'
  | 'defeat'
  | 'victory'
  | 'mr_sausage_flinch'
  | 'mr_sausage_laugh'
  | 'mr_sausage_disgust'
  | 'temperature_change'
  | 'cooking_complete';

// --- Pattern types ---

export type HapticPattern =
  | { type: 'impact'; style: 'light' | 'medium' | 'heavy' }
  | { type: 'notification'; style: 'success' | 'warning' | 'error' }
  | { type: 'selection' };

// --- Event → pattern mapping ---

const HAPTIC_MAP: Record<HapticEvent, HapticPattern> = {
  ingredient_tap: { type: 'impact', style: 'light' },
  grinding_pulse: { type: 'impact', style: 'medium' },
  stuffing_pressure: { type: 'impact', style: 'medium' },
  strike: { type: 'impact', style: 'heavy' },
  defeat: { type: 'notification', style: 'error' },
  victory: { type: 'notification', style: 'success' },
  mr_sausage_flinch: { type: 'impact', style: 'medium' },
  mr_sausage_laugh: { type: 'impact', style: 'light' },
  mr_sausage_disgust: { type: 'impact', style: 'medium' },
  temperature_change: { type: 'selection' },
  cooking_complete: { type: 'notification', style: 'success' },
};

export function getHapticPattern(event: HapticEvent): HapticPattern | undefined {
  return HAPTIC_MAP[event];
}

export async function fireHaptic(event: HapticEvent): Promise<void> {
  const pattern = HAPTIC_MAP[event];
  if (!pattern) return;

  switch (pattern.type) {
    case 'impact': {
      const styleMap = {
        light: Haptics.ImpactFeedbackStyle.Light,
        medium: Haptics.ImpactFeedbackStyle.Medium,
        heavy: Haptics.ImpactFeedbackStyle.Heavy,
      };
      await Haptics.impactAsync(styleMap[pattern.style]);
      break;
    }
    case 'notification': {
      const typeMap = {
        success: Haptics.NotificationFeedbackType.Success,
        warning: Haptics.NotificationFeedbackType.Warning,
        error: Haptics.NotificationFeedbackType.Error,
      };
      await Haptics.notificationAsync(typeMap[pattern.style]);
      break;
    }
    case 'selection':
      await Haptics.selectionAsync();
      break;
  }
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern="HapticService" --ci
```

Expected: all tests PASS.

**Step 5: Commit**

```bash
git add src/input/HapticService.ts src/input/__tests__/HapticService.test.ts
git commit -m "feat(input): add HapticService with event→pattern mapping

Maps 11 game events to expo-haptics vibration patterns.
ingredient_tap=light, strike=heavy, victory=success, etc.
Pure function + async fire — no store subscription yet."
```

---

## Task 4: GyroAdapter Pure Math

**Files:**
- Create: `src/input/GyroAdapter.ts`
- Create: `src/input/__tests__/GyroAdapter.test.ts`

**Context:** The gyroscope provides rotation rates (rad/s). We integrate these into a yaw/pitch offset, apply a low-pass filter for jitter, and clamp to ±30°/±20°. This is pure math — no platform dependencies.

**Step 1: Write the failing test**

Create `src/input/__tests__/GyroAdapter.test.ts`:

```typescript
import { lowPassFilter, integrateGyro, type GyroState } from '../GyroAdapter';

describe('lowPassFilter', () => {
  it('returns filtered value closer to raw when alpha is high', () => {
    const result = lowPassFilter(0, 1.0, 0.9);
    expect(result).toBeCloseTo(0.9, 2);
  });

  it('returns filtered value closer to previous when alpha is low', () => {
    const result = lowPassFilter(1.0, 0, 0.1);
    expect(result).toBeCloseTo(0.9, 2);
  });

  it('returns raw value when alpha is 1', () => {
    expect(lowPassFilter(5.0, 3.0, 1.0)).toBeCloseTo(3.0, 5);
  });

  it('returns previous value when alpha is 0', () => {
    expect(lowPassFilter(5.0, 3.0, 0.0)).toBeCloseTo(5.0, 5);
  });
});

describe('integrateGyro', () => {
  const BASE_STATE: GyroState = { yaw: 0, pitch: 0, filteredX: 0, filteredY: 0 };

  it('integrates rotation rate into yaw/pitch', () => {
    const result = integrateGyro(BASE_STATE, { x: 0, y: 1.0, z: 0 }, 1 / 60);
    // y rotation rate → yaw offset
    expect(result.yaw).toBeGreaterThan(0);
  });

  it('applies low-pass filter to reduce jitter', () => {
    // Two rapid conflicting samples — filtered result should be dampened
    const s1 = integrateGyro(BASE_STATE, { x: 0, y: 2.0, z: 0 }, 1 / 60);
    const s2 = integrateGyro(s1, { x: 0, y: -2.0, z: 0 }, 1 / 60);
    // Yaw shouldn't fully reverse — filter dampens
    expect(Math.abs(s2.yaw)).toBeLessThan(Math.abs(s1.yaw));
  });

  it('clamps yaw to MAX_YAW (±0.52 rad)', () => {
    let state = BASE_STATE;
    // Integrate many frames of high rotation to exceed clamp
    for (let i = 0; i < 600; i++) {
      state = integrateGyro(state, { x: 0, y: 5.0, z: 0 }, 1 / 60);
    }
    expect(state.yaw).toBeCloseTo(0.52, 2);
  });

  it('clamps pitch to MAX_PITCH (±0.35 rad)', () => {
    let state = BASE_STATE;
    for (let i = 0; i < 600; i++) {
      state = integrateGyro(state, { x: 5.0, y: 0, z: 0 }, 1 / 60);
    }
    expect(state.pitch).toBeCloseTo(0.35, 2);
  });

  it('returns zero offset for zero rotation rate', () => {
    const result = integrateGyro(BASE_STATE, { x: 0, y: 0, z: 0 }, 1 / 60);
    expect(result.yaw).toBe(0);
    expect(result.pitch).toBe(0);
  });
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern="GyroAdapter" --ci
```

Expected: FAIL — module not found.

**Step 3: Implement GyroAdapter math**

Create `src/input/GyroAdapter.ts`:

```typescript
import { MAX_YAW, MAX_PITCH } from './InputActions';

/** Low-pass filter smoothing factor. Higher = more responsive, lower = smoother. */
const FILTER_ALPHA = 0.25;

export interface GyroState {
  yaw: number;
  pitch: number;
  filteredX: number;
  filteredY: number;
}

export interface GyroSample {
  x: number;  // rotation rate around X axis (pitch)
  y: number;  // rotation rate around Y axis (yaw)
  z: number;  // rotation rate around Z axis (roll — unused)
}

/**
 * Simple low-pass filter: `prev * (1 - alpha) + raw * alpha`
 * @param prev Previous filtered value
 * @param raw New raw value
 * @param alpha Smoothing factor (0 = ignore raw, 1 = ignore prev)
 */
export function lowPassFilter(prev: number, raw: number, alpha: number): number {
  return prev * (1 - alpha) + raw * alpha;
}

/**
 * Integrate a gyroscope sample into cumulative yaw/pitch offset.
 * Applies low-pass filter for jitter reduction, clamps to max range.
 *
 * @param state Current gyro state (yaw, pitch, filtered rates)
 * @param sample Raw rotation rates from expo-sensors Gyroscope (rad/s)
 * @param dt Delta time in seconds (e.g. 1/60 for 60Hz)
 */
export function integrateGyro(
  state: GyroState,
  sample: GyroSample,
  dt: number,
): GyroState {
  const filteredX = lowPassFilter(state.filteredX, sample.x, FILTER_ALPHA);
  const filteredY = lowPassFilter(state.filteredY, sample.y, FILTER_ALPHA);

  const clamp = (v: number, min: number, max: number) =>
    Math.max(min, Math.min(max, v));

  return {
    filteredX,
    filteredY,
    yaw: clamp(state.yaw + filteredY * dt, -MAX_YAW, MAX_YAW),
    pitch: clamp(state.pitch + filteredX * dt, -MAX_PITCH, MAX_PITCH),
  };
}
```

**Step 4: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern="GyroAdapter" --ci
```

Expected: all tests PASS.

**Step 5: Commit**

```bash
git add src/input/GyroAdapter.ts src/input/__tests__/GyroAdapter.test.ts
git commit -m "feat(input): add GyroAdapter math — low-pass filter + integration

Pure math: integrates gyroscope rotation rates into yaw/pitch offset.
Low-pass filter (alpha=0.25) for jitter reduction.
Clamped to ±30° yaw, ±20° pitch."
```

---

## Task 5: Havok Physics Swap

**Files:**
- Modify: `src/components/GameWorld.web.tsx` (lines 1-29, 126)
- Modify: `src/components/GameWorld.native.tsx` (lines 1-29, 118)

**Context:** Replace cannon-es with @babylonjs/havok. Havok is Babylon.js's official physics engine — WASM-compiled, 10-50x faster, native XR hand collision support. The CannonJSPlugin → HavokPlugin swap requires async initialization since Havok loads a WASM binary.

**Step 1: Update GameWorld.web.tsx**

Remove these lines (1, 6, 28-29):
```typescript
// DELETE: import * as CANNON from 'cannon-es';
// DELETE: CannonJSPlugin,
// DELETE: (globalThis as any).CANNON = CANNON;
```

Add new import:
```typescript
import HavokPhysics from '@babylonjs/havok';
import { HavokPlugin } from '@babylonjs/core';
```

Change `onSceneReady` (line 124-153) from sync to async. Replace the physics line:

```typescript
// OLD: scene.enablePhysics(new Vector3(0, -9.81, 0), new CannonJSPlugin());
// NEW:
const havokInstance = await HavokPhysics();
scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havokInstance));
```

Since `onSceneReady` is now async and reactylon's `Scene` doesn't await it, wrap the async work:

```typescript
const onSceneReady = (scene: any) => {
  scene.clearColor = new Color4(0.02, 0.02, 0.02, 1);

  // Initialize Havok physics asynchronously
  (async () => {
    const havokInstance = await HavokPhysics();
    scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havokInstance));
  })();

  // ... rest of camera setup (doesn't depend on physics being ready)
```

**Step 2: Update GameWorld.native.tsx**

Same changes as web — remove cannon-es, add Havok, async physics init.

**Step 3: Verify**

```bash
npx tsc --noEmit
pnpm test -- --ci --forceExit
```

Expected: tsc passes (no cannon-es references), all existing tests pass (tests don't import GameWorld).

**Step 4: Commit**

```bash
git add src/components/GameWorld.web.tsx src/components/GameWorld.native.tsx
git commit -m "feat(physics): swap cannon-es → @babylonjs/havok

WASM-compiled Havok physics: 10-50x faster, native XR hand collision.
Async initialization (WASM binary load) in onSceneReady.
Removed globalThis.CANNON polyfill hack."
```

---

## Task 6: InputAdapter Interface + PointerAdapter

**Files:**
- Create: `src/input/InputAdapter.ts`
- Create: `src/input/PointerAdapter.ts`

**Context:** InputAdapter is the base interface all adapters implement. PointerAdapter wraps Babylon's ActionManager for mesh picking — it converts OnPickTrigger and OnPointerOverTrigger into InputActions (tap, grab).

**Step 1: Create InputAdapter interface**

Create `src/input/InputAdapter.ts`:

```typescript
import type { InputAction } from './InputActions';

/**
 * Base interface for all input adapters.
 * Adapters normalize platform-specific input into InputActions.
 */
export interface InputAdapter {
  /** Human-readable name for debugging */
  readonly name: string;

  /** Start listening for input. Called when adapter is activated. */
  attach(): void;

  /** Stop listening for input. Called on cleanup. */
  detach(): void;

  /**
   * Register a callback for when the adapter produces an action.
   * Returns an unsubscribe function.
   */
  onAction(callback: (action: InputAction) => void): () => void;
}
```

**Step 2: Create PointerAdapter**

Create `src/input/PointerAdapter.ts`:

```typescript
import {
  ActionManager,
  ExecuteCodeAction,
} from '@babylonjs/core';
import type { AbstractMesh, Scene as BabylonScene } from '@babylonjs/core';
import type { InputAdapter } from './InputAdapter';
import type { InputAction } from './InputActions';
import { createTap, createGrab, createRelease } from './InputActions';

/**
 * PointerAdapter: converts Babylon.js mesh picking (click/touch) into InputActions.
 *
 * Registers ActionManager triggers on meshes. When a mesh is picked,
 * fires a 'tap' action. For long press, fires 'grab' + 'release'.
 */
export class PointerAdapter implements InputAdapter {
  readonly name = 'PointerAdapter';
  private listeners: Array<(action: InputAction) => void> = [];
  private scene: BabylonScene | null = null;
  private registeredMeshes: Map<AbstractMesh, ActionManager> = new Map();

  attach(): void {
    // No-op — meshes are registered individually via registerMesh()
  }

  detach(): void {
    for (const [mesh, am] of this.registeredMeshes) {
      am.dispose();
    }
    this.registeredMeshes.clear();
    this.listeners = [];
  }

  onAction(callback: (action: InputAction) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * Register a mesh for pointer interaction.
   * @param mesh The Babylon mesh to make interactive
   * @param scene The Babylon scene
   * @param mode 'tap' for simple selection, 'grab' for press-and-hold
   */
  registerMesh(
    mesh: AbstractMesh,
    scene: BabylonScene,
    mode: 'tap' | 'grab' = 'tap',
  ): void {
    this.scene = scene;
    const am = new ActionManager(scene);
    mesh.actionManager = am;

    if (mode === 'tap') {
      am.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
          this.emit(createTap(mesh.name));
        }),
      );
    } else {
      // grab mode: pick down = grab, pick up = release
      am.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickDownTrigger, () => {
          this.emit(createGrab(mesh.name));
        }),
      );
      am.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickUpTrigger, () => {
          this.emit(createRelease(mesh.name));
        }),
      );
    }

    this.registeredMeshes.set(mesh, am);
  }

  /** Unregister a specific mesh */
  unregisterMesh(mesh: AbstractMesh): void {
    const am = this.registeredMeshes.get(mesh);
    if (am) {
      am.dispose();
      this.registeredMeshes.delete(mesh);
    }
  }

  private emit(action: InputAction): void {
    for (const listener of this.listeners) {
      listener(action);
    }
  }
}
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors (these files use Babylon types but no runtime platform deps).

**Step 4: Commit**

```bash
git add src/input/InputAdapter.ts src/input/PointerAdapter.ts
git commit -m "feat(input): add InputAdapter interface + PointerAdapter

InputAdapter: base interface for all input sources (attach/detach/onAction).
PointerAdapter: wraps Babylon.js ActionManager for mesh tap/grab interaction."
```

---

## Task 7: FridgeStation GLB Rewrite

**Files:**
- Modify: `src/components/kitchen/FridgeStation.tsx` (full rewrite)
- Modify: `src/components/kitchen/KitchenEnvironment.tsx` (expose fridge mesh ref)

**Context:** Kill the procedural fridge box. Instead, find the fridge mesh from kitchen.glb by name after it loads, animate the door open, and place ingredient meshes on the GLB shelf positions. Uses PointerAdapter for tap selection instead of raw ActionManager.

**Step 1: Expose fridge mesh from KitchenEnvironment**

In `src/components/kitchen/KitchenEnvironment.tsx`, after the kitchen.glb loads (inside the SceneLoader.ImportMeshAsync callback), find the fridge mesh by name and expose it via a callback prop or a ref on window for the FridgeStation to find:

Add a prop to KitchenEnvironment:
```typescript
interface KitchenEnvironmentProps {
  onFridgeMeshReady?: (fridgeMesh: AbstractMesh | null) => void;
}
```

Inside the GLB load success handler, after the material overrides, add:
```typescript
// Find fridge mesh by name (look for common fridge-related names in the GLB)
const fridgeMesh = result.meshes.find(
  (m) => m.name.toLowerCase().includes('fridge') || m.name.toLowerCase().includes('refrigerator')
) || null;
if (props.onFridgeMeshReady) {
  props.onFridgeMeshReady(fridgeMesh);
}
```

**Step 2: Rewrite FridgeStation to use GLB mesh**

Replace the entire `FridgeStation.tsx`. The new component:
- Receives `fridgeMesh` prop (from KitchenEnvironment callback)
- Finds door sub-mesh by name within the fridge
- Animates door open (Y rotation) when component mounts
- Places ingredient meshes on shelf positions relative to fridge mesh bounding box
- Uses PointerAdapter for tap selection

```typescript
import { useEffect, useRef } from 'react';
import { useScene } from 'reactylon';
import {
  ActionManager,
  Animation,
  Color3,
  ExecuteCodeAction,
  MeshBuilder,
  StandardMaterial,
  Vector3,
} from '@babylonjs/core';
import type { AbstractMesh, Observer, Scene as BabylonScene } from '@babylonjs/core';
import type { Ingredient } from '../../engine/Ingredients';
import { fireHaptic } from '../../input/HapticService';

interface FridgeStationProps {
  ingredients: Ingredient[];
  selectedIds: Set<number>;
  hintActive: boolean;
  matchingIndices: Set<number>;
  onSelect: (index: number) => void;
  fridgeMesh?: AbstractMesh | null;
}

function hexToColor3(hex: string): Color3 {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return new Color3(r, g, b);
}

const INGREDIENT_DIAMETER = 0.3;
const ITEMS_PER_SHELF = 4;

export const FridgeStation = ({
  ingredients,
  selectedIds,
  hintActive,
  matchingIndices,
  onSelect,
  fridgeMesh,
}: FridgeStationProps) => {
  const scene = useScene();
  const timeRef = useRef(0);
  const selectedIdsRef = useRef(selectedIds);
  const hintActiveRef = useRef(hintActive);
  const matchingIndicesRef = useRef(matchingIndices);

  selectedIdsRef.current = selectedIds;
  hintActiveRef.current = hintActive;
  matchingIndicesRef.current = matchingIndices;

  useEffect(() => {
    if (!scene) return;

    const allMeshes: AbstractMesh[] = [];
    const allMaterials: StandardMaterial[] = [];
    const ingredientMeshes: AbstractMesh[] = [];
    const ingredientMats: StandardMaterial[] = [];
    let observer: Observer<BabylonScene> | null = null;

    // --- Find fridge position from GLB mesh or fall back to default ---
    let fridgePos: Vector3;
    if (fridgeMesh) {
      fridgePos = fridgeMesh.getAbsolutePosition().clone();

      // Animate door open if we can find a door sub-mesh
      const doorMesh = fridgeMesh.getChildMeshes().find(
        (m) => m.name.toLowerCase().includes('door')
      );
      if (doorMesh) {
        const doorAnim = new Animation(
          'fridgeDoorOpen',
          'rotation.y',
          30,
          Animation.ANIMATIONTYPE_FLOAT,
          Animation.ANIMATIONLOOPMODE_CONSTANT,
        );
        doorAnim.setKeys([
          { frame: 0, value: doorMesh.rotation.y },
          { frame: 30, value: doorMesh.rotation.y + Math.PI / 2 },
        ]);
        doorMesh.animations = [doorAnim];
        scene.beginAnimation(doorMesh, 0, 30, false);
      }
    } else {
      // Fallback: procedural position (same as old FridgeStation)
      fridgePos = new Vector3(-5, 1.5, -4);
    }

    // --- Ingredient shelves (3 shelves, 4 items each) ---
    const SHELF_Y_OFFSETS = [-1.0, 0.0, 1.0]; // relative to fridge center Y

    for (let i = 0; i < ingredients.length; i++) {
      const ingredient = ingredients[i];
      const shelfIndex = Math.floor(i / ITEMS_PER_SHELF) % 3;
      const slotIndex = i % ITEMS_PER_SHELF;
      const xOffset = (slotIndex - (ITEMS_PER_SHELF - 1) / 2) * 0.35;
      const shelfY = fridgePos.y + SHELF_Y_OFFSETS[shelfIndex] + INGREDIENT_DIAMETER / 2;

      let mesh: AbstractMesh;
      const meshName = `fridgeIngredient_${i}`;

      switch (ingredient.shape.base) {
        case 'box':
        case 'irregular':
          mesh = MeshBuilder.CreateBox(meshName, { size: INGREDIENT_DIAMETER }, scene);
          break;
        case 'cylinder':
          mesh = MeshBuilder.CreateCylinder(meshName, {
            height: ingredient.shape.detail === 'flat' ? INGREDIENT_DIAMETER * 0.5 : INGREDIENT_DIAMETER,
            diameter: INGREDIENT_DIAMETER,
          }, scene);
          break;
        case 'cone':
        case 'wedge':
          mesh = MeshBuilder.CreateCylinder(meshName, {
            diameterTop: 0,
            diameterBottom: INGREDIENT_DIAMETER,
            height: INGREDIENT_DIAMETER,
          }, scene);
          break;
        case 'small-sphere':
          mesh = MeshBuilder.CreateSphere(meshName, { diameter: INGREDIENT_DIAMETER * 0.7, segments: 8 }, scene);
          break;
        case 'elongated':
          mesh = MeshBuilder.CreateCylinder(meshName, {
            height: INGREDIENT_DIAMETER * 1.5,
            diameter: INGREDIENT_DIAMETER * 0.5,
          }, scene);
          break;
        default:
          mesh = MeshBuilder.CreateSphere(meshName, { diameter: INGREDIENT_DIAMETER, segments: 10 }, scene);
          break;
      }

      const mat = new StandardMaterial(`${meshName}_mat`, scene);
      mat.disableLighting = true;
      mat.emissiveColor = hexToColor3(ingredient.color);
      mesh.material = mat;
      mesh.position = new Vector3(fridgePos.x + xOffset, shelfY, fridgePos.z);

      // Tap selection via ActionManager
      mesh.actionManager = new ActionManager(scene);
      const ingredientIndex = i;
      mesh.actionManager.registerAction(
        new ExecuteCodeAction(ActionManager.OnPickTrigger, () => {
          if (!selectedIdsRef.current.has(ingredientIndex)) {
            onSelect(ingredientIndex);
            fireHaptic('ingredient_tap');
          }
        }),
      );

      ingredientMeshes.push(mesh);
      ingredientMats.push(mat);
      allMeshes.push(mesh);
      allMaterials.push(mat);
    }

    // --- Render loop: animate selected + hint glow ---
    observer = scene.onBeforeRenderObservable.add(() => {
      const dt = scene.getEngine().getDeltaTime() / 1000;
      timeRef.current += dt;

      for (let i = 0; i < ingredientMeshes.length; i++) {
        const mesh = ingredientMeshes[i];
        const mat = ingredientMats[i];
        if (!mesh || !mat) continue;

        const isSelected = selectedIdsRef.current.has(i);
        const isHintMatch = hintActiveRef.current && matchingIndicesRef.current.has(i) && !isSelected;

        if (isSelected) {
          const targetZ = fridgePos.z + 0.5;
          mesh.position.z += (targetZ - mesh.position.z) * 0.1;
          mat.alpha = 0.4;
        }

        if (isHintMatch) {
          const pulse = 0.5 + 0.5 * Math.sin(timeRef.current * 6);
          const baseColor = hexToColor3(ingredients[i].color);
          mat.emissiveColor = new Color3(
            Math.min(baseColor.r + pulse * 0.5, 1),
            Math.min(baseColor.g + pulse * 0.5, 1),
            Math.min(baseColor.b + pulse * 0.5, 1),
          );
        } else if (!isSelected) {
          mat.emissiveColor = hexToColor3(ingredients[i].color);
        }
      }
    });

    return () => {
      if (observer) { scene.onBeforeRenderObservable.remove(observer); }
      for (const mesh of allMeshes) {
        if (mesh.actionManager) { mesh.actionManager.dispose(); }
        mesh.dispose();
      }
      for (const mat of allMaterials) { mat.dispose(); }
    };
  }, [scene, ingredients, onSelect, fridgeMesh]);

  return null;
};
```

**Step 3: Wire fridgeMesh prop through GameWorld**

In both `GameWorld.web.tsx` and `GameWorld.native.tsx`:

1. Add state: `const [fridgeMesh, setFridgeMesh] = useState<any>(null);`
2. Pass to KitchenEnvironment: `<KitchenEnvironment onFridgeMeshReady={setFridgeMesh} />`
3. Pass to FridgeStation: `fridgeMesh={fridgeMesh}`

**Step 4: Verify**

```bash
npx tsc --noEmit
pnpm test -- --ci --forceExit
```

Expected: tsc passes, all tests pass. Visual verification needed via `npx expo start --web`.

**Step 5: Commit**

```bash
git add src/components/kitchen/FridgeStation.tsx src/components/kitchen/KitchenEnvironment.tsx src/components/GameWorld.web.tsx src/components/GameWorld.native.tsx
git commit -m "feat(fridge): rewrite FridgeStation to use kitchen.glb mesh

Kill procedural fridge box. Find fridge mesh from GLB, animate door open,
place ingredient meshes on GLB shelf positions. Fire haptic on ingredient tap."
```

---

## Task 8: LoadingScreen 3D Sausage Reveal

**Files:**
- Modify: `src/components/ui/LoadingScreen.tsx` (full rewrite)

**Context:** Replace the 2D sausage progress bar with a Babylon.js 3D scene. Load sausage.glb first (~1MB, near-instant), then stream kitchen.glb with progress tracking. Sausage model fades in from opacity 0→1 as loading progresses. Mr. Sausage quotes rotate. On complete → appPhase = 'playing'.

**Step 1: Rewrite LoadingScreen.tsx**

The new LoadingScreen mounts a Babylon Engine with a minimal scene:

```typescript
import React, { useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Scene } from 'reactylon';
import { Engine } from 'reactylon/web';
import {
  Color3,
  Color4,
  FreeCamera,
  HemisphericLight,
  PointLight,
  SceneLoader,
  Vector3,
} from '@babylonjs/core';
import '@babylonjs/loaders/glTF';
import { useGameStore } from '../../store/gameStore';

const LOADING_QUOTES = [
  'Selecting the finest meats...',
  'Grinding it down...',
  'Stuffing the casing...',
  'Firing up the stove...',
  'Almost ready to blow...',
];

function getModelUrl(subdir: string): string {
  if (typeof document !== 'undefined') {
    const base = document.querySelector('base');
    if (base?.href) {
      const url = new URL(base.href);
      return `${url.pathname.replace(/\/$/, '')}/${subdir}/`;
    }
  }
  return `/${subdir}/`;
}

export function LoadingScreen() {
  const startNewGame = useGameStore((s) => s.startNewGame);
  const gameStatus = useGameStore((s) => s.gameStatus);
  const [progress, setProgress] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [quoteIndex, setQuoteIndex] = useState(0);
  const sausageMeshesRef = useRef<any[]>([]);

  // Fade-in animation for the overlay text
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 600,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);

  // Cycle quotes
  useEffect(() => {
    const interval = setInterval(() => {
      setQuoteIndex((prev) => (prev + 1) % LOADING_QUOTES.length);
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Update sausage opacity based on progress
  useEffect(() => {
    const meshes = sausageMeshesRef.current;
    if (!meshes.length) return;
    const opacity = Math.max(0, Math.min(progress / 100, 1));
    for (const mesh of meshes) {
      if (mesh.material) {
        mesh.material.alpha = opacity;
        // Also ramp up emissive to reveal details
        if (mesh.material.emissiveColor) {
          mesh.material.emissiveColor = new Color3(opacity * 0.3, opacity * 0.2, opacity * 0.15);
        }
      }
    }
  }, [progress]);

  const onSceneReady = (scene: any) => {
    scene.clearColor = new Color4(0.02, 0.02, 0.02, 1);

    // Camera: close-up on sausage
    const cam = new FreeCamera('loadCam', new Vector3(0, 1, -3), scene);
    cam.setTarget(new Vector3(0, 0.5, 0));
    cam.fov = 0.8;
    cam.minZ = 0.1;
    cam.keysUp = [];
    cam.keysDown = [];
    cam.keysLeft = [];
    cam.keysRight = [];
    scene.activeCamera = cam;

    // Dramatic single spotlight
    const spot = new PointLight('spotlight', new Vector3(0, 3, -2), scene);
    spot.intensity = 2.0;
    spot.diffuse = new Color3(1, 0.9, 0.8); // warm

    const ambient = new HemisphericLight('ambient', new Vector3(0, 1, 0), scene);
    ambient.intensity = 0.05;

    // Load sausage.glb (small, near-instant)
    const modelRoot = getModelUrl('models');
    SceneLoader.ImportMeshAsync('', modelRoot, 'sausage.glb', scene).then((result) => {
      // Start all meshes at opacity 0
      for (const mesh of result.meshes) {
        if (mesh.material) {
          mesh.material.alpha = 0;
          mesh.material.transparencyMode = 2; // ALPHA_BLEND
        }
      }
      sausageMeshesRef.current = result.meshes;

      // Gentle rotation
      scene.onBeforeRenderObservable.add(() => {
        const dt = scene.getEngine().getDeltaTime() / 1000;
        for (const mesh of result.meshes) {
          if (mesh.parent === null) {
            mesh.rotation.y += dt * 0.3;
          }
        }
      });
    }).catch((err) => {
      console.warn('Failed to load sausage.glb:', err);
    });

    // Stream kitchen.glb with progress tracking
    const controller = new AbortController();

    (async () => {
      try {
        const url = `${modelRoot}kitchen.glb`;
        const response = await fetch(url, { signal: controller.signal });

        if (!response.ok) {
          if (!controller.signal.aborted) {
            setLoadError(`Failed to load assets (HTTP ${response.status})`);
          }
          return;
        }

        const reader = response.body?.getReader();
        const contentLength = Number(response.headers.get('content-length')) || 0;

        if (!reader || contentLength === 0) {
          await response.arrayBuffer();
          if (!controller.signal.aborted) setProgress(100);
          return;
        }

        let received = 0;
        while (true) {
          const { done, value } = await reader.read();
          if (done || controller.signal.aborted) break;
          received += value.byteLength;
          const pct = Math.min(Math.round((received / contentLength) * 100), 99);
          setProgress(pct);
        }
        if (!controller.signal.aborted) setProgress(100);
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        console.warn('Error preloading kitchen.glb:', error);
        if (!controller.signal.aborted) setLoadError('Failed to load assets. Check your connection.');
      }
    })();

    // Stash controller for cleanup
    (scene as any).__loadController = controller;
  };

  // Cleanup fetch on unmount
  useEffect(() => {
    return () => {
      // AbortController cleaned up by scene disposal
    };
  }, []);

  // Transition to playing when loading completes
  useEffect(() => {
    if (progress < 100) return;
    const timeout = setTimeout(() => {
      if (gameStatus !== 'playing') {
        startNewGame();
      } else {
        useGameStore.getState().setAppPhase('playing');
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [progress, startNewGame, gameStatus]);

  const handleRetry = () => {
    setLoadError(null);
    setProgress(0);
  };

  const engineProps = {
    engineOptions: { preserveDrawingBuffer: true, stencil: true, antialias: true },
    style: { width: '100%', height: '100%' },
  } as any;

  const fillWidth = `${Math.max(progress, 2)}%` as const;

  return (
    <View style={styles.container}>
      {/* 3D sausage scene (background) */}
      <View style={styles.sceneContainer}>
        <Engine {...engineProps}>
          <Scene onSceneReady={onSceneReady} />
        </Engine>
      </View>

      {/* 2D overlay (foreground) */}
      <Animated.View style={[styles.overlay, { opacity: fadeAnim }]}>
        {loadError ? (
          <View style={styles.progressArea}>
            <Text style={styles.errorText}>{loadError}</Text>
            <TouchableOpacity onPress={handleRetry} style={styles.retryButton}>
              <Text style={styles.retryText}>RETRY</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <View style={styles.progressArea}>
              <View style={styles.sausageTrack}>
                <View style={[styles.sausageFill, { width: fillWidth }]}>
                  <View style={styles.sausageCapLeft} />
                  <View style={styles.sausageCapRight} />
                </View>
              </View>
              <Text style={styles.percentage}>{progress}%</Text>
            </View>
            <Text style={styles.quote}>"{LOADING_QUOTES[quoteIndex]}"</Text>
            <Text style={styles.attribution}>- Mr. Sausage</Text>
          </>
        )}
      </Animated.View>
    </View>
  );
}

const SAUSAGE_COLOR = '#C2442D';
const SAUSAGE_COLOR_DARK = '#8B1A1A';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  sceneContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingBottom: 80,
  },
  progressArea: {
    width: '100%',
    maxWidth: 320,
    alignItems: 'center',
    marginBottom: 40,
  },
  sausageTrack: {
    width: '100%',
    height: 32,
    backgroundColor: 'rgba(26, 26, 26, 0.8)',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333',
    overflow: 'hidden',
  },
  sausageFill: {
    height: '100%',
    backgroundColor: SAUSAGE_COLOR,
    borderRadius: 14,
    minWidth: 8,
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  sausageCapLeft: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 14,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    backgroundColor: SAUSAGE_COLOR_DARK,
  },
  sausageCapRight: {
    position: 'absolute',
    right: 0,
    top: 2,
    bottom: 2,
    width: 6,
    borderTopRightRadius: 6,
    borderBottomRightRadius: 6,
    backgroundColor: SAUSAGE_COLOR_DARK,
  },
  percentage: {
    fontFamily: 'Bangers',
    fontSize: 28,
    color: '#CCBBAA',
    marginTop: 12,
    letterSpacing: 2,
  },
  quote: {
    fontFamily: 'Bangers',
    fontSize: 20,
    color: 'rgba(136, 136, 136, 0.9)',
    textAlign: 'center',
    letterSpacing: 1,
    fontStyle: 'italic',
  },
  attribution: {
    fontFamily: 'Bangers',
    fontSize: 14,
    color: 'rgba(85, 85, 85, 0.9)',
    marginTop: 8,
    letterSpacing: 2,
  },
  errorText: {
    fontFamily: 'Bangers',
    fontSize: 22,
    color: '#C2442D',
    textAlign: 'center',
    letterSpacing: 1,
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#C2442D',
    paddingHorizontal: 32,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryText: {
    fontFamily: 'Bangers',
    fontSize: 20,
    color: '#fff',
    letterSpacing: 2,
  },
});
```

**Step 2: Create native variant stub**

The LoadingScreen uses `Engine` from `reactylon/web`. For native, we need a `LoadingScreen.native.tsx` that uses `NativeEngine` from `reactylon/mobile` instead. Create it with the same logic but swapping the Engine import. Or — simpler — make the web version the default and create a 2D fallback for native until reactylon/mobile supports Engine mounting mid-app:

If reactylon/mobile doesn't support standalone Engine mounting, keep the current 2D loading screen for native and only use the 3D version for web. Use Metro platform extensions: rename the rewritten file to `LoadingScreen.web.tsx` and keep the current file as `LoadingScreen.tsx` (native fallback).

**Step 3: Verify**

```bash
npx tsc --noEmit
pnpm test -- --ci --forceExit
```

Expected: tsc passes, all tests pass. Visual verification via `npx expo start --web`.

**Step 4: Commit**

```bash
git add src/components/ui/LoadingScreen.tsx src/components/ui/LoadingScreen.web.tsx
git commit -m "feat(loading): 3D sausage reveal loading screen

Mount Babylon engine during loading. Load sausage.glb (instant) with
opacity 0→1 matching kitchen.glb download progress. Gentle rotation.
Dramatic spotlight on dark background. Quotes cycle every 2s."
```

---

## Task 9: TouchAdapter + useInputAdapter Hook

**Files:**
- Create: `src/input/TouchAdapter.ts`
- Create: `src/input/useInputAdapter.ts`

**Context:** TouchAdapter maps react-native-gesture-handler gestures to InputActions. The useInputAdapter hook mounts the appropriate adapters based on platform and settings.

**Step 1: Create TouchAdapter**

Create `src/input/TouchAdapter.ts`:

```typescript
import type { InputAdapter } from './InputAdapter';
import type { InputAction } from './InputActions';
import { createSwipe, createPress } from './InputActions';

/**
 * TouchAdapter: converts gesture handler events to InputActions.
 * Used on mobile and web for touch/mouse gestures on the React Native overlay.
 *
 * Integration point: challenge overlay components call TouchAdapter methods
 * when they detect gestures (circular for grinding, press-and-hold for stuffing).
 */
export class TouchAdapter implements InputAdapter {
  readonly name = 'TouchAdapter';
  private listeners: Array<(action: InputAction) => void> = [];

  attach(): void {}
  detach(): void {
    this.listeners = [];
  }

  onAction(callback: (action: InputAction) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /**
   * Called by gesture handler when a circular swipe is detected.
   * Used by grinding challenge overlay.
   */
  reportSwipe(direction: 'cw' | 'ccw', velocity: number): void {
    this.emit(createSwipe(direction, velocity));
  }

  /**
   * Called by gesture handler when press force changes.
   * Used by stuffing challenge overlay.
   */
  reportPress(force: number): void {
    this.emit(createPress(force));
  }

  private emit(action: InputAction): void {
    for (const listener of this.listeners) {
      listener(action);
    }
  }
}
```

**Step 2: Create useInputAdapter hook**

Create `src/input/useInputAdapter.ts`:

```typescript
import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';
import { useGameStore } from '../store/gameStore';
import { PointerAdapter } from './PointerAdapter';
import { TouchAdapter } from './TouchAdapter';
import type { InputAdapter } from './InputAdapter';
import type { InputAction } from './InputActions';

/**
 * Hook that mounts the appropriate input adapters based on platform and settings.
 * Returns the active adapters for components to register meshes/gestures with.
 */
export function useInputAdapter(): {
  pointer: PointerAdapter;
  touch: TouchAdapter;
} {
  const pointerRef = useRef(new PointerAdapter());
  const touchRef = useRef(new TouchAdapter());

  useEffect(() => {
    const pointer = pointerRef.current;
    const touch = touchRef.current;

    pointer.attach();
    touch.attach();

    return () => {
      pointer.detach();
      touch.detach();
    };
  }, []);

  return {
    pointer: pointerRef.current,
    touch: touchRef.current,
  };
}
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors.

**Step 4: Commit**

```bash
git add src/input/TouchAdapter.ts src/input/useInputAdapter.ts
git commit -m "feat(input): add TouchAdapter + useInputAdapter hook

TouchAdapter: reports swipe/press from gesture handlers.
useInputAdapter: mounts PointerAdapter + TouchAdapter, returns refs
for components to register meshes and report gestures."
```

---

## Task 10: GyroAdapter Integration (Camera Offset)

**Files:**
- Modify: `src/components/GameWorld.web.tsx`
- Modify: `src/components/GameWorld.native.tsx`
- Modify: `src/input/GyroAdapter.ts` (add expo-sensors hook)

**Context:** Wire the GyroAdapter math (Task 4) into the camera system. On mobile (non-XR), the gyroscope applies a ±30°/±20° offset to the fixed waypoint camera. Settings toggle via `gyroEnabled` in store.

**Step 1: Add expo-sensors gyroscope subscription to GyroAdapter**

Add to `src/input/GyroAdapter.ts`:

```typescript
import { Gyroscope } from 'expo-sensors';
import type { Subscription } from 'expo-sensors';
import { useGameStore } from '../store/gameStore';

let gyroSubscription: Subscription | null = null;
let currentState: GyroState = { yaw: 0, pitch: 0, filteredX: 0, filteredY: 0 };

/** Start listening to gyroscope. Call from GameWorld on mount if gyroEnabled. */
export function startGyro(): void {
  if (gyroSubscription) return;
  Gyroscope.setUpdateInterval(16); // ~60Hz
  gyroSubscription = Gyroscope.addListener((data) => {
    currentState = integrateGyro(currentState, data, 1 / 60);
  });
}

/** Stop listening to gyroscope. */
export function stopGyro(): void {
  if (gyroSubscription) {
    gyroSubscription.remove();
    gyroSubscription = null;
  }
  currentState = { yaw: 0, pitch: 0, filteredX: 0, filteredY: 0 };
}

/** Get current gyro yaw/pitch offset for camera. */
export function getGyroOffset(): { yaw: number; pitch: number } {
  return { yaw: currentState.yaw, pitch: currentState.pitch };
}
```

**Step 2: Apply gyro offset in GameWorld camera render loop**

In both `GameWorld.web.tsx` and `GameWorld.native.tsx`, add a render loop observer that applies the gyro offset to camera rotation:

```typescript
import { getGyroOffset, startGyro, stopGyro } from '../input/GyroAdapter';

// Inside the component, after camera is set:
useEffect(() => {
  if (!camera) return;
  const gyroEnabled = useGameStore.getState().gyroEnabled;
  if (!gyroEnabled) return;

  startGyro();

  const cam = camera as FreeCamera;
  const scene = cam.getScene();
  const baseRotation = cam.rotation.clone();

  const observer = scene.onBeforeRenderObservable.add(() => {
    const { yaw, pitch } = getGyroOffset();
    cam.rotation.y = baseRotation.y + yaw;
    cam.rotation.x = baseRotation.x + pitch;
  });

  return () => {
    scene.onBeforeRenderObservable.remove(observer);
    stopGyro();
  };
}, [camera]);
```

Note: `baseRotation` needs updating when the camera walks to a new station. The walk animation sets `cam.setTarget()` which changes rotation — so grab the base rotation after each walk completes.

**Step 3: Verify**

```bash
npx tsc --noEmit
pnpm test -- --ci --forceExit
```

Expected: tsc passes, tests pass. Gyro only activates on mobile with `gyroEnabled: true`.

**Step 4: Commit**

```bash
git add src/input/GyroAdapter.ts src/components/GameWorld.web.tsx src/components/GameWorld.native.tsx
git commit -m "feat(input): wire gyroscope camera offset into GameWorld

expo-sensors Gyroscope at 60Hz → low-pass filter → camera yaw/pitch offset.
Activated when gyroEnabled=true in store. ±30° yaw, ±20° pitch clamp.
Settings toggle in store (Task 2). Web: no-op (no gyroscope)."
```

---

## Task 11: XRAdapter (reactylon WebXR)

**Files:**
- Create: `src/input/XRAdapter.ts`
- Modify: `src/components/GameWorld.web.tsx` (XR scene options)
- Modify: `src/components/GameWorld.native.tsx` (XR scene options)

**Context:** reactylon provides `useXrExperience()` and `WebXRCamera` for XR/AR support. The XRAdapter integrates WebXR into the game — head tracking replaces the fixed camera, hand tracking maps to grab/release actions.

**Step 1: Create XRAdapter**

Create `src/input/XRAdapter.ts`:

```typescript
import type { InputAdapter } from './InputAdapter';
import type { InputAction } from './InputActions';
import { createGrab, createRelease, createLook } from './InputActions';

/**
 * XRAdapter: bridges WebXR (via reactylon) to InputActions.
 *
 * In XR mode:
 * - Head tracking → look actions (replaces gyro/mouse)
 * - Hand tracking → grab/release actions
 * - Controller triggers → tap/press actions
 *
 * Integration: GameWorld passes XR session events to this adapter.
 */
export class XRAdapter implements InputAdapter {
  readonly name = 'XRAdapter';
  private listeners: Array<(action: InputAction) => void> = [];

  attach(): void {}
  detach(): void {
    this.listeners = [];
  }

  onAction(callback: (action: InputAction) => void): () => void {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== callback);
    };
  }

  /** Called from XR hand tracking when a grab gesture is detected */
  reportGrab(meshName: string): void {
    this.emit(createGrab(meshName));
  }

  /** Called from XR hand tracking when a release gesture is detected */
  reportRelease(meshName: string): void {
    this.emit(createRelease(meshName));
  }

  /** Called from XR head tracking each frame */
  reportHeadLook(yaw: number, pitch: number): void {
    this.emit(createLook(yaw, pitch));
  }

  private emit(action: InputAction): void {
    for (const listener of this.listeners) {
      listener(action);
    }
  }
}
```

**Step 2: Add XR support to GameWorld Scene**

In `GameWorld.web.tsx`, modify the Scene component to support XR when `xrMode !== 'none'`:

```typescript
import { useGameStore } from '../store/gameStore';

// Inside the component:
const xrMode = useGameStore((s) => s.xrMode);

// In onSceneReady, after camera setup:
if (xrMode !== 'none') {
  scene.createDefaultXRExperienceAsync({
    floorMeshes: [], // will be populated after kitchen loads
    uiOptions: { sessionMode: xrMode === 'ar' ? 'immersive-ar' : 'immersive-vr' },
  }).then((xr) => {
    // XR session active — head tracking replaces FreeCamera
    // Hand tracking support (if available)
    if (xr.input) {
      xr.input.onControllerAddedObservable.add((controller) => {
        controller.onMotionControllerInitObservable.add((mc) => {
          // Map squeeze to grab/release
          const squeeze = mc.getComponent('xr-standard-squeeze');
          if (squeeze) {
            squeeze.onButtonStateChangedObservable.add((component) => {
              if (component.pressed) {
                // Grab nearest mesh
              } else {
                // Release
              }
            });
          }
        });
      });
    }
  });
}
```

**Step 3: Verify**

```bash
npx tsc --noEmit
```

Expected: no errors. XR testing requires a WebXR-capable browser or headset.

**Step 4: Commit**

```bash
git add src/input/XRAdapter.ts src/components/GameWorld.web.tsx src/components/GameWorld.native.tsx
git commit -m "feat(input): add XRAdapter + WebXR scene integration

XRAdapter bridges hand tracking → grab/release, head tracking → look.
GameWorld creates XR experience when xrMode is 'ar' or 'vr'.
AR: immersive-ar session mode. VR: immersive-vr session mode.
Controller squeeze maps to grab/release (WebXR standard)."
```

---

## Verification Checklist

After all 11 tasks:

```bash
# 1. All tests pass
pnpm test -- --ci --forceExit

# 2. No type errors
npx tsc --noEmit

# 3. App builds
npx expo export --platform web --output-dir dist

# 4. Visual verification
npx expo start --web
```

Visual checks:
- [ ] Menu screen renders correctly
- [ ] Click NEW GAME → 3D sausage loading screen with progress
- [ ] Sausage model fades in as loading progresses
- [ ] Kitchen scene renders with Havok physics
- [ ] Fridge uses GLB mesh (not procedural box)
- [ ] Ingredient tap fires haptic (mobile)
- [ ] Gyro camera offset works (mobile with gyroEnabled)
- [ ] XR "Enter VR" button appears (WebXR-capable browser)
