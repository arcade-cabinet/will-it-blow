# Sausage Factory Kitchen — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the horror sausage-making game — full bore, no deferrals. Replace bloated GLBs, port ALL factory mechanics from the POC, add GPU particle systems, post-processing horror atmosphere, Skia loading animation, and Rapier spring-joint sausage physics.

**Architecture:** Five-phase approach: (0) Foundation — install ecosystem libraries + fix Expo issues, (1) Asset swap + title screen, (2) Room expansion + horror atmosphere + post-processing, (3) Full procedural factory system with TSL compute + Rapier springs, (4) Game flow integration + Skia loading screen + polish. Each phase is independently shippable.

**Tech Stack:** React Three Fiber 9.5, Three.js 0.183 (WebGPU + TSL), @react-three/rapier 2.2 (spring joints), @react-three/postprocessing 3.0.4, maath (damp3), @shopify/react-native-skia, expo-keep-awake, Zustand 5, Expo 55, React Native 0.83.

**Design Doc:** `docs/plans/2026-03-01-sausage-factory-kitchen-design.md`

**POC Reference:** `sausage_factory.html` (594 lines) — all factory mechanics proven here.

**Asset Library:** `/Volumes/home/assets/kitchen/` — 179 GLBs, 138 WAVs, PBR textures.

---

## New Dependencies (install in Task 0)

| Package | Purpose | Size |
|---------|---------|------|
| `maath` | `damp3` framerate-independent smooth transitions (bowl slide, sausage carry) | ~10KB |
| `@react-three/postprocessing` | Bloom, Vignette, ChromaticAberration, Noise — horror atmosphere | ~100KB |
| `@shopify/react-native-skia` | GPU-accelerated 2D canvas for loading screen sausage animation | ~2.9MB (WASM) |
| `expo-keep-awake` | Prevent screen sleep during gameplay on mobile | ~2KB |
| `expo-screen-orientation` | Lock to landscape on mobile | ~5KB |
| `expo-linear-gradient` | Horror UI vignette overlays | ~3KB |
| `expo-blur` | Modal blur backdrop for pause/verdict screens | ~5KB |
| `react-native-reanimated` | UI thread animations for overlays (60fps guaranteed) | ~200KB |
| `tsl-textures` | GPU procedural textures (meat, grease, organic patterns) via TSL | ~15KB |
| `three-mesh-bvh` | Accelerated raycasting for ingredient picking in fridge | ~50KB |

**Removed from plan:** anime.js (replaced by `maath` damp3), @react-spring/three (maath is lighter + game-loop native), any GLSL ShaderMaterial approaches (TSL only for WebGPU compat).

**Expo fix:** Migrate `expo-av` → `expo-audio` (expo-av removed in SDK 55).

---

## Phase 0: Foundation — Dependencies + Expo Fixes

---

### Task 0: Install Dependencies + Fix expo-av

**Files:**
- Modify: `package.json`
- Modify: `src/engine/AudioEngine.web.ts` (if expo-av referenced)
- Modify: `src/engine/AudioEngine.ts` (if expo-av referenced)

**Step 1: Install new dependencies**

```bash
pnpm add maath @react-three/postprocessing @shopify/react-native-skia \
  expo-keep-awake expo-screen-orientation expo-linear-gradient expo-blur \
  react-native-reanimated tsl-textures three-mesh-bvh
```

**Step 2: Replace expo-av with expo-audio**

```bash
pnpm remove expo-av
pnpm add expo-audio
```

Audit `src/` for any `expo-av` imports and replace:
```typescript
// OLD
import { Audio } from 'expo-av';
// NEW
import { useAudioPlayer } from 'expo-audio';
```

Note: The project uses Tone.js (web) and a no-op stub (native) for audio, so `expo-av` may only be a vestigial dependency. If no source files import it, just remove from package.json.

**Step 3: Setup Skia for web**

```bash
npx setup-skia-web
```

This copies `canvaskit.wasm` to `public/`. Verify it exists:

```bash
ls public/canvaskit.wasm
```

**Step 4: Add expo-keep-awake to GameWorld**

In `src/components/GameWorld.tsx`, add at the top of the `SceneContent` component:

```typescript
import { useKeepAwake } from 'expo-keep-awake';

// Inside SceneContent:
useKeepAwake();
```

**Step 5: Run tests**

```bash
pnpm test:ci
```

Expected: PASS. May need to add mocks for new packages in `jest.config.js`:

```javascript
moduleNameMapper: {
  // ... existing mocks ...
  '^@shopify/react-native-skia$': '<rootDir>/__mocks__/react-native-skia.js',
  '^expo-keep-awake$': '<rootDir>/__mocks__/expo-keep-awake.js',
},
```

Create minimal mocks:

```javascript
// __mocks__/expo-keep-awake.js
module.exports = { useKeepAwake: () => {}, activateKeepAwakeAsync: async () => {}, deactivateKeepAwakeAsync: async () => {} };

// __mocks__/react-native-skia.js
module.exports = {};
```

**Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml __mocks__/ jest.config.js \
  src/components/GameWorld.tsx public/canvaskit.wasm
