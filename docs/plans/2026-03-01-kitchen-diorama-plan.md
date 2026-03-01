<!--
title: Kitchen Diorama Redesign — Implementation Plan
domain: plan
status: completed
engine: r3f
last-verified: 2026-03-01
depends-on: ["2026-03-01-kitchen-diorama-design.md"]
agent-context: scene-architect
summary: Task-by-task implementation of FurnitureLayout target system, FurnitureLoader GLB component, PBR room textures, grime decals, and wiring all stations to named targets.
-->

# Kitchen Diorama Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the monolithic kitchen.glb with a target-based placement system: named targets computed from room geometry, discrete GLB furniture segments snapped to targets, and all station components wired to targets instead of hardcoded coordinates.

**Architecture:** `FurnitureLayout.ts` defines targets as rules over room dimensions. `FurnitureLoader.tsx` loads GLB segments and positions them at resolved targets. Station components receive positions from targets via props. The existing procedural room shell (walls, floor, ceiling, lighting) stays intact.

**Tech Stack:** TypeScript, React Three Fiber, drei (useGLTF, useAnimations, useTexture), Zustand, Jest + @react-three/test-renderer, Biome, Blender (for GLB export)

**Design doc:** `docs/plans/2026-03-01-kitchen-diorama-design.md`

---

### Task 1: Create FurnitureLayout.ts — Target System

The core engine module. Pure TypeScript, no React dependencies, fully unit-testable.

**Files:**
- Create: `src/engine/FurnitureLayout.ts`
- Create: `src/engine/__tests__/FurnitureLayout.test.ts`

**Step 1: Write the failing tests**

Create `src/engine/__tests__/FurnitureLayout.test.ts`:

```ts
import {
  DEFAULT_ROOM,
  FURNITURE_RULES,
  resolveTargets,
  getStationTarget,
  STATION_TARGET_NAMES,
  type Target,
} from '../FurnitureLayout';

describe('FurnitureLayout', () => {
  describe('DEFAULT_ROOM', () => {
    it('has width, depth, and height', () => {
      expect(DEFAULT_ROOM.w).toBe(13);
      expect(DEFAULT_ROOM.d).toBe(13);
      expect(DEFAULT_ROOM.h).toBe(5.5);
    });
  });

  describe('resolveTargets', () => {
    it('returns a record of named targets', () => {
      const targets = resolveTargets(DEFAULT_ROOM);
      expect(typeof targets).toBe('object');
      expect(Object.keys(targets).length).toBeGreaterThan(0);
    });

    it('each target has position, rotationY, and triggerRadius', () => {
      const targets = resolveTargets(DEFAULT_ROOM);
      for (const [name, target] of Object.entries(targets)) {
        expect(target.position).toHaveLength(3);
        expect(typeof target.rotationY).toBe('number');
        expect(typeof target.triggerRadius).toBe('number');
      }
    });

    it('includes all 5 station targets', () => {
      const targets = resolveTargets(DEFAULT_ROOM);
      for (const name of STATION_TARGET_NAMES) {
        expect(targets[name]).toBeDefined();
        expect(targets[name].triggerRadius).toBeGreaterThan(0);
      }
    });

    it('includes decorative targets (no trigger radius)', () => {
      const targets = resolveTargets(DEFAULT_ROOM);
      expect(targets['trap-door']).toBeDefined();
      expect(targets['trap-door'].triggerRadius).toBe(0);
      expect(targets['trap-door'].position[1]).toBe(DEFAULT_ROOM.h);
    });

    it('positions are computed from room dimensions', () => {
      const small = resolveTargets({ w: 10, d: 10, h: 4 });
      const big = resolveTargets({ w: 20, d: 20, h: 6 });
      // Fridge should be closer to center in smaller room
      expect(small['fridge'].position[0]).toBeGreaterThan(big['fridge'].position[0]);
      // Trap door should be at ceiling height
      expect(small['trap-door'].position[1]).toBe(4);
      expect(big['trap-door'].position[1]).toBe(6);
    });

    it('includes markerY for station targets', () => {
      const targets = resolveTargets(DEFAULT_ROOM);
      for (const name of STATION_TARGET_NAMES) {
        expect(typeof targets[name].markerY).toBe('number');
        expect(targets[name].markerY).toBeGreaterThan(0);
      }
    });
  });

  describe('getStationTarget', () => {
    it('returns the target for a challenge index', () => {
      const targets = resolveTargets(DEFAULT_ROOM);
      const fridge = getStationTarget(targets, 0);
      expect(fridge).toBe(targets['fridge']);
      const grinder = getStationTarget(targets, 1);
      expect(grinder).toBe(targets['grinder']);
    });

    it('returns undefined for invalid index', () => {
      const targets = resolveTargets(DEFAULT_ROOM);
      expect(getStationTarget(targets, 99)).toBeUndefined();
    });
  });

  describe('FURNITURE_RULES', () => {
    it('is an array of rules with glb and target fields', () => {
      expect(Array.isArray(FURNITURE_RULES)).toBe(true);
      for (const rule of FURNITURE_RULES) {
        expect(typeof rule.glb).toBe('string');
        expect(typeof rule.target).toBe('string');
      }
    });

    it('every rule references a valid target name', () => {
      const targets = resolveTargets(DEFAULT_ROOM);
      for (const rule of FURNITURE_RULES) {
        expect(targets[rule.target]).toBeDefined();
      }
    });
  });
});
```

**Step 2: Run tests to verify they fail**

Run: `pnpm test -- --testPathPattern=FurnitureLayout --no-coverage`
Expected: FAIL — module `../FurnitureLayout` not found.

**Step 3: Implement FurnitureLayout.ts**

Create `src/engine/FurnitureLayout.ts`:

```ts
/**
 * FurnitureLayout — target-based placement system.
 *
 * Defines named targets computed from room dimensions. Furniture GLBs,
 * station components, and proximity triggers all reference targets by name.
 * No hardcoded world coordinates in any consumer.
 */

export interface RoomDimensions {
  w: number; // x-axis width
  d: number; // z-axis depth
  h: number; // y-axis height
}

export interface Target {
  position: [number, number, number];
  rotationY: number;
  triggerRadius: number;
  /** Y position for the station waypoint marker (only for station targets) */
  markerY?: number;
}

export interface FurnitureRule {
  glb: string;
  target: string;
  /** Optional: if true, this GLB has animations that FurnitureLoader should set up */
  animated?: boolean;
}

/** Default room dimensions matching current RoomEnclosure */
export const DEFAULT_ROOM: RoomDimensions = { w: 13, d: 13, h: 5.5 };

/**
 * The 5 gameplay station target names, in challenge order (0-4).
 * Used by ProximityTrigger and getStationTarget().
 */
export const STATION_TARGET_NAMES = [
  'fridge',    // Challenge 0: Ingredient selection
  'grinder',   // Challenge 1: Grinding
  'stuffer',   // Challenge 2: Stuffing
  'stove',     // Challenge 3: Cooking
  'crt-tv',    // Challenge 4: Tasting
] as const;

/**
 * Compute all named targets from room dimensions.
 * Positions are relative to room center at (0, 0, 0).
 */
export function resolveTargets(room: RoomDimensions): Record<string, Target> {
  const hw = room.w / 2; // half-width
  const hd = room.d / 2; // half-depth

  return {
    // --- Station targets (gameplay-critical, have triggerRadius) ---
    'fridge': {
      position: [-hw + 1.34, 0, -hd + 1.48],
      rotationY: Math.PI / 2,
      triggerRadius: 2.0,
      markerY: 2.5,
    },
    'grinder': {
      position: [-hw + 1.75, 0, hd - 6.86],
      rotationY: Math.PI / 2,
      triggerRadius: 1.5,
      markerY: 2.8,
    },
    'stuffer': {
      position: [hw - 4.22, 0, hd - 4.25],
      rotationY: 0,
      triggerRadius: 1.5,
      markerY: 3.5,
    },
    'stove': {
      position: [-hw + 1.52, 0, -hd + 4.27],
      rotationY: Math.PI / 2,
      triggerRadius: 1.5,
      markerY: 2.8,
    },
    'crt-tv': {
      position: [0, 2.5, -hd + 1.0],
      rotationY: 0,
      triggerRadius: 2.0,
      markerY: 3.5,
    },

    // --- Furniture targets (decorative, no trigger) ---
    'l-counter': {
      position: [-hw + 1.5, 0, 0],
      rotationY: Math.PI / 2,
      triggerRadius: 0,
    },
    'upper-cabinets': {
      position: [-hw + 0.3, 3.0, 0],
      rotationY: Math.PI / 2,
      triggerRadius: 0,
    },
    'island': {
      position: [2.0, 0, 2.0],
      rotationY: 0,
      triggerRadius: 0,
    },
    'table': {
      position: [hw - 2.5, 0, -hd + 2.5],
      rotationY: 0,
      triggerRadius: 0,
    },
    'trash-can': {
      position: [-hw + 1.8, 0, hd - 5.5],
      rotationY: 0,
      triggerRadius: 0,
    },
    'oven': {
      position: [-hw + 1.5, 0, -hd + 4.0],
      rotationY: Math.PI / 2,
      triggerRadius: 0,
    },
    'dishwasher': {
      position: [-hw + 1.5, 0, -hd + 2.5],
      rotationY: Math.PI / 2,
      triggerRadius: 0,
    },
    'spice-rack': {
      position: [-hw + 0.15, 2.5, -hd + 3.5],
      rotationY: Math.PI / 2,
      triggerRadius: 0,
    },
    'utensil-hooks': {
      position: [-hw + 0.15, 2.2, hd - 5.0],
      rotationY: Math.PI / 2,
      triggerRadius: 0,
    },
    'trap-door': {
      position: [0, room.h, 0],
      rotationY: 0,
      triggerRadius: 0,
    },
  };
}

/**
 * Get the target for a challenge index (0-4).
 * Returns undefined for invalid indices.
 */
export function getStationTarget(
  targets: Record<string, Target>,
  challengeIndex: number,
): Target | undefined {
  const name = STATION_TARGET_NAMES[challengeIndex];
  return name ? targets[name] : undefined;
}

/**
 * GLB-to-target mapping rules.
 * FurnitureLoader iterates these to load and position each segment.
 */
export const FURNITURE_RULES: FurnitureRule[] = [
  { glb: 'l_counter.glb', target: 'l-counter' },
  { glb: 'upper_cabinets.glb', target: 'upper-cabinets' },
  { glb: 'island.glb', target: 'island' },
  { glb: 'table_chairs.glb', target: 'table' },
  { glb: 'trash_can.glb', target: 'trash-can' },
  { glb: 'fridge.glb', target: 'fridge', animated: true },
  { glb: 'oven_range.glb', target: 'oven' },
  { glb: 'dishwasher.glb', target: 'dishwasher' },
  { glb: 'meat_grinder.glb', target: 'grinder', animated: true },
  { glb: 'spice_rack.glb', target: 'spice-rack' },
  { glb: 'utensil_hooks.glb', target: 'utensil-hooks' },
  { glb: 'trap_door.glb', target: 'trap-door' },
];
```