git commit -m "feat: install ecosystem dependencies, fix expo-av removal, add keep-awake"
```

---

## Phase 1: Asset Swap + Title Screen

---

### Task 1: Copy Replacement GLBs to public/models/

Copy tiny Quaternius/Styloo replacements from the global asset library. Also copy horror props and food GLBs.

**Files:**
- Copy: Furniture replacements (13 GLBs, ~200KB total)
- Copy: Horror props (11 GLBs, ~150KB total)
- Copy: Food items for fridge (15 GLBs, ~100KB total)

**Step 1: Copy furniture replacements**

```bash
cp /Volumes/home/assets/kitchen/models/furniture/kitchen_oven_large.glb public/models/
cp /Volumes/home/assets/kitchen/models/furniture/kitchen_cabinet1.glb public/models/
cp /Volumes/home/assets/kitchen/models/furniture/kitchen_cabinet2.glb public/models/
cp /Volumes/home/assets/kitchen/models/furniture/workplan.glb public/models/
cp /Volumes/home/assets/kitchen/models/furniture/workplan_001.glb public/models/
cp /Volumes/home/assets/kitchen/models/furniture/workplan_002.glb public/models/
cp /Volumes/home/assets/kitchen/models/furniture/trashcan_cylindric.glb public/models/
cp /Volumes/home/assets/kitchen/models/furniture/table.glb public/models/table_styloo.glb
cp /Volumes/home/assets/kitchen/models/furniture/chair1.glb public/models/chair_styloo.glb
cp /Volumes/home/assets/kitchen/models/furniture/shelf_small1.glb public/models/shelf_small.glb
cp /Volumes/home/assets/kitchen/models/furniture/whashing_machine.glb public/models/washing_machine.glb
cp /Volumes/home/assets/kitchen/models/utensils/poseustensils.glb public/models/utensil_holder.glb
cp /Volumes/home/assets/kitchen/models/furniture/bartable.glb public/models/island_counter.glb
```

**Step 2: Copy horror props**

```bash
cp /Volumes/home/assets/kitchen/models/props/worm.glb public/models/
cp /Volumes/home/assets/kitchen/models/props/blobfish.glb public/models/
cp /Volumes/home/assets/kitchen/models/props/piranha.glb public/models/
cp /Volumes/home/assets/kitchen/models/props/beartrap_open.glb public/models/
cp /Volumes/home/assets/kitchen/models/props/tapetteamouche.glb public/models/
cp /Volumes/home/assets/kitchen/models/props/can_broken.glb public/models/
cp /Volumes/home/assets/kitchen/models/props/bandages.glb public/models/
cp /Volumes/home/assets/kitchen/models/props/matchbox.glb public/models/
cp /Volumes/home/assets/kitchen/models/props/postit.glb public/models/
cp /Volumes/home/assets/kitchen/models/props/fridgeletter.glb public/models/
cp /Volumes/home/assets/kitchen/models/props/knife.glb public/models/prop_knife.glb
```

**Step 3: Copy food GLBs for fridge**

```bash
for item in steak egg_whole bacon_uncooked mushroom pepper_red carrot broccoli \
  tomato cheese_singles sausage_raw tentacle fishbone eggplant lettuce chickenleg; do
  cp "/Volumes/home/assets/kitchen/models/food/${item}.glb" "public/models/food_${item}.glb"