**Step 4: Run tests to verify they pass**

Run: `pnpm test -- --testPathPattern=FurnitureLayout --no-coverage`
Expected: PASS — all tests green.

**Step 5: Lint**

Run: `pnpm lint`
Expected: No errors in new files.

**Step 6: Commit**

```bash
git add src/engine/FurnitureLayout.ts src/engine/__tests__/FurnitureLayout.test.ts
git commit -m "feat: add FurnitureLayout target system

Defines named targets computed from room dimensions. All furniture,
station triggers, and proximity zones reference targets by name.
No hardcoded coordinates in any consumer."
```

---

### Task 2: Wire Station Components to Accept Position Props

Currently each station component has a hardcoded `*_POS` constant. Change them to accept an optional `position` prop that defaults to the current hardcoded value (for backwards compatibility during migration).

**Files:**
- Modify: `src/components/kitchen/GrinderStation.tsx:6,12`
- Modify: `src/components/kitchen/StufferStation.tsx:5-9,13`
- Modify: `src/components/kitchen/StoveStation.tsx:7-8,11`
- Modify: `src/components/kitchen/FridgeStation.tsx:6-7,17`
- Modify: `src/components/kitchen/CrtTelevision.tsx:41,49` (already has position prop — just update default)

**Step 1: Update GrinderStation**

In `src/components/kitchen/GrinderStation.tsx`, add `position` to the props interface and use it:

```ts
// Change the interface (around line 6):
interface GrinderStationProps {
  position?: [number, number, number]; // From target system
  grindProgress: number;
  crankAngle: number;
  isSplattering: boolean;
}

// Keep the constant as fallback default (line 12):
const DEFAULT_GRINDER_POS: [number, number, number] = [-4.75, 2.06, -0.64];

// Update the component signature (line 52):
export const GrinderStation = ({position = DEFAULT_GRINDER_POS, grindProgress, crankAngle, isSplattering}: GrinderStationProps) => {

// Update the return JSX to use the prop (line 172):
    <group position={position}>
```

**Step 2: Update StufferStation**

In `src/components/kitchen/StufferStation.tsx`:

```ts
// Change the interface (around line 5):
interface StufferStationProps {
  position?: [number, number, number];
  fillLevel: number;
  pressureLevel: number;
  isPressing: boolean;
  hasBurst: boolean;
}

// Rename constant (line 13):
const DEFAULT_STUFFER_POS: [number, number, number] = [2.28, 2.68, 2.25];

// Update component signature (line 54):
export const StufferStation = ({position = DEFAULT_STUFFER_POS, fillLevel, pressureLevel, isPressing, hasBurst}: StufferStationProps) => {

// Update return JSX (line 251):
    <group position={position}>
```

**Step 3: Update StoveStation**

In `src/components/kitchen/StoveStation.tsx`:

```ts
// Change the interface (around line 7):
interface StoveStationProps {
  position?: [number, number, number];
  temperature: number;
  heatLevel: number;
}

// Rename constant (line 11):
const DEFAULT_STOVE_POS: [number, number, number] = [-4.98, 2.13, -2.23];

// Update component signature (line 72):
export const StoveStation = ({position = DEFAULT_STOVE_POS, temperature, heatLevel}: StoveStationProps) => {

// Update return JSX (line 322):
    <group position={position}>
```

**Step 4: Update FridgeStation**

In `src/components/kitchen/FridgeStation.tsx`:

```ts
// Change the interface (around line 6):
interface FridgeStationProps {
  position?: [number, number, number];
  ingredients: Ingredient[];
  selectedIds: Set<number>;
  hintActive: boolean;
  matchingIndices: Set<number>;
  onSelect: (index: number) => void;
  onHover: (index: number | null) => void;
}

// Rename constant (line 17):
const DEFAULT_FRIDGE_POS: [number, number, number] = [-5.16, 1.79, -5.02];

// Update component signature (line 216):
export const FridgeStation = ({position = DEFAULT_FRIDGE_POS, ingredients, ...}: FridgeStationProps) => {

// Update return JSX (line 224):
    <group position={position}>
```

**Step 5: Run all tests**

Run: `pnpm test:ci`
Expected: All 256 tests pass (position props have defaults, so no consumer changes needed yet).

**Step 6: Lint**

Run: `pnpm lint`

**Step 7: Commit**

```bash
git add src/components/kitchen/GrinderStation.tsx src/components/kitchen/StufferStation.tsx src/components/kitchen/StoveStation.tsx src/components/kitchen/FridgeStation.tsx
git commit -m "refactor: add optional position prop to all station components

Each station component now accepts an optional position prop,
defaulting to its current hardcoded value. Prepares for target
system wiring without breaking existing behavior."
```

---

### Task 3: Wire GameWorld.tsx to Use Targets

Replace hardcoded `STATION_TRIGGERS` with target-derived values. Pass target positions to station components and CrtTelevision.

**Files:**
- Modify: `src/components/GameWorld.tsx:1-28,34-53,59-183`
- Modify: `src/components/__tests__/GameWorld.test.tsx`

**Step 1: Update GameWorld.tsx imports and target resolution**

At the top of `src/components/GameWorld.tsx`, add:

```ts
import {DEFAULT_ROOM, resolveTargets, getStationTarget, STATION_TARGET_NAMES} from '../engine/FurnitureLayout';
```

Replace the hardcoded `STATION_TRIGGERS` constant (lines 22-28) with:

```ts
/** Resolve all targets from room dimensions */
const TARGETS = resolveTargets(DEFAULT_ROOM);

/** Station trigger data derived from targets (challenge order 0-4) */
const STATION_TRIGGERS = STATION_TARGET_NAMES.map(name => {
  const t = TARGETS[name];
  return {
    center: [t.position[0], t.position[2]] as [number, number],
    radius: t.triggerRadius,
    markerY: t.markerY ?? 3.0,
  };
});
```

**Step 2: Pass target positions to station components in SceneContent**

In the `SceneContent` component's return JSX, update station components to receive positions from targets:

```tsx
<CrtTelevision
  reaction={gameStatus === 'defeat' ? 'laugh' : mrSausageReaction}
  position={TARGETS['crt-tv'].position}
/>

<FridgeStation
  position={TARGETS['fridge'].position}
  ingredients={fridgePool}
  // ... rest of props unchanged
/>
<GrinderStation
  position={TARGETS['grinder'].position}
  grindProgress={isGrinderActive ? challengeProgress : 0}
  // ... rest of props unchanged
/>
<StufferStation
  position={TARGETS['stuffer'].position}
  fillLevel={isStufferActive ? challengeProgress : 0}
  // ... rest of props unchanged
/>
<StoveStation
  position={TARGETS['stove'].position}
  temperature={isStoveActive ? challengeTemperature : 70}
  // ... rest of props unchanged
/>
```

**Step 3: Update GameWorld.test.tsx**

In `src/components/__tests__/GameWorld.test.tsx`, update the test that checks for `STATION_TRIGGERS`:

Replace:
```ts
  it('defines proximity trigger zones for all 5 stations', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    expect(source).toContain('STATION_TRIGGERS');
    expect(source).toContain('ProximityTrigger');
    // Should have comments for all 5 stations
    expect(source).toContain('Fridge');
    expect(source).toContain('Grinder');
    expect(source).toContain('Stuffer');
    expect(source).toContain('Stove');
    expect(source).toContain('CRT TV');
  });
```

With:
```ts
  it('uses target system for station placement', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    expect(source).toContain('resolveTargets');
    expect(source).toContain('STATION_TARGET_NAMES');
    expect(source).toContain('ProximityTrigger');
    // Should NOT have hardcoded station coordinate arrays
    expect(source).not.toContain('center: [-5.16');
    expect(source).not.toContain('center: [-4.75');
  });

  it('imports FurnitureLayout', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../GameWorld.tsx'), 'utf8');
    expect(source).toContain('FurnitureLayout');
  });
```

**Step 4: Run all tests**

Run: `pnpm test:ci`
Expected: All tests pass. Station positions now come from targets but resolve to the same approximate world positions (we encoded the current positions into the target rules).

**Step 5: Lint**

Run: `pnpm lint`

**Step 6: Commit**

```bash
git add src/components/GameWorld.tsx src/components/__tests__/GameWorld.test.tsx
git commit -m "refactor: wire GameWorld to target system

Replace hardcoded STATION_TRIGGERS with values derived from
resolveTargets(). Pass target positions to all station components
and CrtTelevision. No more hardcoded coordinates in GameWorld."
```

---

### Task 4: Update Station Component Tests

The existing station tests check for hardcoded position values (e.g. `expect(root.instance.position.x).toBe(-4.75)`). Update them to import from FurnitureLayout and check against resolved target positions.

**Files:**
- Modify: `src/components/kitchen/__tests__/GrinderStation.test.tsx:12-19`
- Modify: `src/components/kitchen/__tests__/StufferStation.test.tsx` (if similar position check exists)
- Modify: `src/components/kitchen/__tests__/StoveStation.test.tsx` (if similar)
- Modify: `src/components/kitchen/__tests__/FridgeStation.test.tsx` (if similar)

**Step 1: Update GrinderStation.test.tsx**

The test at line 12 checks `position.x === -4.75`. Update to:

```ts
import {DEFAULT_ROOM, resolveTargets} from '../../../engine/FurnitureLayout';

// In the test:
  it('renders the root group at the default grinder position', async () => {
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderStation grindProgress={0} crankAngle={0} isSplattering={false} />,
    );
    const root = renderer.scene.children[0];
    const targets = resolveTargets(DEFAULT_ROOM);
    const [x, y, z] = targets['grinder'].position;
    expect(root.instance.position.x).toBeCloseTo(x, 1);
    expect(root.instance.position.y).toBeCloseTo(y, 1);
    expect(root.instance.position.z).toBeCloseTo(z, 1);
  });

  it('accepts a custom position prop', async () => {
    const customPos: [number, number, number] = [1, 2, 3];
    const renderer = await ReactThreeTestRenderer.create(
      <GrinderStation position={customPos} grindProgress={0} crankAngle={0} isSplattering={false} />,
    );
    const root = renderer.scene.children[0];
    expect(root.instance.position.x).toBe(1);
    expect(root.instance.position.y).toBe(2);
    expect(root.instance.position.z).toBe(3);
  });
```

**Step 2: Check and update other station tests similarly**

Read each station test file. If it checks hardcoded positions, update the same way. If it doesn't, add a test for the custom position prop.

**Step 3: Run all tests**

Run: `pnpm test:ci`
Expected: All tests pass.

**Step 4: Commit**

```bash
git add src/components/kitchen/__tests__/
git commit -m "test: update station tests to use target system

Station tests now validate positions against resolved targets
instead of hardcoded coordinates. Added tests for custom position
prop on each station component."
```

---

### Task 5: Create FurnitureLoader Component

A new R3F component that loads all GLB segments and positions them at their resolved targets. Handles fridge door and grinder crank animations.

**Files:**
- Create: `src/components/kitchen/FurnitureLoader.tsx`
- Create: `src/components/kitchen/__tests__/FurnitureLoader.test.tsx`

**Step 1: Write the test**

Create `src/components/kitchen/__tests__/FurnitureLoader.test.tsx`:

```tsx
import {FurnitureLoader} from '../FurnitureLoader';

// Mock drei hooks (same pattern as KitchenEnvironment.test.tsx)
jest.mock('@react-three/drei', () => ({
  useGLTF: jest.fn(() => ({
    scene: {
      clone: jest.fn(() => ({ traverse: jest.fn() })),
      traverse: jest.fn(),
    },
    animations: [],
  })),
  useAnimations: jest.fn(() => ({
    actions: {},
    mixer: { stopAllAction: jest.fn() },
  })),
}));

describe('FurnitureLoader', () => {
  it('exports a FurnitureLoader component', () => {
    expect(FurnitureLoader).toBeDefined();
    expect(typeof FurnitureLoader).toBe('function');
  });

  it('imports from FurnitureLayout', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../FurnitureLoader.tsx'), 'utf8');
    expect(source).toContain('FurnitureLayout');
    expect(source).toContain('resolveTargets');
    expect(source).toContain('FURNITURE_RULES');
  });

  it('uses useGLTF to load GLB files', () => {
    const fs = require('node:fs');
    const path = require('node:path');
    const source = fs.readFileSync(path.resolve(__dirname, '../FurnitureLoader.tsx'), 'utf8');
    expect(source).toContain('useGLTF');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `pnpm test -- --testPathPattern=FurnitureLoader --no-coverage`
Expected: FAIL — module not found.

**Step 3: Implement FurnitureLoader.tsx**

Create `src/components/kitchen/FurnitureLoader.tsx`:

```tsx
import {useAnimations, useGLTF} from '@react-three/drei';
import {useEffect, useRef} from 'react';
import * as THREE from 'three/webgpu';
import {getAssetUrl} from '../../engine/assetUrl';
import {
  DEFAULT_ROOM,
  FURNITURE_RULES,
  resolveTargets,
  type FurnitureRule,
  type Target,
} from '../../engine/FurnitureLayout';

const TARGETS = resolveTargets(DEFAULT_ROOM);