done
```

**Step 4: Verify sizes**

```bash
du -sh public/models/ && ls public/models/*.glb | wc -l
```

Expected: <5MB total, ~55+ GLB files.

**Step 5: Commit**

```bash
git add public/models/
git commit -m "feat: add tiny replacement GLBs, horror props, and food items from asset library"
```

---

### Task 2: Update FurnitureLayout.ts — New Rules + Horror Targets

Replace bloated GLB references in `FURNITURE_RULES` with new lightweight alternatives. Add horror prop and food placement targets.

**Files:**
- Modify: `src/engine/FurnitureLayout.ts:54` (DEFAULT_ROOM — keep 13×13 for now)
- Modify: `src/engine/FurnitureLayout.ts:369-402` (FURNITURE_RULES)
- Modify: `src/engine/FurnitureLayout.ts:228-336` (resolveTargets — add targets)
- Test: `src/engine/__tests__/FurnitureLayout.test.ts`

**Step 1: Write test for no bloated GLBs**

Add to `FurnitureLayout.test.ts`:

```typescript
describe('updated FURNITURE_RULES', () => {
  const BLOATED = [
    'l_counter.glb', 'oven_range.glb', 'upper_cabinets.glb',
    'utensil_hooks.glb', 'island.glb', 'dishwasher.glb',
    'trash_can.glb', 'table_chairs.glb', 'spice_rack.glb',
    'sausage.glb',
  ];

  it('should not reference any bloated GLBs', () => {
    for (const rule of FURNITURE_RULES) {
      expect(BLOATED).not.toContain(rule.glb);
    }
  });

  it('should have horror prop targets', () => {
    const targets = resolveTargets(DEFAULT_ROOM);
    expect(targets['bear-trap']).toBeDefined();
    expect(targets['worm']).toBeDefined();
    expect(targets['fly-swatter']).toBeDefined();
  });

  it('every rule target must exist in resolveTargets', () => {
    const targets = resolveTargets(DEFAULT_ROOM);
    for (const rule of FURNITURE_RULES) {
      expect(targets[rule.target]).toBeDefined();
    }
  });
});
```

**Step 2: Run test — expect FAIL**

```bash
pnpm test -- --testPathPattern='FurnitureLayout' --verbose
```

**Step 3: Update FURNITURE_RULES**

Replace the array at line 369 with new rules referencing the lightweight GLBs. Remove all 10 bloated GLB references. Add horror prop rules. (See design doc Section 2 for full mapping.)

Core furniture rules (11 entries replacing the bloated ones):
```typescript
{glb: 'workplan.glb', target: 'l-counter'},
{glb: 'workplan_001.glb', target: 'l-counter-ext'},
{glb: 'kitchen_cabinet1.glb', target: 'upper-cabinets'},
{glb: 'kitchen_cabinet2.glb', target: 'upper-cabinets-2'},
{glb: 'island_counter.glb', target: 'island'},
{glb: 'table_styloo.glb', target: 'table'},
{glb: 'chair_styloo.glb', target: 'chair-extra'},
{glb: 'trashcan_cylindric.glb', target: 'trash-can'},
{glb: 'kitchen_oven_large.glb', target: 'oven'},
{glb: 'washing_machine.glb', target: 'dishwasher'},
{glb: 'utensil_holder.glb', target: 'utensil-hooks'},
{glb: 'shelf_small.glb', target: 'spice-rack'},
```

Horror prop rules (9 entries — new):
```typescript
{glb: 'beartrap_open.glb', target: 'bear-trap'},
{glb: 'worm.glb', target: 'worm'},
{glb: 'tapetteamouche.glb', target: 'fly-swatter'},
{glb: 'can_broken.glb', target: 'broken-can'},
{glb: 'bandages.glb', target: 'bandages'},
{glb: 'matchbox.glb', target: 'matchbox'},
{glb: 'postit.glb', target: 'postit-note'},
{glb: 'fridgeletter.glb', target: 'fridge-letters'},
{glb: 'prop_knife.glb', target: 'prop-knife'},
```

Keep all existing small prop rules (frying_pan, cutting_board, pot, etc.) and animated rules (fridge, meat_grinder, mixing_bowl).

**Step 4: Add horror prop + furniture extension targets to resolveTargets()**

Add new target entries for each new rule. Position horror props in atmospheric locations: bear trap near the door, worm near food, fly swatter on wall, broken can on floor, bandages on counter, matchbox near stove, postit on fridge, fridge letters on fridge door, prop knife on island.

**Step 5: Run tests**

```bash
pnpm test -- --testPathPattern='FurnitureLayout' --verbose
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/engine/FurnitureLayout.ts src/engine/__tests__/FurnitureLayout.test.ts
git commit -m "feat: update furniture rules — lightweight replacements + horror props"
```

---

### Task 3: Delete Bloated GLBs

**Step 1: Delete 11 oversized files (43MB total)**

```bash
rm public/models/l_counter.glb public/models/oven_range.glb \
   public/models/upper_cabinets.glb public/models/utensil_hooks.glb \
   public/models/island.glb public/models/dishwasher.glb \
   public/models/trash_can.glb public/models/table_chairs.glb \
   public/models/spice_rack.glb public/models/sausage.glb \
   public/models/funny_sausage.glb
```

**Step 2: Verify**

```bash
du -sh public/models/
```

Expected: ~2MB (down from ~47MB).

**Step 3: Run tests — PASS**

```bash
pnpm test:ci
```

**Step 4: Commit**

```bash
git add -u public/models/
git commit -m "chore: remove 43MB bloated GLBs replaced by <500KB alternatives"
```

---

### Task 4: Rewrite LoadingScreen for Parallel GLB Loading

Replace single `kitchen.glb` download with parallel loading of many tiny GLBs.

**Files:**
- Modify: `src/components/ui/LoadingScreen.tsx`

**Step 1: Replace asset loading logic**

```typescript
import { FURNITURE_RULES } from '../../engine/FurnitureLayout';
import { getAssetUrl } from '../../engine/assetUrl';

// Build preload list from furniture rules
const GLB_URLS = FURNITURE_RULES.map(r => getAssetUrl('models', r.glb));
const TEXTURE_URLS = TEXTURE_FILES.map(f => getAssetUrl('textures', f));
const ALL_ASSETS = [...GLB_URLS, ...TEXTURE_URLS];

// Parallel count-based progress (files are so tiny, byte tracking is overkill)
let loaded = 0;
await Promise.all(
  ALL_ASSETS.map(async (url) => {
    try { await fetch(url); } catch { /* skip — non-critical */ }
    loaded++;
    setProgress(Math.round((loaded / ALL_ASSETS.length) * 100));
  })
);
```

Remove: `kitchen.glb` reference, `ReadableStream` byte-level progress, HEAD request size calculation.
Keep: Mr. Sausage quotes, sausage progress bar visual, `audioEngine.initTone()`, retry logic.

**Step 2: Run tests — PASS**

**Step 3: Manual verify** — `npx expo start --web` — loading screen completes quickly.

**Step 4: Commit**

```bash
git add src/components/ui/LoadingScreen.tsx
git commit -m "feat: parallel GLB loading from furniture rules (sub-second loads)"
```

---

### Task 5: PNG Sprite Title Screen Buttons

Replace text `TouchableOpacity` buttons with PNG sausage character sprites.

**Files:**
- Modify: `src/components/ui/TitleScreen.tsx`
- Reference: `public/ui/btn_*.png` (6 files, ~32KB each)

**Step 1: Create SausageButton component**

```typescript
import { useState } from 'react';
import { Pressable, Image, Platform } from 'react-native';

function SausageButton({
  normalSource, hoverSource, onPress, disabled = false,
}: {
  normalSource: any; hoverSource: any; onPress: () => void; disabled?: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setHovered(true)}
      onPressOut={() => setHovered(false)}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      disabled={disabled}
      style={{marginVertical: 8, opacity: disabled ? 0.5 : 1}}
    >
      <Image
        source={hovered ? hoverSource : normalSource}
        style={{width: 280, height: 92}}
        resizeMode="contain"
      />
    </Pressable>
  );
}
```

**Step 2: Replace menu items with SausageButton instances**

New Game, Continue (disabled if no save), Settings (text button), Quit.

**Step 3: Run tests + manual verify**

**Step 4: Commit**

```bash
git add src/components/ui/TitleScreen.tsx public/ui/
git commit -m "feat: PNG sausage sprite buttons on title screen"
```

---

## Phase 2: Room Expansion + Horror Atmosphere + Post-Processing

---

### Task 6: Expand Room to 18×16

**Files:**
- Modify: `src/engine/FurnitureLayout.ts:54` (DEFAULT_ROOM)
- Modify: `src/engine/FurnitureLayout.ts:81-337` (all target positions)
- Modify: `src/engine/__tests__/FurnitureLayout.test.ts`

**Step 1: Write test**

```typescript
it('should use expanded 18x16 room', () => {
  expect(DEFAULT_ROOM).toEqual({w: 18, d: 16, h: 5.5});
});