/** Load and position a single GLB furniture segment at its target */
function FurnitureSegment({
  rule,
  target,
  fridgeDoorOpen,
  grinderCranking,
}: {
  rule: FurnitureRule;
  target: Target;
  fridgeDoorOpen: boolean;
  grinderCranking: boolean;
}) {
  const modelUrl = getAssetUrl('models', rule.glb);
  const {scene, animations} = useGLTF(modelUrl);
  const groupRef = useRef<THREE.Group>(null);
  const {actions} = useAnimations(animations, groupRef);

  // Material setup: cull backfaces, tame env map on bright surfaces
  useEffect(() => {
    scene.traverse((child: any) => {
      if (child.isMesh && child.material?.isMeshStandardMaterial) {
        child.material.side = THREE.FrontSide;
        child.material.envMapIntensity = 0.05;
      }
    });
  }, [scene]);

  // Fridge door animation (only for fridge.glb)
  useEffect(() => {
    if (rule.glb !== 'fridge.glb') return;
    const doorAction =
      actions.FridgeArmatureAction ??
      actions['Armature|Armature|ArmatureAction'] ??
      Object.values(actions).find(a => a !== null && a !== actions.CrankPivotAction);
    if (!doorAction) return;

    doorAction.clampWhenFinished = true;
    doorAction.setLoop(THREE.LoopOnce, 1);

    if (fridgeDoorOpen) {
      doorAction.timeScale = 1;
      doorAction.reset().play();
    } else {
      doorAction.timeScale = -1;
      doorAction.paused = false;
    }
  }, [fridgeDoorOpen, actions, rule.glb]);

  // Grinder crank animation (only for meat_grinder.glb)
  useEffect(() => {
    if (rule.glb !== 'meat_grinder.glb') return;
    const crankAction = actions.CrankPivotAction;
    if (!crankAction) return;

    if (grinderCranking) {
      crankAction.setLoop(THREE.LoopRepeat, Infinity);
      crankAction.reset().play();
    } else {
      crankAction.stop();
    }
  }, [grinderCranking, actions, rule.glb]);

  return (
    <group
      ref={groupRef}
      position={target.position}
      rotation={[0, target.rotationY, 0]}
    >
      <primitive object={scene} />
    </group>
  );
}

/**
 * FurnitureLoader — loads all GLB furniture segments and
 * positions them at their resolved targets.
 */
export function FurnitureLoader({
  fridgeDoorOpen = false,
  grinderCranking = false,
}: {
  fridgeDoorOpen?: boolean;
  grinderCranking?: boolean;
}) {
  return (
    <>
      {FURNITURE_RULES.map(rule => {
        const target = TARGETS[rule.target];
        if (!target) return null;
        return (
          <FurnitureSegment
            key={rule.glb}
            rule={rule}
            target={target}
            fridgeDoorOpen={fridgeDoorOpen}
            grinderCranking={grinderCranking}
          />
        );
      })}
    </>
  );
}
```

**Step 4: Run tests**

Run: `pnpm test -- --testPathPattern=FurnitureLoader --no-coverage`
Expected: PASS.

**Step 5: Lint**

Run: `pnpm lint`

**Step 6: Commit**

```bash
git add src/components/kitchen/FurnitureLoader.tsx src/components/kitchen/__tests__/FurnitureLoader.test.tsx
git commit -m "feat: add FurnitureLoader component

Loads all GLB furniture segments and positions them at named
targets. Handles fridge door and grinder crank animations.
Replaces the monolithic KitchenModel GLB loader."
```

---

### Task 6: Refactor KitchenEnvironment — Remove KitchenModel, Add FurnitureLoader

Remove the `KitchenModel` component (monolithic GLB loader) from KitchenEnvironment.tsx. Replace it with `FurnitureLoader`. The room enclosure, grime decals, and lighting stay.

**Files:**
- Modify: `src/components/kitchen/KitchenEnvironment.tsx:1-7,237-342,385-487`

**Step 1: Update imports**

Add FurnitureLoader import, remove useAnimations import (no longer needed here):

```ts
import {useGLTF, useTexture} from '@react-three/drei'; // remove useAnimations
import {FurnitureLoader} from './FurnitureLoader';
```

**Step 2: Delete the KitchenModel component**

Remove the entire `KitchenModel` function (lines 241-342). This includes:
- The `useGLTF` call for kitchen.glb
- The `useAnimations` hook
- Material override traversal
- Fridge door animation effect
- Grinder crank animation effect
- The `sceneReady` signal

**Step 3: Move sceneReady signal to FurnitureLoader**

In `FurnitureLoader.tsx`, add a `useEffect` that signals scene ready after all segments are loaded. Add to the `FurnitureLoader` component:

```ts
useEffect(() => {
  if (typeof window !== 'undefined' && (window as any).__gov) {
    (window as any).__gov.sceneReady = true;
  }
}, []);
```

**Step 4: Replace KitchenModel usage in KitchenEnvironment**

In the `KitchenEnvironment` return JSX, replace:
```tsx
<KitchenModel fridgeDoorOpen={fridgeDoorOpen} grinderCranking={grinderCranking} />
```
With:
```tsx
<FurnitureLoader fridgeDoorOpen={fridgeDoorOpen} grinderCranking={grinderCranking} />
```

**Step 5: Also remove useAnimations from the drei mock in KitchenEnvironment.test.tsx if it's no longer needed**

Check `src/components/kitchen/__tests__/KitchenEnvironment.test.tsx` — the mock still provides `useAnimations` which is used by `FurnitureLoader` (imported transitively). Keep the mock as-is.

**Step 6: Run all tests**

Run: `pnpm test:ci`
Expected: All tests pass. The KitchenEnvironment tests check for room geometry (floor, ceiling, walls, lights) — those are unchanged. The GLB-specific behavior is now in FurnitureLoader.

**Step 7: Lint**

Run: `pnpm lint`

**Step 8: Commit**

```bash
git add src/components/kitchen/KitchenEnvironment.tsx src/components/kitchen/FurnitureLoader.tsx
git commit -m "refactor: replace KitchenModel with FurnitureLoader

Remove the monolithic kitchen.glb loader from KitchenEnvironment.
The room enclosure, grime decals, and lighting stay procedural.
GLB furniture segments are now loaded by FurnitureLoader."
```

---

### Task 7: Export GLB Segments from Blender

This is a Blender task using the Blender MCP tools or manual Blender work. Export each furniture group from `kitchen-scene.blend` as a standalone Draco-compressed GLB.

**Files:**
- Read: `kitchen-scene.blend` (existing Blender source)
- Create: `public/models/l_counter.glb`
- Create: `public/models/upper_cabinets.glb`
- Create: `public/models/island.glb`
- Create: `public/models/table_chairs.glb`
- Create: `public/models/trash_can.glb`
- Create: `public/models/oven_range.glb`
- Create: `public/models/dishwasher.glb`
- Create: `public/models/spice_rack.glb`
- Create: `public/models/utensil_hooks.glb`
- Create: `public/models/trap_door.glb`
- Keep: `public/models/fridge.glb` (already exists)
- Keep: `public/models/meat_grinder.glb` (already exists)

**Step 1: Open kitchen-scene.blend in Blender**

**Step 2: For each furniture group:**

1. Select all objects in the group
2. File → Export → glTF 2.0 (.glb)
3. Settings:
   - Format: Binary (.glb)
   - Include: Selected Objects only
   - Transform: +Y Up (default)
   - Geometry: Apply Modifiers = OFF (preserve armatures)
   - Compression: Draco = ON, level 6
4. Save to `public/models/<segment_name>.glb`

**Step 3: Create the trap door**

This is a new object — a flat rectangular steel plate with bolt heads:
1. Create a box: 1.2 x 0.08 x 0.8 (width x thickness x depth)
2. Add 4 small cylinders as bolt heads at corners
3. Apply an AmbientCG Metal PBR material (e.g. Metal008 — brushed steel)
4. Export as `trap_door.glb` with Draco compression

**Step 4: Verify all GLBs load**

Start the dev server and verify the scene loads without errors:
```bash
npx expo start --web --clear
```

Open browser, check console for any 404 errors on GLB loads.

**Step 5: Remove the monolithic kitchen.glb**

```bash
rm public/models/kitchen.glb public/models/kitchen-original.glb
```

**Step 6: Update FurnitureLayout target positions**

After seeing the segments in-game, adjust target positions in `FurnitureLayout.ts` so furniture lands where it should. The initial positions are educated guesses from the original kitchen.glb; they may need tuning by ±0.5 units.

**Step 7: Commit**

```bash
git add public/models/ src/engine/FurnitureLayout.ts
git rm public/models/kitchen.glb public/models/kitchen-original.glb
git commit -m "feat: explode kitchen.glb into discrete furniture segments