it('all station targets within room bounds', () => {
  const targets = resolveTargets(DEFAULT_ROOM);
  const halfW = DEFAULT_ROOM.w / 2;
  const halfD = DEFAULT_ROOM.d / 2;
  for (const name of STATION_TARGET_NAMES) {
    const t = targets[name];
    expect(Math.abs(t.position[0])).toBeLessThanOrEqual(halfW);
    expect(Math.abs(t.position[2])).toBeLessThanOrEqual(halfD);
  }
});
```

**Step 2: Update `DEFAULT_ROOM` to `{w: 18, d: 16, h: 5.5}`**

**Step 3: Recalculate all target positions**

`halfW` goes from 6.5 → 9, `halfD` goes from 6.5 → 8. All targets that use these shift proportionally. Station positions keep the same wall offsets but get wider spacing.

**Step 4: Run tests — PASS**

**Step 5: Commit**

```bash
git add src/engine/FurnitureLayout.ts src/engine/__tests__/FurnitureLayout.test.ts
git commit -m "feat: expand kitchen to 18x16 room with recalculated targets"
```

---

### Task 7: Update KitchenEnvironment + GameWorld for 18×16

**Files:**
- Modify: `src/components/kitchen/KitchenEnvironment.tsx` (room constants, wall configs, tube positions)
- Modify: `src/components/GameWorld.tsx` (RoomColliders dimensions)

**Step 1: Update room constants in KitchenEnvironment**

```typescript
const ROOM_W = 18;  // was 13
const ROOM_D = 16;  // was 13
```

Add 4th fluorescent tube position for the wider room. Adjust grime decal positions.

**Step 2: Update RoomColliders in GameWorld for 18×16**

**Step 3: Run tests — PASS**

**Step 4: Commit**

```bash
git add src/components/kitchen/KitchenEnvironment.tsx src/components/GameWorld.tsx
git commit -m "feat: update environment and colliders for 18x16 room"
```

---

### Task 8: Basement Structure — Pipes, Window, Door, Drain

**Files:**
- Create: `src/components/kitchen/BasementStructure.tsx`
- Modify: `src/components/kitchen/KitchenEnvironment.tsx` (import BasementStructure)

**Step 1: Create BasementStructure.tsx**

Procedural geometry using `CylinderGeometry` (pipes), `BoxGeometry` (door, window bars), `PlaneGeometry` (window glass, drain).

```typescript
export function BasementStructure() {
  const halfW = DEFAULT_ROOM.w / 2;
  const halfD = DEFAULT_ROOM.d / 2;
  const H = DEFAULT_ROOM.h;
  return (
    <group>
      <CeilingPipes halfW={halfW} halfD={halfD} h={H} />
      <BarredWindow halfW={halfW} halfD={halfD} h={H} />
      <LockedDoor halfW={halfW} halfD={halfD} />
      <FloorDrain />
    </group>
  );
}
```

- **Pipes:** 3 horizontal `CylinderGeometry` runs, color `#555555`, metalness 0.6
- **Window:** PlaneGeometry + 4 bar CylinderGeometry, faint blue emissive
- **Door:** BoxGeometry panel, metalness 0.8, small lock detail mesh
- **Drain:** Dark circle PlaneGeometry on floor

**Step 2: Add `<BasementStructure />` to KitchenEnvironment return**

**Step 3: Commit**

```bash
git add src/components/kitchen/BasementStructure.tsx src/components/kitchen/KitchenEnvironment.tsx
git commit -m "feat: procedural basement structure — pipes, barred window, locked door, drain"
```

---

### Task 9: Horror Post-Processing Pipeline

Add `@react-three/postprocessing` effects for instant horror atmosphere.

**Files:**
- Modify: `src/components/GameWorld.tsx`

**Step 1: Add EffectComposer to Canvas**

```typescript
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';

// Inside Canvas, after SceneContent:
<EffectComposer>
  <Bloom
    luminanceThreshold={0.8}
    luminanceSmoothing={0.3}
    intensity={0.5}
  />
  <Vignette
    offset={0.3}
    darkness={0.7}
    blendFunction={BlendFunction.NORMAL}
  />
  <ChromaticAberration
    offset={[0.002, 0.002]}
    blendFunction={BlendFunction.NORMAL}
  />
  <Noise
    premultiply
    blendFunction={BlendFunction.ADD}
    opacity={0.15}
  />
</EffectComposer>
```

**Key settings for horror:**
- **Bloom** on emissive surfaces (CRT screen glow, burner glow, fluorescent tubes) — those already use emissive > 1.0
- **Vignette** darkens edges — creates tunnel vision / claustrophobia
- **ChromaticAberration** subtle lens fringe — disorientation
- **Noise** film grain — gritty horror film look

**Step 2: Add mock for tests**

```javascript
// __mocks__/@react-three/postprocessing.js
const React = require('react');
const createMock = (name) => React.forwardRef((props, ref) => React.createElement('group', { ref, ...props }));
module.exports = {
  EffectComposer: createMock('EffectComposer'),
  Bloom: createMock('Bloom'),
  Vignette: createMock('Vignette'),
  ChromaticAberration: createMock('ChromaticAberration'),
  Noise: createMock('Noise'),
};
```

**Step 3: Run tests — PASS**

**Step 4: Manual verify** — horror atmosphere visible: dark edges, glowing CRT, film grain.

**Step 5: Commit**

```bash
git add src/components/GameWorld.tsx __mocks__/@react-three/postprocessing.js
git commit -m "feat: horror post-processing — bloom, vignette, chromatic aberration, film grain"
```

---

### Task 10: BVH Raycasting Acceleration

Install accelerated raycasting for the fridge ingredient picking interaction.

**Files:**
- Modify: `src/components/kitchen/FridgeStation.tsx`

**Step 1: Add BVH to ingredient meshes**

```typescript
import { Bvh } from '@react-three/drei';

// Wrap the ingredient group:
<Bvh>
  {ingredients.map((ing, i) => (
    <IngredientMesh key={i} ... />
  ))}
</Bvh>
```

This automatically calls `geometry.computeBoundsTree()` on all child meshes, making raycasting O(log n) instead of O(n).

**Step 2: Commit**

```bash
git add src/components/kitchen/FridgeStation.tsx
git commit -m "feat: BVH accelerated raycasting for fridge ingredient picking"
```

---

## Phase 3: Full Procedural Factory System

Port ALL mechanics from sausage_factory.html. No deferrals.

---

### Task 11: Procedural Meat Texture with tsl-textures

Use `tsl-textures` for GPU procedural meat texture instead of CPU CanvasTexture. Falls back to CanvasTexture on platforms without TSL support.

**Files:**
- Create: `src/engine/MeatTexture.ts`
- Create: `src/engine/__tests__/MeatTexture.test.ts`

**Step 1: Write test**

```typescript
import { generateMeatTexture } from '../MeatTexture';

describe('MeatTexture', () => {
  it('should return a texture object', () => {
    const tex = generateMeatTexture('#8B0000', 0.15);
    expect(tex).toBeDefined();
  });
});
```

**Step 2: Implement dual-path texture generator**

```typescript
import * as THREE from 'three/webgpu';

/**
 * Generates procedural meat texture.
 * Uses CanvasTexture for maximum compatibility (TSL version for GPU path added later).
 * Ported from sausage_factory.html lines 118-129.
 */
export function generateMeatTexture(
  colorHex: string,
  fatRatio: number,
  size = 256,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Base color
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, size, size);

  // Muscle fiber streaks (darker red)
  for (let i = 0; i < size * 2; i++) {
    ctx.fillStyle = `rgba(60, 0, 0, ${0.1 + Math.random() * 0.15})`;
    ctx.fillRect(Math.random() * size, Math.random() * size, 1 + Math.random() * 3, 1);
  }

  // Fat specks (white dots)
  const fatCount = Math.floor(size * size * fatRatio * 0.01);
  for (let i = 0; i < fatCount; i++) {
    ctx.beginPath();
    ctx.arc(Math.random() * size, Math.random() * size, 1 + Math.random() * 2, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 240, 220, ${0.4 + Math.random() * 0.4})`;
    ctx.fill();
  }

  // Blur for organic look
  ctx.filter = 'blur(0.5px)';
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
```

**Step 3: Run test — PASS**

**Step 4: Commit**

```bash
git add src/engine/MeatTexture.ts src/engine/__tests__/MeatTexture.test.ts
git commit -m "feat: procedural meat texture generator with fat specks and muscle fibers"
```

---

### Task 12: Sausage Body — SkinnedMesh + Rapier Spring Joints

The central innovation: use `@react-three/rapier`'s `useSpringJoint` instead of hand-rolled `applyImpulse`. Native spring constraints are more stable and configurable than the POC's manual K=80/damp=10.

**Files:**
- Create: `src/engine/SausageBody.ts`
- Create: `src/engine/__tests__/SausageBody.test.ts`
- Create: `src/components/kitchen/ProceduralSausage.tsx`

**Step 1: Write tests for SausageBody**

```typescript
import { SausageCurve, createSausageSkeleton, SAUSAGE_BONE_COUNT } from '../SausageBody';

describe('SausageBody', () => {
  it('SausageCurve returns points along Y axis', () => {
    const curve = new SausageCurve(2.0);
    expect(curve.getPoint(0).y).toBe(0);
    expect(curve.getPoint(1).y).toBeCloseTo(2.0);
  });

  it('createSausageSkeleton returns correct bone count', () => {
    const { bones, skeleton } = createSausageSkeleton(2.0, SAUSAGE_BONE_COUNT);
    expect(bones).toHaveLength(SAUSAGE_BONE_COUNT);
    expect(skeleton).toBeDefined();
  });
});
```

**Step 2: Implement SausageBody.ts**

Engine module with:
- `SausageCurve extends THREE.Curve<THREE.Vector3>` — straight line along Y
- `createSausageSkeleton(length, boneCount)` — bone hierarchy
- `createSausageGeometry(length, radius, boneCount)` — TubeGeometry with skinIndex/skinWeight attributes
- Constants: `SAUSAGE_BONE_COUNT = 8`, `SAUSAGE_LENGTH = 2.0`, `SAUSAGE_RADIUS = 0.12`

**Step 3: Create ProceduralSausage.tsx — R3F component**

```typescript
import { useSpringJoint, RigidBody } from '@react-three/rapier';

/**
 * Each bone gets a Rapier RigidBody.
 * Adjacent bones connected by useSpringJoint (restLength, stiffness, damping).
 * This replaces the POC's manual applyImpulse(K=80, damp=10) pattern.
 */
function SausageBoneChain({ bones }: { bones: THREE.Bone[] }) {
  const bodyRefs = bones.map(() => useRef(null));

  // Spring joints between adjacent bones
  for (let i = 0; i < bones.length - 1; i++) {
    useSpringJoint(bodyRefs[i], bodyRefs[i + 1], [
      [0, 0, 0],           // anchor A (local)
      [0, 0, 0],           // anchor B (local)
      SAUSAGE_LENGTH / (bones.length - 1),  // rest length
      80,                   // stiffness (matches POC K=80)
      10,                   // damping (matches POC damp=10)
    ]);
  }

  return (
    <>
      {bones.map((bone, i) => (
        <RigidBody
          key={i}
          ref={bodyRefs[i]}
          type="dynamic"
          position={[0, i * (SAUSAGE_LENGTH / (bones.length - 1)), 0]}
          colliders={false}
          linearDamping={2}
        >
          <CapsuleCollider args={[SAUSAGE_RADIUS, SAUSAGE_RADIUS]} />
        </RigidBody>
      ))}
    </>
  );
}
```

Cook-level visual: color lerps `#D4756B` (raw) → `#8B4513` (golden) → `#1a1a1a` (burnt) based on `cookLevel` prop.