Export each furniture group as a standalone Draco-compressed GLB.
Add trap door model. Remove monolithic kitchen.glb (15MB) in favor
of ~12 small segments (~7MB total)."
```

---

### Task 8: Swap Room Textures to AmbientCG

Replace the current hand-picked room textures with AmbientCG PBR materials. Copy selected textures from `/Volumes/home/assets/AmbientCG/Assets/MATERIAL/1K-JPG/` to `public/textures/`.

**Files:**
- Modify: `src/components/kitchen/KitchenEnvironment.tsx:91-136` (texture paths in `useRoomTextures`)
- Add: new texture files to `public/textures/`
- Remove: old texture files from `public/textures/` (after swap)

**Step 1: Browse AmbientCG and select materials**

Visually inspect the AmbientCG library for:
- **Floor:** A `Tiles0XX` with black and white grimy pattern (e.g. `Tiles006`, `Tiles019`)
- **Backsplash:** A `Tiles0XX` subway tile or small square tile (e.g. `Tiles001`, `Tiles013`)
- **Upper walls / Ceiling:** A `Concrete0XX` or `PaintedPlaster0XX` that looks stained/grimy
- **Trap door surface:** A `Metal0XX` with brushed/scratched steel look

**Step 2: Copy selected texture files**

For each material, copy the `_Color.jpg`, `_NormalGL.jpg`, and `_Roughness.jpg` files to `public/textures/`. Rename to follow the existing convention:

```bash
# Example (actual material IDs selected during visual inspection):
cp /Volumes/home/assets/AmbientCG/Assets/MATERIAL/1K-JPG/Tiles019/Tiles019_1K-JPG_Color.jpg public/textures/tile_floor_color.jpg
cp /Volumes/home/assets/AmbientCG/Assets/MATERIAL/1K-JPG/Tiles019/Tiles019_1K-JPG_NormalGL.jpg public/textures/tile_floor_normal.jpg
cp /Volumes/home/assets/AmbientCG/Assets/MATERIAL/1K-JPG/Tiles019/Tiles019_1K-JPG_Roughness.jpg public/textures/tile_floor_roughness.jpg
# ... repeat for wall, concrete, etc.
```

**Step 3: Update texture paths in KitchenEnvironment.tsx if filenames change**

If keeping the same filenames (overwriting), no code changes needed. If using new names, update `useRoomTextures()`.

**Step 4: Verify visually**

Start dev server and confirm the room looks right:
```bash
npx expo start --web --clear
```

**Step 5: Commit**

```bash
git add public/textures/
git commit -m "art: swap room textures to AmbientCG PBR materials

Replace floor, wall, and ceiling textures with AmbientCG PBR sets
for a grittier, more atmospheric horror kitchen look."
```

---

### Task 9: Remove Hardcoded Position Constants from Station Components

Now that GameWorld passes positions from targets, the fallback default constants in station components are dead code. Clean them up.

**Files:**
- Modify: `src/components/kitchen/GrinderStation.tsx` — remove `DEFAULT_GRINDER_POS`, make `position` required
- Modify: `src/components/kitchen/StufferStation.tsx` — remove `DEFAULT_STUFFER_POS`, make `position` required
- Modify: `src/components/kitchen/StoveStation.tsx` — remove `DEFAULT_STOVE_POS`, make `position` required
- Modify: `src/components/kitchen/FridgeStation.tsx` — remove `DEFAULT_FRIDGE_POS`, make `position` required
- Modify: station tests — update to always pass position prop

**Step 1: In each station component**

Remove the `DEFAULT_*_POS` constant. Change `position?` to `position` (required) in the interface. Remove the default value from the destructuring.

Example for GrinderStation:
```ts
interface GrinderStationProps {
  position: [number, number, number]; // Required — from target system
  grindProgress: number;
  crankAngle: number;
  isSplattering: boolean;
}

// Delete: const DEFAULT_GRINDER_POS = ...

export const GrinderStation = ({position, grindProgress, crankAngle, isSplattering}: GrinderStationProps) => {
```

**Step 2: Update all station tests to pass position**

In each test file, import targets and pass position:

```ts
import {DEFAULT_ROOM, resolveTargets} from '../../../engine/FurnitureLayout';
const TARGETS = resolveTargets(DEFAULT_ROOM);

// In each test:
<GrinderStation
  position={TARGETS['grinder'].position}
  grindProgress={0}
  crankAngle={0}
  isSplattering={false}
/>
```

**Step 3: Run all tests**

Run: `pnpm test:ci`
Expected: All tests pass.

**Step 4: Lint**

Run: `pnpm lint`

**Step 5: Commit**

```bash
git add src/components/kitchen/ src/components/kitchen/__tests__/
git commit -m "refactor: remove hardcoded position constants from stations

All station components now require a position prop from the target
system. No more fallback constants — positions are always derived
from FurnitureLayout targets."
```

---

### Task 10: Full Verification

Run the complete test suite, linting, and E2E tests to verify everything works end-to-end.

**Step 1: Unit tests**

Run: `pnpm test:ci`
Expected: All tests pass (should be 256+ after adding FurnitureLayout and FurnitureLoader tests).

**Step 2: Lint + format**

Run: `pnpm lint`
Expected: Clean.

**Step 3: TypeScript**

Run: `npx tsc --noEmit` (may stack overflow due to known Three.js issue — that's OK, it's pre-existing).

**Step 4: Dev server smoke test**

```bash
npx expo start --web --clear
```

Open browser, verify:
- Scene loads without console errors
- Furniture segments visible at correct positions
- FPS movement works
- Station proximity triggers activate correctly
- Fridge door opens/closes
- Grinder crank animates
- CRT TV renders with shader
- Trap door visible on ceiling

**Step 5: E2E tests**

```bash
pnpm test:e2e
```

Expected: Playthrough and scene interaction tests pass. GameGovernor still works since it drives the Zustand store, not the 3D layout.

**Step 6: Document the change**

Update CLAUDE.md key files table if needed to reflect the new files (`FurnitureLayout.ts`, `FurnitureLoader.tsx`).

**Step 7: Final commit if any fixes needed**

```bash
git add -A
git commit -m "chore: final verification and cleanup for kitchen diorama"
```