**Step 4: Run tests — PASS**

**Step 5: Commit**

```bash
git add src/engine/SausageBody.ts src/engine/__tests__/SausageBody.test.ts \
  src/components/kitchen/ProceduralSausage.tsx
git commit -m "feat: sausage body with SkinnedMesh bones + Rapier spring joints"
```

---

### Task 13: Grinder Mechanics — Chunks + Particles + maath Transitions

**Files:**
- Create: `src/components/kitchen/GrinderMechanics.tsx`

**Key features:**
- `InstancedMesh` meat chunks (count=20) with procedural texture
- Output particles (InstancedMesh count=12) falling toward bowl
- Grinder vibration (random offset on group)
- **Bowl slide animation using `maath` `damp3`** — framerate-independent smooth movement:

```typescript
import { damp3 } from 'maath/easing';

// In useFrame:
damp3(
  bowlRef.current.position,    // current position (mutated in place)
  targetBowlPosition,          // where we want the bowl to be
  0.1,                         // lambda (smoothing factor)
  delta,                       // frame delta from useFrame
);
```

This replaces the anime.js transitions from the design doc with a 10KB library that's R3F-native.

**Commit:**

```bash
git add src/components/kitchen/GrinderMechanics.tsx
git commit -m "feat: grinder mechanics — meat chunks, particles, maath damp3 bowl slide"
```

---

### Task 14: Stuffer Mechanics — Casing Growth + Pressure

**Files:**
- Create: `src/components/kitchen/StufferMechanics.tsx`

Port POC lines 174-202: TubeGeometry casing from SquigglyCurve, crank rotation drag, pressure gauge.

```typescript
class CasingCurve extends THREE.Curve<THREE.Vector3> {
  getPoint(t: number): THREE.Vector3 {
    const x = Math.sin(t * Math.PI * 2) * 0.05;
    const y = -t * this.length * 0.3;  // gravity droop
    const z = t * this.length;
    return new THREE.Vector3(x, y, z);
  }
}
```

Casing extends via growing `TubeGeometry` as fill level increases.

**Commit:**

```bash
git add src/components/kitchen/StufferMechanics.tsx
git commit -m "feat: stuffer mechanics — casing growth with squiggly curve droop"
```

---

### Task 15: Cooking Mechanics — Grease FBO + TSL Compute Particles

The FULL cooking system, no deferrals. This is the biggest single task.

**Files:**
- Create: `src/engine/GreaseSimulation.ts`
- Create: `src/components/kitchen/CookingMechanics.tsx`

**Grease FBO — TSL Ping-Pong Wave Equation:**

```typescript
import * as THREE from 'three/webgpu';
import { Fn, float, vec2, vec4, texture, textureStore, uniform, uv } from 'three/tsl';

/**
 * GPU wave equation simulation for grease surface.
 * Ported from sausage_factory.html lines 230-241.
 *
 * Uses TSL RenderTarget ping-pong (NOT deprecated GPUComputationRenderer).
 * newHeight = ((N + S + E + W) * 0.5 - prevHeight) * viscosity
 */
export function createGreaseSimulation(renderer: THREE.WebGPURenderer, size = 128) {
  const rtA = new THREE.RenderTarget(size, size, { type: THREE.HalfFloatType });
  const rtB = new THREE.RenderTarget(size, size, { type: THREE.HalfFloatType });
  let read = rtA, write = rtB;

  const viscosity = uniform(float(0.98));
  const texelSize = uniform(vec2(1.0 / size, 1.0 / size));

  // Wave equation fragment — reads from `read`, writes to `write`
  const waveFn = Fn(() => {
    const coord = uv();
    const curr = texture(read.texture, coord);

    // Sample 4 cardinal neighbors
    const north = texture(read.texture, coord.add(vec2(0, texelSize.y)));
    const south = texture(read.texture, coord.sub(vec2(0, texelSize.y)));
    const east = texture(read.texture, coord.add(vec2(texelSize.x, 0)));
    const west = texture(read.texture, coord.sub(vec2(texelSize.x, 0)));

    // Wave equation: new = (avg_neighbors * 2 - prev) * viscosity
    const avg = north.x.add(south.x).add(east.x).add(west.x).mul(0.25);
    const prev = curr.y;  // Previous height stored in .y channel
    const next = avg.mul(2).sub(prev).mul(viscosity);

    return vec4(next, curr.x, 0, 1);  // Store [current, previous] in .xy
  });

  const quadMesh = new THREE.QuadMesh();

  function step() {
    quadMesh.material = new THREE.NodeMaterial();
    quadMesh.material.colorNode = waveFn();
    renderer.setRenderTarget(write);
    quadMesh.render(renderer);
    renderer.setRenderTarget(null);
    [read, write] = [write, read];  // swap
  }

  function getTexture() { return read.texture; }

  return { step, getTexture, viscosity };
}
```

**Steam Particles — TSL Compute (GPU-resident, zero CPU):**

```typescript
import { instancedArray, instanceIndex, Fn, hash, vec3, deltaTime, If } from 'three/tsl';

const STEAM_COUNT = 1024;  // 1k GPU particles — free on modern GPUs
const posBuffer = instancedArray(STEAM_COUNT, 'vec3');
const velBuffer = instancedArray(STEAM_COUNT, 'vec3');
const lifeBuffer = instancedArray(STEAM_COUNT, 'float');

const computeSteam = Fn(() => {
  const pos = posBuffer.element(instanceIndex).toVar();
  const vel = velBuffer.element(instanceIndex).toVar();
  const life = lifeBuffer.element(instanceIndex).toVar();

  // Rise + drift
  vel.addAssign(vec3(0, float(2.0).mul(deltaTime), 0));
  pos.addAssign(vel.mul(deltaTime));
  life.addAssign(deltaTime);

  // Respawn when life > 2s
  If(life.greaterThan(2.0), () => {
    pos.assign(vec3(
      hash(instanceIndex).mul(0.6).sub(0.3),  // random XZ within pan
      0,
      hash(instanceIndex.add(1)).mul(0.6).sub(0.3),
    ));
    vel.assign(vec3(0, float(0.5), 0));
    life.assign(0);
  });

  posBuffer.element(instanceIndex).assign(pos);
  velBuffer.element(instanceIndex).assign(vel);
  lifeBuffer.element(instanceIndex).assign(life);
})().compute(STEAM_COUNT);
```

**CookingMechanics.tsx combines:**
1. Burner ring (TorusGeometry, emissive heat glow scaled by `heatLevel`)
2. Grease FBO surface (CircleGeometry with displacement from simulation texture)
3. Steam particles (1024 GPU-driven via TSL compute)
4. Sausage color shift (via ProceduralSausage `cookLevel` prop)
5. Temperature dial interaction

**Commit:**

```bash
git add src/engine/GreaseSimulation.ts src/components/kitchen/CookingMechanics.tsx
git commit -m "feat: cooking mechanics — TSL grease FBO + GPU steam particles + burner glow"
```

---

### Task 16: Fridge Interior — Shelves + Food GLBs + BVH Picking

**Files:**
- Create: `src/components/kitchen/FridgeInterior.tsx`

Procedural fridge interior with:
- 3 shelves + 2 pull-out drawers (BoxGeometry)
- 15 randomly-selected food GLBs placed on shelves (from `public/models/food_*.glb`)
- BVH-accelerated raycasting for fast ingredient picking
- `damp3` smooth animation for selected items floating to mixing bowl

```typescript
import { Bvh } from '@react-three/drei';
import { damp3 } from 'maath/easing';

// Items float to bowl when selected
useFrame((_, delta) => {
  for (const item of selectedItems) {
    damp3(item.position, bowlPosition, 0.15, delta);
  }
});
```

**Commit:**

```bash
git add src/components/kitchen/FridgeInterior.tsx
git commit -m "feat: fridge interior — shelves, food GLBs, BVH picking, damp3 float-to-bowl"
```

---

## Phase 4: Game Flow + Loading Screen + Polish

---

### Task 17: Extended Game State Machine (12 states)

**Files:**
- Modify: `src/store/gameStore.ts`

Add factory pipeline states to `GameStatus`:

```typescript
export type GameStatus =
  | 'menu' | 'playing' | 'victory' | 'defeat'
  | 'fridge_open' | 'picking' | 'fridge_close'
  | 'fill_grinder' | 'grinding' | 'move_bowl'
  | 'attach_casing' | 'stuffing' | 'move_sausage'
  | 'move_pan' | 'cooking'
  | 'tasting' | 'verdict';
```

Add `setFactoryState(state)` action. Factory states advance automatically based on challenge completion with `damp3`-powered object transitions between stations.

**Commit:**

```bash
git add src/store/gameStore.ts
git commit -m "feat: 12-state factory game flow machine"
```

---

### Task 18: Integrate Factory Components into GameWorld

**Files:**
- Modify: `src/components/GameWorld.tsx`

Wire up all factory components into SceneContent, conditionally rendered based on `currentChallenge` and factory state.

```typescript
import { GrinderMechanics } from './kitchen/GrinderMechanics';
import { StufferMechanics } from './kitchen/StufferMechanics';
import { CookingMechanics } from './kitchen/CookingMechanics';
import { ProceduralSausage } from './kitchen/ProceduralSausage';
import { FridgeInterior } from './kitchen/FridgeInterior';
```

Each component activates at the appropriate challenge index.

**Commit:**

```bash
git add src/components/GameWorld.tsx
git commit -m "feat: integrate all factory components into GameWorld scene"
```

---

### Task 19: Skia Loading Screen — Procedural Sausage Animation

Replace the CSS progress bar with a Skia-powered 2D sausage animation showing the factory process as foreshadowing.

**Files:**
- Modify: `src/components/ui/LoadingScreen.tsx`

**Design:** While assets load, an animated 2D sequence plays:
1. Meat chunks tumble into grinder (Skia path animation)
2. Ground meat fills casing (growing tube path)
3. Sausage cooks in pan (color shift animation)
4. Sausage curls into the progress bar shape

```typescript
import { Canvas, Path, usePathInterpolation } from '@shopify/react-native-skia';
import Animated, { useSharedValue, withTiming } from 'react-native-reanimated';

function SausageLoadingAnimation({ progress }: { progress: number }) {
  // Skia canvas with animated sausage being made
  return (
    <Canvas style={{ width: 300, height: 200 }}>
      {/* Animated meat path that fills as progress increases */}
      <Path
        path={sausagePath}
        color="#D4756B"
        style="fill"
        end={progress / 100}  // clip path by progress
      />
    </Canvas>
  );
}
```

**Step 1: Wrap the web-only `<Canvas>` in platform check**

Skia on web requires `canvaskit.wasm`. Verify it was copied in Task 0.

**Step 2: Add Reanimated spring for smooth progress interpolation**

```typescript
const animatedProgress = useSharedValue(0);
useEffect(() => {
  animatedProgress.value = withTiming(progress, { duration: 300 });
}, [progress]);
```

**Commit:**

```bash
git add src/components/ui/LoadingScreen.tsx
git commit -m "feat: Skia-powered procedural sausage loading animation"
```

---

### Task 20: Sound Integration — Positional Audio

**Files:**
- Copy: Selected sounds from `/Volumes/home/assets/kitchen/sounds/` → `public/audio/`
- Modify: `src/engine/AudioEngine.web.ts`
- Modify station components (add drei `PositionalAudio`)

**Step 1: Copy key sounds**

```bash
# Convert WAV to OGG for web delivery (smaller files)
for f in sizzle_01 chop_01 grind_loop boil_01 steam_hiss; do
  cp "/Volumes/home/assets/kitchen/sounds/${f}.wav" "public/audio/${f}.wav"
done
```

**Step 2: Add drei PositionalAudio to stations**

```typescript
import { PositionalAudio } from '@react-three/drei';

// Inside GrinderStation:
{motorRunning && (
  <PositionalAudio url={getAssetUrl('audio', 'grind_loop.wav')} distance={3} loop />
)}

// Inside StoveStation:
{heatLevel > 0.1 && (
  <PositionalAudio url={getAssetUrl('audio', 'sizzle_01.wav')} distance={2} loop />
)}
```

3D spatial audio automatically attenuates with distance from camera. No manual setup needed.

**Commit:**

```bash
git add public/audio/ src/engine/AudioEngine.web.ts src/components/kitchen/
git commit -m "feat: positional audio for station interactions"
```

---

### Task 21: Expo Blur + Gradient for UI Overlays

**Files:**
- Modify: `src/components/ui/DialogueOverlay.tsx`
- Modify: `src/components/ui/GameOverScreen.tsx`
- Modify: `src/components/ui/SettingsScreen.tsx`

**Step 1: Add BlurView backdrop to overlays**

```typescript
import { BlurView } from 'expo-blur';

// Wrap overlay content:
<BlurView intensity={50} tint="dark" style={StyleSheet.absoluteFill}>
  {/* Existing overlay content */}
</BlurView>
```

**Step 2: Add LinearGradient vignette to challenge headers**

```typescript
import { LinearGradient } from 'expo-linear-gradient';

<LinearGradient
  colors={['rgba(0,0,0,0.8)', 'transparent', 'transparent', 'rgba(0,0,0,0.8)']}
  style={StyleSheet.absoluteFill}
/>
```

**Commit:**

```bash
git add src/components/ui/
git commit -m "feat: expo-blur backdrop + gradient vignettes on UI overlays"
```

---

### Task 22: Screen Orientation Lock

**Files:**
- Modify: `App.tsx` or root component

```typescript
import * as ScreenOrientation from 'expo-screen-orientation';

useEffect(() => {
  ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
}, []);
```

**Commit:**

```bash
git add App.tsx
git commit -m "feat: lock screen orientation to landscape on mobile"
```

---

### Task 23: Full Verification

**Step 1: Automated checks**

```bash
pnpm test:ci && pnpm lint && pnpm typecheck
```

**Step 2: Asset verification**

```bash
du -sh public/models/  # Should be <5MB
ls public/models/*.glb | wc -l  # Should be 50+
```

**Step 3: Manual playtest — full game loop**

```bash
npx expo start --web
```

Walk through all 5 stations. Verify:
- Horror atmosphere (post-processing, pipes, bear trap, grime)
- PNG title screen buttons work
- Skia loading animation plays
- Grinder: chunks, vibration, particles, bowl slide (maath damp3)
- Stuffer: casing grows from nozzle
- Cooking: grease FBO ripples, GPU steam particles, sausage color shift
- Tasting: CRT verdict, scoring works
- Fridge: food GLBs on shelves, BVH picking, float-to-bowl
- Spatial audio: grinder loop, sizzle
- Blur overlays on dialogues
- Screen stays awake on mobile (expo-keep-awake)

**Step 4: Final commit**

```bash
git add -A && git commit -m "feat: complete sausage factory kitchen — full game implementation"
```

---

## Parallel Execution Strategy

Tasks grouped into 5 waves for maximum parallelism:

**Wave 0:** Task 0 (dependencies — must be first)

**Wave 1 (independent):** Tasks 1-3 (asset copy/delete), Task 5 (title screen)

**Wave 2 (depends on Wave 1):** Tasks 4, 6-8 (loading screen, room expansion, basement)

**Wave 3 (independent of Waves 1-2):** Tasks 9-10 (post-processing, BVH), Tasks 11-16 (all factory components — independent of each other)

**Wave 4 (depends on all):** Tasks 17-23 (integration, Skia loading, sound, polish, verification)

---

## New Dependency Quick-Reference

| Package | Import | Key API |
|---------|--------|---------|
| `maath` | `import { damp3 } from 'maath/easing'` | `damp3(current, target, lambda, delta)` — in useFrame |
| `@react-three/postprocessing` | `import { EffectComposer, Bloom, ... }` | JSX effects inside Canvas |
| `@shopify/react-native-skia` | `import { Canvas, Path } from '@shopify/react-native-skia'` | GPU 2D canvas |
| `expo-keep-awake` | `import { useKeepAwake }` | One hook call in GameWorld |
| `expo-blur` | `import { BlurView }` | `<BlurView intensity={50} tint="dark">` |
| `expo-linear-gradient` | `import { LinearGradient }` | `<LinearGradient colors={[...]}>`|
| `expo-screen-orientation` | `import * as ScreenOrientation` | `lockAsync(LANDSCAPE)` |
| `react-native-reanimated` | `import { useSharedValue, withTiming }` | UI-thread animations |
| `tsl-textures` | `import { polkaDots } from 'tsl-textures'` | GPU procedural textures |
| `three-mesh-bvh` | Via drei `<Bvh>` wrapper | Auto-accelerated raycasting |
| `three/tsl` | `import { Fn, vec3, instancedArray, ... }` | TSL compute + shaders |
| `@react-three/rapier` | `import { useSpringJoint }` | Native spring constraints |
| `@react-three/drei` | `import { PositionalAudio, Bvh }` | 3D spatial audio, BVH |
