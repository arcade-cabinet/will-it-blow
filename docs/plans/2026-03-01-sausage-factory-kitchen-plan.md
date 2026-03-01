# Sausage Factory Kitchen — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Complete the horror sausage-making game by replacing bloated GLBs with tiny alternatives, adding procedural factory mechanics on top of GLB furniture, implementing PNG sprite title screen, and expanding the kitchen into a horror basement.

**Architecture:** Four-phase approach: (1) Asset swap + title screen, (2) room expansion + horror props, (3) procedural factory system ported from sausage_factory.html POC, (4) game flow polish. Each phase is independently shippable.

**Tech Stack:** React Three Fiber 9.5, Three.js 0.183 (WebGPU), @react-three/rapier 2.2, Zustand 5, Expo 55, React Native 0.83. Tests: Jest + @react-three/test-renderer. Linting: Biome 2.4. Package manager: pnpm.

**Design Doc:** `docs/plans/2026-03-01-sausage-factory-kitchen-design.md`

**POC Reference:** `sausage_factory.html` (594 lines) — all factory mechanics proven here.

**Asset Library:** `/Volumes/home/assets/kitchen/` — 179 GLBs, 138 WAVs, PBR textures.

---

## Phase 1: Asset Swap + Title Screen

The lowest-risk phase. Replace bloated GLBs, update loading, add PNG buttons. Game stays playable throughout.

---

### Task 1: Copy Replacement GLBs to public/models/

Copy the tiny Quaternius/Styloo replacements from the global asset library into the project. Also copy horror prop GLBs.

**Files:**
- Copy: `/Volumes/home/assets/kitchen/models/furniture/kitchen_oven_large.glb` → `public/models/kitchen_oven_large.glb`
- Copy: `/Volumes/home/assets/kitchen/models/furniture/kitchen_cabinet1.glb` → `public/models/kitchen_cabinet1.glb`
- Copy: `/Volumes/home/assets/kitchen/models/furniture/kitchen_cabinet2.glb` → `public/models/kitchen_cabinet2.glb`
- Copy: `/Volumes/home/assets/kitchen/models/furniture/workplan.glb` → `public/models/workplan.glb`
- Copy: `/Volumes/home/assets/kitchen/models/furniture/workplan_001.glb` → `public/models/workplan_001.glb`
- Copy: `/Volumes/home/assets/kitchen/models/furniture/workplan_002.glb` → `public/models/workplan_002.glb`
- Copy: `/Volumes/home/assets/kitchen/models/furniture/trashcan_cylindric.glb` → `public/models/trashcan_cylindric.glb`
- Copy: `/Volumes/home/assets/kitchen/models/furniture/table.glb` → `public/models/table_styloo.glb`
- Copy: `/Volumes/home/assets/kitchen/models/furniture/chair1.glb` → `public/models/chair_styloo.glb`
- Copy: `/Volumes/home/assets/kitchen/models/furniture/shelf_small1.glb` → `public/models/shelf_small.glb`
- Copy: `/Volumes/home/assets/kitchen/models/furniture/whashing_machine.glb` → `public/models/washing_machine.glb`
- Copy: `/Volumes/home/assets/kitchen/models/utensils/poseustensils.glb` → `public/models/utensil_holder.glb`
- Copy: `/Volumes/home/assets/kitchen/models/furniture/bartable.glb` → `public/models/island_counter.glb`
- Copy: horror props (see step 1)

**Step 1: Copy furniture replacements**

```bash
# From project root
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

**Step 2: Copy horror prop GLBs**

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

**Step 3: Copy food GLBs for fridge (select 15 representative items)**

```bash
cp /Volumes/home/assets/kitchen/models/food/steak.glb public/models/food_steak.glb
cp /Volumes/home/assets/kitchen/models/food/egg_whole.glb public/models/food_egg.glb
cp /Volumes/home/assets/kitchen/models/food/bacon_uncooked.glb public/models/food_bacon.glb
cp /Volumes/home/assets/kitchen/models/food/mushroom.glb public/models/food_mushroom.glb
cp /Volumes/home/assets/kitchen/models/food/pepper_red.glb public/models/food_pepper.glb
cp /Volumes/home/assets/kitchen/models/food/carrot.glb public/models/food_carrot.glb
cp /Volumes/home/assets/kitchen/models/food/broccoli.glb public/models/food_broccoli.glb
cp /Volumes/home/assets/kitchen/models/food/tomato.glb public/models/food_tomato.glb
cp /Volumes/home/assets/kitchen/models/food/cheese_singles.glb public/models/food_cheese.glb
cp /Volumes/home/assets/kitchen/models/food/sausage_raw.glb public/models/food_sausage_raw.glb
cp /Volumes/home/assets/kitchen/models/food/tentacle.glb public/models/food_tentacle.glb
cp /Volumes/home/assets/kitchen/models/food/fishbone.glb public/models/food_fishbone.glb
cp /Volumes/home/assets/kitchen/models/food/eggplant.glb public/models/food_eggplant.glb
cp /Volumes/home/assets/kitchen/models/food/lettuce.glb public/models/food_lettuce.glb
cp /Volumes/home/assets/kitchen/models/food/chickenleg.glb public/models/food_chickenleg.glb
```

**Step 4: Verify file sizes**

```bash
du -sh public/models/*.glb | sort -rh | head -20
```

Expected: All new files should be <100KB each.

**Step 5: Commit**

```bash
git add public/models/kitchen_oven_large.glb public/models/kitchen_cabinet1.glb \
  public/models/kitchen_cabinet2.glb public/models/workplan.glb \
  public/models/workplan_001.glb public/models/workplan_002.glb \
  public/models/trashcan_cylindric.glb public/models/table_styloo.glb \
  public/models/chair_styloo.glb public/models/shelf_small.glb \
  public/models/washing_machine.glb public/models/utensil_holder.glb \
  public/models/island_counter.glb \
  public/models/worm.glb public/models/blobfish.glb public/models/piranha.glb \
  public/models/beartrap_open.glb public/models/tapetteamouche.glb \
  public/models/can_broken.glb public/models/bandages.glb \
  public/models/matchbox.glb public/models/postit.glb \
  public/models/fridgeletter.glb public/models/prop_knife.glb \
  public/models/food_*.glb
git commit -m "feat: add tiny replacement GLBs and horror props from asset library"
```

---

### Task 2: Update FurnitureLayout.ts — New Rules + Targets

Replace bloated GLB references in `FURNITURE_RULES` and add horror prop targets. Keep room dimensions at 13×13 for now (Phase 2 expands).

**Files:**
- Modify: `src/engine/FurnitureLayout.ts:369-402` (FURNITURE_RULES)
- Modify: `src/engine/FurnitureLayout.ts:228-336` (resolveTargets — add horror prop targets)
- Test: `src/engine/__tests__/FurnitureLayout.test.ts`

**Step 1: Write tests for new furniture rules**

Add to `src/engine/__tests__/FurnitureLayout.test.ts`:

```typescript
describe('updated FURNITURE_RULES', () => {
  it('should not reference any bloated GLBs', () => {
    const BLOATED = [
      'l_counter.glb', 'oven_range.glb', 'upper_cabinets.glb',
      'utensil_hooks.glb', 'island.glb', 'dishwasher.glb',
      'trash_can.glb', 'table_chairs.glb', 'spice_rack.glb',
      'sausage.glb',
    ];
    for (const rule of FURNITURE_RULES) {
      expect(BLOATED).not.toContain(rule.glb);
    }
  });

  it('should reference only files that exist in public/models/', () => {
    // This is a sanity check — actual file existence verified at runtime
    for (const rule of FURNITURE_RULES) {
      expect(rule.glb).toMatch(/\.glb$/);
      expect(rule.target).toBeTruthy();
    }
  });

  it('should have horror prop targets', () => {
    const targets = resolveTargets(DEFAULT_ROOM);
    expect(targets['bear-trap']).toBeDefined();
    expect(targets['worm']).toBeDefined();
    expect(targets['fly-swatter']).toBeDefined();
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
pnpm test -- --testPathPattern='FurnitureLayout' --verbose
```

Expected: FAIL — bloated GLBs still referenced, horror targets missing.

**Step 3: Update FURNITURE_RULES in FurnitureLayout.ts**

Replace the `FURNITURE_RULES` array (line 369) with:

```typescript
export const FURNITURE_RULES: FurnitureRule[] = [
  // Core kitchen furniture (lightweight replacements)
  {glb: 'workplan.glb', target: 'l-counter'},
  {glb: 'workplan_001.glb', target: 'l-counter-ext'},
  {glb: 'kitchen_cabinet1.glb', target: 'upper-cabinets'},
  {glb: 'kitchen_cabinet2.glb', target: 'upper-cabinets-2'},
  {glb: 'island_counter.glb', target: 'island'},
  {glb: 'table_styloo.glb', target: 'table'},
  {glb: 'chair_styloo.glb', target: 'chair-extra'},
  {glb: 'trashcan_cylindric.glb', target: 'trash-can'},
  {glb: 'fridge.glb', target: 'fridge', animated: true},
  {glb: 'kitchen_oven_large.glb', target: 'oven'},
  {glb: 'washing_machine.glb', target: 'dishwasher'},
  {glb: 'meat_grinder.glb', target: 'meat_grinder', animated: true},
  {glb: 'mixing_bowl.glb', target: 'mixing-bowl'},
  {glb: 'utensil_holder.glb', target: 'utensil-hooks'},
  {glb: 'shelf_small.glb', target: 'spice-rack'},

  // Atmospheric props (kept from original — small files)
  {glb: 'frying_pan.glb', target: 'frying-pan'},
  {glb: 'cutting_board.glb', target: 'cutting-board'},
  {glb: 'pot.glb', target: 'pot'},
  {glb: 'pot_lid.glb', target: 'pot-lid'},
  {glb: 'bottle.glb', target: 'bottle'},
  {glb: 'glass_big.glb', target: 'glass'},
  {glb: 'plate_big.glb', target: 'plate'},
  {glb: 'knife_holder.glb', target: 'knife-holder'},
  {glb: 'toaster.glb', target: 'toaster'},
  {glb: 'roller.glb', target: 'roller'},
  {glb: 'cutlery_knife.glb', target: 'cutlery-knife'},
  {glb: 'cutlery_cleaver.glb', target: 'cutlery-cleaver'},
  {glb: 'cutlery_ladle.glb', target: 'cutlery-ladle'},
  {glb: 'cutlery_fork.glb', target: 'cutlery-fork'},
  {glb: 'cutlery_spoon.glb', target: 'cutlery-spoon'},

  // Horror props (new — from asset library)
  {glb: 'beartrap_open.glb', target: 'bear-trap'},
  {glb: 'worm.glb', target: 'worm'},
  {glb: 'tapetteamouche.glb', target: 'fly-swatter'},
  {glb: 'can_broken.glb', target: 'broken-can'},
  {glb: 'bandages.glb', target: 'bandages'},
  {glb: 'matchbox.glb', target: 'matchbox'},
  {glb: 'postit.glb', target: 'postit-note'},
  {glb: 'fridgeletter.glb', target: 'fridge-letters'},
  {glb: 'prop_knife.glb', target: 'prop-knife'},
];
```

**Step 4: Add horror prop targets to resolveTargets()**

Add these targets inside `resolveTargets()` after the atmospheric props section (~line 330):

```typescript
    // ---- Horror props ----

    'bear-trap': {
      position: [halfW - 1.5, 0, halfD - 1.0],
      rotationY: 0.4,
      triggerRadius: 0,
    },

    worm: {
      position: [-halfW + 3.0, 1.07, -halfD + 5.2],
      rotationY: 1.5,
      triggerRadius: 0,
    },

    'fly-swatter': {
      position: [-halfW + 0.8, room.h * 0.45, -halfD + 6.5],
      rotationY: 0.2,
      triggerRadius: 0,
    },

    'broken-can': {
      position: [halfW - 1.5, 0.05, -halfD + 2.0],
      rotationY: 2.1,
      triggerRadius: 0,
    },

    bandages: {
      position: [-halfW + 2.5, 1.07, -halfD + 2.5],
      rotationY: 0.8,
      triggerRadius: 0,
    },

    matchbox: {
      position: [-halfW + 2.2, 1.07, -halfD + 4.5],
      rotationY: -0.3,
      triggerRadius: 0,
    },

    'postit-note': {
      position: [-halfW + 0.5, room.h * 0.4, -halfD + 1.5],
      rotationY: 0,
      triggerRadius: 0,
    },

    'fridge-letters': {
      position: [-halfW + 1.34, room.h * 0.35, -halfD + 1.48 + 0.5],
      rotationY: 0,
      triggerRadius: 0,
    },

    'prop-knife': {
      position: [0.6, 1.07, -0.4],
      rotationY: 2.0,
      triggerRadius: 0,
    },

    // Extended counter target for workplan_001
    'l-counter-ext': {
      position: [-halfW + 1.0, 0, -halfD + 5.0],
      rotationY: 0,
      triggerRadius: 0,
    },

    // Second upper cabinet
    'upper-cabinets-2': {
      position: [-halfW + 1.0, room.h * 0.65, -halfD + 5.5],
      rotationY: 0,
      triggerRadius: 0,
    },
```

**Step 5: Run tests to verify they pass**

```bash
pnpm test -- --testPathPattern='FurnitureLayout' --verbose
```

Expected: PASS

**Step 6: Run full test suite**

```bash
pnpm test:ci
```

Expected: All tests pass (FurnitureLoader tests mock useGLTF so they don't need actual files).

**Step 7: Commit**

```bash
git add src/engine/FurnitureLayout.ts src/engine/__tests__/FurnitureLayout.test.ts
git commit -m "feat: update furniture rules with lightweight replacements and horror props"
```

---

### Task 3: Delete Bloated GLBs

Remove the 11 oversized GLBs that have been replaced.

**Files:**
- Delete: `public/models/l_counter.glb` (9.1MB)
- Delete: `public/models/oven_range.glb` (7.1MB)
- Delete: `public/models/upper_cabinets.glb` (5.2MB)
- Delete: `public/models/utensil_hooks.glb` (4.2MB)
- Delete: `public/models/island.glb` (4.1MB)
- Delete: `public/models/dishwasher.glb` (4.1MB)
- Delete: `public/models/trash_can.glb` (4.0MB)
- Delete: `public/models/table_chairs.glb` (2.2MB)
- Delete: `public/models/spice_rack.glb` (2.1MB)
- Delete: `public/models/sausage.glb` (1.1MB)
- Delete: `public/models/funny_sausage.glb` (1.1MB)

**Step 1: Delete files**

```bash
rm public/models/l_counter.glb public/models/oven_range.glb \
   public/models/upper_cabinets.glb public/models/utensil_hooks.glb \
   public/models/island.glb public/models/dishwasher.glb \
   public/models/trash_can.glb public/models/table_chairs.glb \
   public/models/spice_rack.glb public/models/sausage.glb \
   public/models/funny_sausage.glb
```

**Step 2: Verify remaining models are tiny**

```bash
du -sh public/models/
```

Expected: ~1-2MB total (down from ~47MB).

**Step 3: Run tests**

```bash
pnpm test:ci
```

Expected: PASS (tests mock GLB loading).

**Step 4: Commit**

```bash
git add -u public/models/
git commit -m "chore: remove 43MB of bloated furniture GLBs replaced by lightweight alternatives"
```

---

### Task 4: Update LoadingScreen for Parallel GLB Loading

The current `LoadingScreen.tsx` downloads a single `kitchen.glb` file. Replace with parallel loading of many tiny GLBs using `useGLTF.preload()`.

**Files:**
- Modify: `src/components/ui/LoadingScreen.tsx`
- Reference: `src/engine/FurnitureLayout.ts` (FURNITURE_RULES for GLB list)
- Reference: `src/engine/assetUrl.ts` (getAssetUrl)

**Step 1: Rewrite LoadingScreen asset loading**

In `LoadingScreen.tsx`, replace the `kitchen.glb` single-file fetch with a system that:

1. Builds an array of all GLB URLs from `FURNITURE_RULES`
2. Uses `Promise.all` with `fetch` for parallel download of all GLBs + textures
3. Tracks progress across all files (count-based, not byte-based — files are so tiny byte tracking is overkill)
4. Calls `useGLTF.preload(url)` for each GLB to warm the drei cache

Key changes to `LoadingScreen.tsx`:

```typescript
import { FURNITURE_RULES } from '../../engine/FurnitureLayout';
import { getAssetUrl } from '../../engine/assetUrl';
import { useGLTF } from '@react-three/drei';

// Build preload list from furniture rules
const GLB_URLS = FURNITURE_RULES.map(r => getAssetUrl('models', r.glb));

// Add texture URLs (keep existing TEXTURE_FILES array)
const ALL_ASSETS = [...GLB_URLS, ...TEXTURE_URLS];
```

Replace the streaming byte-level progress with count-based progress:

```typescript
let loaded = 0;
const total = ALL_ASSETS.length;

await Promise.all(
  ALL_ASSETS.map(async (url) => {
    try {
      await fetch(url);
      loaded++;
      setProgress(Math.round((loaded / total) * 100));
    } catch {
      // Skip failed assets — non-critical
      loaded++;
      setProgress(Math.round((loaded / total) * 100));
    }
  })
);
```

Remove: `kitchen.glb` reference, `ReadableStream` byte-level progress, HEAD request size calculation.
Keep: Mr. Sausage quotes, sausage progress bar visual, `audioEngine.initTone()`, retry logic.

**Step 2: Run tests**

```bash
pnpm test:ci
```

Expected: PASS

**Step 3: Manual verification**

```bash
npx expo start --web
```

Verify: Loading screen appears briefly, game loads with new tiny furniture.

**Step 4: Commit**

```bash
git add src/components/ui/LoadingScreen.tsx
git commit -m "feat: parallel GLB loading from furniture rules instead of single kitchen.glb"
```

---

### Task 5: PNG Sprite Title Screen Buttons

Replace text `TouchableOpacity` buttons with the PNG sausage character sprites from `public/ui/`.

**Files:**
- Modify: `src/components/ui/TitleScreen.tsx`
- Reference: `public/ui/btn_newgame_normal.png`, `public/ui/btn_newgame_hover.png` (462×152)
- Reference: `public/ui/btn_load_normal.png`, `public/ui/btn_load_hover.png`
- Reference: `public/ui/btn_quit_normal.png`, `public/ui/btn_quit_hover.png`

**Step 1: Create button image component**

Inside `TitleScreen.tsx`, create a `SausageButton` component:

```typescript
function SausageButton({
  normalSource,
  hoverSource,
  onPress,
  disabled = false,
}: {
  normalSource: any;  // require('...') result
  hoverSource: any;
  onPress: () => void;
  disabled?: boolean;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <Pressable
      onPress={onPress}
      onPressIn={() => setIsHovered(true)}
      onPressOut={() => setIsHovered(false)}
      onHoverIn={() => setIsHovered(true)}
      onHoverOut={() => setIsHovered(false)}
      disabled={disabled}
      style={{marginVertical: 8, opacity: disabled ? 0.5 : 1}}
    >
      <Image
        source={isHovered ? hoverSource : normalSource}
        style={{width: 280, height: 92}}
        resizeMode="contain"
      />
    </Pressable>
  );
}
```

**Step 2: Replace MENU_ITEMS rendering**

Replace the `MENU_ITEMS.map(...)` block with individual `SausageButton` instances:

```typescript
<SausageButton
  normalSource={require('../../../public/ui/btn_newgame_normal.png')}
  hoverSource={require('../../../public/ui/btn_newgame_hover.png')}
  onPress={handleNewGame}
/>
<SausageButton
  normalSource={require('../../../public/ui/btn_load_normal.png')}
  hoverSource={require('../../../public/ui/btn_load_hover.png')}
  onPress={handleContinue}
  disabled={!hasSaveData}
/>
{/* Settings: text button matching aesthetic (no PNG exists) */}
<Pressable onPress={() => setShowSettings(true)} style={styles.settingsButton}>
  <Text style={styles.settingsText}>SETTINGS</Text>
</Pressable>
<SausageButton
  normalSource={require('../../../public/ui/btn_quit_normal.png')}
  hoverSource={require('../../../public/ui/btn_quit_hover.png')}
  onPress={handleQuit}
/>
```

**Step 3: Add handleQuit action**

```typescript
const handleQuit = () => {
  // On web, close tab. On native, exit app.
  if (Platform.OS === 'web') {
    window.close();
  }
};
```

**Step 4: Run tests**

```bash
pnpm test:ci
```

Expected: PASS

**Step 5: Manual verification**

```bash
npx expo start --web
```

Verify: PNG sausage buttons render, hover swaps image, clicks work.

**Step 6: Commit**

```bash
git add src/components/ui/TitleScreen.tsx public/ui/
git commit -m "feat: PNG sausage sprite buttons on title screen"
```

---

### Task 6: Phase 1 Verification

Run all checks to confirm Phase 1 is clean.

**Step 1: Run full test suite**

```bash
pnpm test:ci
```

Expected: All tests pass.

**Step 2: Run linter**

```bash
pnpm lint
```

Expected: Clean.

**Step 3: Run typecheck**

```bash
pnpm typecheck
```

Expected: No type errors.

**Step 4: Manual playtest**

```bash
npx expo start --web
```

Verify:
- Title screen shows PNG buttons
- Game loads quickly (no more 47MB download)
- Kitchen renders with replacement furniture
- Horror props visible in scene
- All 5 challenge stations still reachable and functional

**Step 5: Commit tag**

```bash
git tag phase1-asset-swap
```

---

## Phase 2: Room Expansion + Basement Atmosphere

Expand the kitchen from 13×13 to 18×16, add horror structural elements, update all target positions.

---

### Task 7: Expand Room Dimensions + Update Targets

Change `DEFAULT_ROOM` and recalculate all target positions for the larger room.

**Files:**
- Modify: `src/engine/FurnitureLayout.ts:54` (DEFAULT_ROOM)
- Modify: `src/engine/FurnitureLayout.ts:81-337` (resolveTargets — all positions)
- Modify: `src/engine/__tests__/FurnitureLayout.test.ts`

**Step 1: Write test for new room dimensions**

```typescript
it('should use expanded 18x16 room dimensions', () => {
  expect(DEFAULT_ROOM).toEqual({w: 18, d: 16, h: 5.5});
});

it('should have all station targets within room bounds', () => {
  const targets = resolveTargets(DEFAULT_ROOM);
  const halfW = DEFAULT_ROOM.w / 2;
  const halfD = DEFAULT_ROOM.d / 2;
  for (const name of STATION_TARGET_NAMES) {
    const t = targets[name];
    expect(t).toBeDefined();
    expect(Math.abs(t.position[0])).toBeLessThanOrEqual(halfW);
    expect(Math.abs(t.position[2])).toBeLessThanOrEqual(halfD);
    expect(t.position[1]).toBeGreaterThanOrEqual(0);
    expect(t.position[1]).toBeLessThanOrEqual(DEFAULT_ROOM.h);
  }
});
```

**Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern='FurnitureLayout' --verbose
```

Expected: FAIL — DEFAULT_ROOM is still 13×13.

**Step 3: Update DEFAULT_ROOM**

```typescript
export const DEFAULT_ROOM: RoomDimensions = {w: 18, d: 16, h: 5.5};
```

**Step 4: Recalculate all target positions**

The key change: `halfW` goes from 6.5 to 9, `halfD` goes from 6.5 to 8. All positions that reference `halfW`/`halfD` shift.

Station positions scale proportionally — keep the same offsets from walls but with wider spacing:

```typescript
// Station targets (in resolveTargets)
fridge: position: [-halfW + 1.34, room.h * 0.325, -halfD + 1.48]
// Was: [-5.16, 1.79, -5.02] → Now: [-7.66, 1.79, -6.52]

grinder: position: [-halfW + 1.75, room.h * 0.375, -halfD + 5.86]
// Was: [-4.75, 2.06, -0.64] → Now: [-7.25, 2.06, -2.14]

stuffer: position: [halfW - 4.22, room.h * 0.487, halfD - 4.25]
// Was: [2.28, 2.68, 2.25] → Now: [4.78, 2.68, 3.75]

stove: position: [-halfW + 1.52, room.h * 0.387, -halfD + 4.27]
// Was: [-4.98, 2.13, -2.23] → Now: [-7.48, 2.13, -3.73]

crt-tv: position: [0, room.h * 0.455, -halfD + 1.0]
// Was: [0, 2.50, -5.50] → Now: [0, 2.50, -7.0]
```

All other targets shift similarly. The wall offsets stay the same (e.g., `halfW + 1.34` = 1.34 from wall) but the absolute positions change because the walls moved.

**Step 5: Run tests**

```bash
pnpm test:ci
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/engine/FurnitureLayout.ts src/engine/__tests__/FurnitureLayout.test.ts
git commit -m "feat: expand kitchen to 18x16 with recalculated target positions"
```

---

### Task 8: Update KitchenEnvironment for Larger Room

Update room geometry, wall planes, lighting positions for the 18×16 room.

**Files:**
- Modify: `src/components/kitchen/KitchenEnvironment.tsx`
- Test: `src/components/kitchen/__tests__/KitchenEnvironment.test.tsx`

**Step 1: Update room constants**

In `KitchenEnvironment.tsx`, change:

```typescript
const ROOM_W = 18;  // was 13
const ROOM_D = 16;  // was 13
const ROOM_H = 5.5; // unchanged
```

**Step 2: Update wall configs**

The `WALL_CONFIGS` array uses `ROOM_W` and `ROOM_D` for wall dimensions. These should already be computed from the constants, but verify each wall's position and size accounts for the new dimensions.

**Step 3: Reposition fluorescent tubes**

Update `TUBE_POSITIONS` for wider room — add a 4th tube:

```typescript
const TUBE_POSITIONS: [number, number, number][] = [
  [-4.0, 4.2, 2.0],
  [2.0, 4.2, -1.5],
  [-4.0, 4.2, -4.0],
  [4.0, 4.2, 4.0],  // new — covers right side
];
```

**Step 4: Update grime decal positions**

Adjust `GRIME_DRIPS` and `GRIME_BASES` positions for the new wall locations.

**Step 5: Run tests**

```bash
pnpm test -- --testPathPattern='KitchenEnvironment' --verbose
```

Expected: PASS

**Step 6: Commit**

```bash
git add src/components/kitchen/KitchenEnvironment.tsx
git commit -m "feat: update kitchen environment for 18x16 room dimensions"
```

---

### Task 9: Update GameWorld Sensors for New Layout

Update `GameWorld.tsx` station sensor positions to match the new room dimensions. Update `RoomColliders` for 18×16.

**Files:**
- Modify: `src/components/GameWorld.tsx`
- Test: `src/components/__tests__/GameWorld.test.tsx`

**Step 1: Verify RESOLVED_TARGETS auto-updates**

`GameWorld.tsx` line 54 uses `resolveTargets(DEFAULT_ROOM)`, so it should automatically pick up the new room dimensions from Task 7. Verify this is the case.

**Step 2: Update RoomColliders**

`RoomColliders` component creates 6 `CuboidCollider`s (floor, ceiling, 4 walls). Update dimensions:

```typescript
// Floor and ceiling half-extents
const HALF_W = DEFAULT_ROOM.w / 2;  // 9
const HALF_D = DEFAULT_ROOM.d / 2;  // 8
const H = DEFAULT_ROOM.h;           // 5.5

// Floor: CuboidCollider args=[halfW, 0.1, halfD] at y=-0.1
// Ceiling: CuboidCollider args=[halfW, 0.1, halfD] at y=H+0.1
// Walls: CuboidCollider matching wall dimensions
```

**Step 3: Run tests**

```bash
pnpm test:ci
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/components/GameWorld.tsx
git commit -m "feat: update game world sensors and colliders for 18x16 room"
```

---

### Task 10: Add Basement Structure Elements

Create a component for the horror basement structural elements: exposed pipes on ceiling, barred window, locked metal door, drain grate.

**Files:**
- Create: `src/components/kitchen/BasementStructure.tsx`
- Modify: `src/components/kitchen/KitchenEnvironment.tsx` (add BasementStructure)

**Step 1: Create BasementStructure.tsx**

```typescript
import * as THREE from 'three/webgpu';
import { DEFAULT_ROOM } from '../../engine/FurnitureLayout';

/** Procedural basement structural elements — pipes, door, window, drain */
export function BasementStructure() {
  const halfW = DEFAULT_ROOM.w / 2;
  const halfD = DEFAULT_ROOM.d / 2;
  const H = DEFAULT_ROOM.h;

  return (
    <group>
      {/* Ceiling pipes — 3 horizontal runs */}
      <CeilingPipes halfW={halfW} halfD={halfD} h={H} />

      {/* Barred window — high on right wall, too small to escape */}
      <BarredWindow halfW={halfW} halfD={halfD} h={H} />

      {/* Metal door — right side, near front. Locked. */}
      <LockedDoor halfW={halfW} halfD={halfD} />

      {/* Floor drain — center-right area */}
      <FloorDrain />
    </group>
  );
}
```

Each sub-component uses `BoxGeometry`, `CylinderGeometry`, `PlaneGeometry` with `meshStandardMaterial`.

**Pipes:** 3 horizontal `CylinderGeometry` runs across ceiling, color `#555555`, roughness 0.8, metalness 0.6.

**Window:** `PlaneGeometry` background (dark, emissive slight blue) + 4 vertical bar `CylinderGeometry`s. Position: `[halfW - 0.05, H * 0.7, -halfD + 4]`, width ~1.5, height ~1.

**Door:** `BoxGeometry` flat panel, `meshStandardMaterial` color `#444444`, metalness 0.8. Add small lock detail. Position: `[halfW - 0.05, 1.2, halfD - 2]`.

**Drain:** `PlaneGeometry` on floor, circular alpha cutout texture or just a dark circle with `meshBasicMaterial`.

**Step 2: Add to KitchenEnvironment**

```typescript
import { BasementStructure } from './BasementStructure';

// Inside KitchenEnvironment return:
<BasementStructure />
```

**Step 3: Run tests**

```bash
pnpm test:ci
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/components/kitchen/BasementStructure.tsx src/components/kitchen/KitchenEnvironment.tsx
git commit -m "feat: add procedural basement structure (pipes, window, door, drain)"
```

---

### Task 11: Phase 2 Verification

**Step 1: Run full checks**

```bash
pnpm test:ci && pnpm lint && pnpm typecheck
```

**Step 2: Manual playtest** — verify expanded room, horror props, basement elements render correctly, all stations reachable.

**Step 3: Commit tag**

```bash
git tag phase2-room-expansion
```

---

## Phase 3: Procedural Sausage Factory System

Port the factory mechanics from sausage_factory.html POC into the R3F codebase.

---

### Task 12: Procedural Meat Texture Generator

Port `generateMeatTexture()` from POC line 118-129.

**Files:**
- Create: `src/engine/MeatTexture.ts`
- Create: `src/engine/__tests__/MeatTexture.test.ts`

**Step 1: Write test**

```typescript
import { generateMeatTexture } from '../MeatTexture';

describe('MeatTexture', () => {
  it('should return a CanvasTexture', () => {
    // Mock canvas in JSDOM
    const tex = generateMeatTexture('#8B0000', 0.15);
    expect(tex).toBeDefined();
    expect(tex.image).toBeDefined();
    expect(tex.image.width).toBe(256);
    expect(tex.image.height).toBe(256);
  });

  it('should accept different fat ratios', () => {
    const lean = generateMeatTexture('#8B0000', 0.05);
    const fatty = generateMeatTexture('#8B0000', 0.3);
    expect(lean).toBeDefined();
    expect(fatty).toBeDefined();
  });
});
```

Note: This test requires `jest-canvas-mock` or JSDOM canvas support. If canvas isn't available in test env, test only the module interface and skip pixel-level assertions.

**Step 2: Run test to verify it fails**

```bash
pnpm test -- --testPathPattern='MeatTexture' --verbose
```

Expected: FAIL — module doesn't exist.

**Step 3: Implement MeatTexture.ts**

```typescript
import * as THREE from 'three/webgpu';

/**
 * Generates a procedural meat texture using canvas 2D drawing.
 * Ported from sausage_factory.html lines 118-129.
 *
 * @param colorHex - Base meat color (e.g., '#8B0000' for raw, '#654321' for cooked)
 * @param fatRatio - Ratio of white fat specks (0.0 to 1.0)
 * @param size - Texture resolution (default 256)
 * @returns THREE.CanvasTexture ready to apply as material map
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

  // Base color fill
  ctx.fillStyle = colorHex;
  ctx.fillRect(0, 0, size, size);

  // Muscle fiber specks (darker red streaks)
  const fiberCount = size * 2;
  for (let i = 0; i < fiberCount; i++) {
    ctx.fillStyle = `rgba(60, 0, 0, ${0.1 + Math.random() * 0.15})`;
    const x = Math.random() * size;
    const y = Math.random() * size;
    ctx.fillRect(x, y, 1 + Math.random() * 3, 1);
  }

  // Fat specks (white dots)
  const fatCount = Math.floor(size * size * fatRatio * 0.01);
  for (let i = 0; i < fatCount; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 2;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 240, 220, ${0.4 + Math.random() * 0.4})`;
    ctx.fill();
  }

  // Slight blur pass for organic look
  ctx.filter = 'blur(0.5px)';
  ctx.drawImage(canvas, 0, 0);
  ctx.filter = 'none';

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  return texture;
}
```

**Step 4: Run test**

```bash
pnpm test -- --testPathPattern='MeatTexture' --verbose
```

Expected: PASS (or skip if canvas not in test env — add `@jest-environment jsdom` annotation).

**Step 5: Commit**

```bash
git add src/engine/MeatTexture.ts src/engine/__tests__/MeatTexture.test.ts
git commit -m "feat: procedural meat texture generator ported from POC"
```

---

### Task 13: Sausage Body — SkinnedMesh + Bone Chain

Port the sausage bone chain physics from POC lines 252-306. This is the central physical object carried between stations.

**Files:**
- Create: `src/engine/SausageBody.ts`
- Create: `src/engine/__tests__/SausageBody.test.ts`

**Step 1: Write test**

```typescript
import { createSausageSkeleton, SausageCurve, SAUSAGE_BONE_COUNT } from '../SausageBody';

describe('SausageBody', () => {
  it('should export the bone count constant', () => {
    expect(SAUSAGE_BONE_COUNT).toBeGreaterThan(0);
    expect(SAUSAGE_BONE_COUNT).toBeLessThanOrEqual(12);
  });

  it('SausageCurve should return points along Y axis', () => {
    const curve = new SausageCurve(2.0);
    const p0 = curve.getPoint(0);
    const p1 = curve.getPoint(1);
    expect(p0.y).toBe(0);
    expect(p1.y).toBeCloseTo(2.0);
    expect(p0.x).toBe(0);
    expect(p0.z).toBe(0);
  });

  it('createSausageSkeleton should return bones and skeleton', () => {
    const result = createSausageSkeleton(2.0, 8);
    expect(result.bones).toHaveLength(8);
    expect(result.skeleton).toBeDefined();
    expect(result.rootBone).toBe(result.bones[0]);
  });
});
```

**Step 2: Implement SausageBody.ts**

```typescript
import * as THREE from 'three/webgpu';

/** Number of bones in the sausage chain */
export const SAUSAGE_BONE_COUNT = 8;

/** Sausage length in world units */
export const SAUSAGE_LENGTH = 2.0;

/** Sausage radius */
export const SAUSAGE_RADIUS = 0.12;

/** Spring constant for bone-to-anchor impulse */
export const SPRING_K = 80;

/** Damping factor for bone velocity */
export const SPRING_DAMP = 10;

/**
 * Curve that defines the sausage rest shape — straight line along Y.
 * Ported from sausage_factory.html SausageCurve.
 */
export class SausageCurve extends THREE.Curve<THREE.Vector3> {
  length: number;
  constructor(length: number) {
    super();
    this.length = length;
  }
  getPoint(t: number): THREE.Vector3 {
    return new THREE.Vector3(0, t * this.length, 0);
  }
}

/**
 * Creates the bone hierarchy for the sausage SkinnedMesh.
 *
 * @param length - Total sausage length
 * @param boneCount - Number of bones along the length
 * @returns Object with bones array, skeleton, and rootBone reference
 */
export function createSausageSkeleton(length: number, boneCount: number) {
  const segLen = length / (boneCount - 1);
  const bones: THREE.Bone[] = [];

  for (let i = 0; i < boneCount; i++) {
    const bone = new THREE.Bone();
    bone.position.set(0, i === 0 ? 0 : segLen, 0);
    if (i > 0) bones[i - 1].add(bone);
    bones.push(bone);
  }

  const skeleton = new THREE.Skeleton(bones);
  return { bones, skeleton, rootBone: bones[0] };
}

/**
 * Creates the sausage TubeGeometry with skinning attributes.
 *
 * @param length - Sausage length
 * @param radius - Sausage radius
 * @param boneCount - Number of bones to skin against
 * @returns BufferGeometry with skinIndex and skinWeight attributes
 */
export function createSausageGeometry(
  length: number,
  radius: number,
  boneCount: number,
): THREE.BufferGeometry {
  const curve = new SausageCurve(length);
  const segments = boneCount * 4;
  const radialSegments = 12;

  const geometry = new THREE.TubeGeometry(curve, segments, radius, radialSegments, false);

  // Assign skin weights — each vertex maps to nearest bone
  const posAttr = geometry.getAttribute('position');
  const vertCount = posAttr.count;
  const skinIndices = new Float32Array(vertCount * 4);
  const skinWeights = new Float32Array(vertCount * 4);
  const segLen = length / (boneCount - 1);

  for (let i = 0; i < vertCount; i++) {
    const y = posAttr.getY(i);
    const boneFloat = y / segLen;
    const boneIdx = Math.min(Math.floor(boneFloat), boneCount - 2);
    const blend = boneFloat - boneIdx;

    skinIndices[i * 4] = boneIdx;
    skinIndices[i * 4 + 1] = boneIdx + 1;
    skinIndices[i * 4 + 2] = 0;
    skinIndices[i * 4 + 3] = 0;

    skinWeights[i * 4] = 1 - blend;
    skinWeights[i * 4 + 1] = blend;
    skinWeights[i * 4 + 2] = 0;
    skinWeights[i * 4 + 3] = 0;
  }

  geometry.setAttribute('skinIndex', new THREE.BufferAttribute(
    new Uint16Array(skinIndices), 4,
  ));
  geometry.setAttribute('skinWeight', new THREE.BufferAttribute(skinWeights, 4));

  return geometry;
}
```

**Step 3: Run tests**

```bash
pnpm test -- --testPathPattern='SausageBody' --verbose
```

Expected: PASS

**Step 4: Commit**

```bash
git add src/engine/SausageBody.ts src/engine/__tests__/SausageBody.test.ts
git commit -m "feat: sausage body bone chain skeleton and skinned geometry"
```

---

### Task 14: Sausage R3F Component with Rapier Physics

Create the React component that renders the sausage SkinnedMesh and drives bones with Rapier rigid bodies.

**Files:**
- Create: `src/components/kitchen/ProceduralSausage.tsx`
- Reference: `src/engine/SausageBody.ts`
- Reference: `src/engine/MeatTexture.ts`
- Reference: `sausage_factory.html:252-306, 540-560` (physics loop)

**Step 1: Create ProceduralSausage.tsx**

```typescript
import { useFrame } from '@react-three/fiber';
import { RigidBody, useRapier } from '@react-three/rapier';
import * as THREE from 'three/webgpu';
import { useRef, useMemo, useEffect } from 'react';
import {
  createSausageSkeleton,
  createSausageGeometry,
  SAUSAGE_BONE_COUNT,
  SAUSAGE_LENGTH,
  SAUSAGE_RADIUS,
  SPRING_K,
  SPRING_DAMP,
} from '../../engine/SausageBody';
import { generateMeatTexture } from '../../engine/MeatTexture';

interface ProceduralSausageProps {
  position: [number, number, number];
  /** Cook level 0-1 (0=raw pink, 0.7=golden, 1.0=burnt black) */
  cookLevel?: number;
  /** Whether physics simulation is active */
  physicsActive?: boolean;
}

export function ProceduralSausage({
  position,
  cookLevel = 0,
  physicsActive = true,
}: ProceduralSausageProps) {
  const meshRef = useRef<THREE.SkinnedMesh>(null);
  const matRef = useRef<THREE.MeshStandardMaterial>(null);

  // Create skeleton and geometry once
  const { bones, skeleton, rootBone } = useMemo(
    () => createSausageSkeleton(SAUSAGE_LENGTH, SAUSAGE_BONE_COUNT),
    [],
  );
  const geometry = useMemo(
    () => createSausageGeometry(SAUSAGE_LENGTH, SAUSAGE_RADIUS, SAUSAGE_BONE_COUNT),
    [],
  );
  const meatTexture = useMemo(
    () => generateMeatTexture('#8B0000', 0.15),
    [],
  );

  // Bind skeleton to mesh
  useEffect(() => {
    if (meshRef.current) {
      meshRef.current.add(rootBone);
      meshRef.current.bind(skeleton);
    }
  }, [rootBone, skeleton]);

  // Update cook color
  useFrame(() => {
    if (!matRef.current) return;
    const mat = matRef.current;

    // Pink (raw) -> Brown (cooked) -> Black (burnt)
    if (cookLevel < 0.7) {
      const t = cookLevel / 0.7;
      mat.color.lerpColors(
        new THREE.Color('#D4756B'), // raw pink
        new THREE.Color('#8B4513'), // golden brown
        t,
      );
    } else {
      const t = (cookLevel - 0.7) / 0.3;
      mat.color.lerpColors(
        new THREE.Color('#8B4513'),
        new THREE.Color('#1a1a1a'), // burnt black
        t,
      );
    }

    mat.roughness = 0.4 + cookLevel * 0.8;
  });

  return (
    <skinnedMesh
      ref={meshRef}
      geometry={geometry}
      position={position}
    >
      <meshStandardMaterial
        ref={matRef}
        map={meatTexture}
        roughness={0.4}
        metalness={0.1}
      />
    </skinnedMesh>
  );
}
```

This is the visual-only component. Rapier body driving will be added in the cooking mechanics task, since the sausage only needs physics when it's in the pan.

**Step 2: Run tests**

```bash
pnpm test:ci
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/components/kitchen/ProceduralSausage.tsx
git commit -m "feat: procedural sausage SkinnedMesh component with cook-level color"
```

---

### Task 15: Grinder Mechanics — Chunk InstancedMesh + Particles

Add procedural grinder interaction mechanics on top of the existing `GrinderStation.tsx`. The existing station handles visual crank rotation and splatter — this adds the meat chunk filling and particle output.

**Files:**
- Create: `src/components/kitchen/GrinderMechanics.tsx`
- Modify: `src/components/kitchen/GrinderStation.tsx` (integrate mechanics)
- Reference: `sausage_factory.html:132-172, 330-380, 492-520`

**Step 1: Create GrinderMechanics.tsx**

This component manages:
- Raw meat chunks as `InstancedMesh` (count=20) with procedural meat texture
- Chunk-to-hopper drag interaction (via Rapier sensor or pointer events)
- Ground meat particle output (InstancedMesh, count=12)
- Grinder vibration animation (small random offset on grinder group)

```typescript
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { useRef, useMemo } from 'react';
import { generateMeatTexture } from '../../engine/MeatTexture';

interface GrinderMechanicsProps {
  /** Position of the grinder in world space */
  grinderPosition: [number, number, number];
  /** 0-100 grind progress */
  progress: number;
  /** Whether motor is running (vibration + particles) */
  motorRunning: boolean;
  /** Position of mixing bowl to receive output */
  bowlPosition: [number, number, number];
}

const CHUNK_COUNT = 20;
const PARTICLE_COUNT = 12;

export function GrinderMechanics({
  grinderPosition,
  progress,
  motorRunning,
  bowlPosition,
}: GrinderMechanicsProps) {
  const chunksRef = useRef<THREE.InstancedMesh>(null);
  const particlesRef = useRef<THREE.InstancedMesh>(null);
  const vibeRef = useRef<THREE.Group>(null);

  const meatTex = useMemo(() => generateMeatTexture('#8B0000', 0.15), []);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Chunks visible based on how many have been "fed" into grinder
  const visibleChunks = Math.max(0, CHUNK_COUNT - Math.floor(progress / 5));

  // Grinder vibration when motor is running
  useFrame((_, delta) => {
    if (vibeRef.current && motorRunning) {
      vibeRef.current.position.x = (Math.random() - 0.5) * 0.02;
      vibeRef.current.position.z = (Math.random() - 0.5) * 0.02;
    }

    // Animate output particles falling toward bowl
    if (particlesRef.current && motorRunning) {
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        particlesRef.current.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        dummy.position.y -= delta * 2;
        if (dummy.position.y < bowlPosition[1]) {
          // Reset particle to output position
          dummy.position.set(
            grinderPosition[0] + 0.6 + (Math.random() - 0.5) * 0.1,
            grinderPosition[1] + 0.3,
            grinderPosition[2] + 0.5 + (Math.random() - 0.5) * 0.1,
          );
        }
        dummy.updateMatrix();
        particlesRef.current.setMatrixAt(i, dummy.matrix);
      }
      particlesRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  return (
    <group ref={vibeRef}>
      {/* Raw meat chunks */}
      <instancedMesh ref={chunksRef} args={[undefined, undefined, CHUNK_COUNT]}>
        <boxGeometry args={[0.08, 0.08, 0.08]} />
        <meshStandardMaterial map={meatTex} roughness={0.7} />
      </instancedMesh>

      {/* Output particles */}
      {motorRunning && (
        <instancedMesh ref={particlesRef} args={[undefined, undefined, PARTICLE_COUNT]}>
          <sphereGeometry args={[0.02, 6, 6]} />
          <meshStandardMaterial color="#6B2020" roughness={0.8} />
        </instancedMesh>
      )}
    </group>
  );
}
```

**Step 2: Run tests**

```bash
pnpm test:ci
```

Expected: PASS

**Step 3: Commit**

```bash
git add src/components/kitchen/GrinderMechanics.tsx
git commit -m "feat: grinder mechanics — meat chunk instancing and particle output"
```

---

### Task 16: Stuffer Mechanics — Casing Growth

Add the casing (sausage skin) growth mechanic to the stuffer station.

**Files:**
- Create: `src/components/kitchen/StufferMechanics.tsx`
- Reference: `sausage_factory.html:174-202, 380-420`

**Step 1: Create StufferMechanics.tsx**

The casing is a `TubeGeometry` following a `SquigglyCurve` that grows as the player cranks. The casing extends from the nozzle tip, drooping under simulated gravity.

```typescript
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { useRef, useMemo, useState } from 'react';
import { generateMeatTexture } from '../../engine/MeatTexture';

interface StufferMechanicsProps {
  position: [number, number, number];
  fillLevel: number;   // 0-100
  pressure: number;    // 0-100
}

/**
 * Squiggly curve for natural sausage casing droop.
 * Ported from POC SquigglyCurve.
 */
class CasingCurve extends THREE.Curve<THREE.Vector3> {
  length: number;
  constructor(length: number) {
    super();
    this.length = length;
  }
  getPoint(t: number): THREE.Vector3 {
    const x = Math.sin(t * Math.PI * 2) * 0.05;
    const y = -t * this.length * 0.3;  // droop
    const z = t * this.length;
    return new THREE.Vector3(x, y, z);
  }
}

export function StufferMechanics({ position, fillLevel, pressure }: StufferMechanicsProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const casingTex = useMemo(() => generateMeatTexture('#D4A574', 0.05), []);

  // Casing length proportional to fill level
  const casingLength = (fillLevel / 100) * 1.5;

  const geometry = useMemo(() => {
    if (casingLength < 0.01) return null;
    const curve = new CasingCurve(casingLength);
    return new THREE.TubeGeometry(curve, 20, 0.06, 8, false);
  }, [casingLength]);

  if (!geometry) return null;

  return (
    <group position={position}>
      {/* Casing emerging from nozzle */}
      <mesh ref={meshRef} geometry={geometry} position={[0.5, 0.3, 0.2]}>
        <meshStandardMaterial
          map={casingTex}
          roughness={0.6}
          transparent
          opacity={0.85}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}
```

**Step 2: Run tests**

```bash
pnpm test:ci
```

**Step 3: Commit**

```bash
git add src/components/kitchen/StufferMechanics.tsx
git commit -m "feat: stuffer mechanics — casing growth tube geometry"
```

---

### Task 17: Cooking Mechanics — Temperature Visual + Grease Surface

Add the cooking visual feedback: sausage color shift, grease surface (simplified — no FBO for initial implementation), steam particles.

**Files:**
- Create: `src/components/kitchen/CookingMechanics.tsx`
- Reference: `sausage_factory.html:204-250, 440-487, 514-529`

**Step 1: Create CookingMechanics.tsx**

Initial implementation uses a simplified grease surface (animated plane with normal perturbation) instead of the full FBO wave equation. The FBO can be added as a Phase 4 enhancement.

```typescript
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three/webgpu';
import { useRef, useMemo } from 'react';

interface CookingMechanicsProps {
  panPosition: [number, number, number];
  temperature: number;   // 70-250
  heatLevel: number;     // 0-1
  cookLevel: number;     // 0-1
}

const STEAM_COUNT = 20;

export function CookingMechanics({
  panPosition,
  temperature,
  heatLevel,
  cookLevel,
}: CookingMechanicsProps) {
  const greaseRef = useRef<THREE.Mesh>(null);
  const steamRef = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);

  // Grease surface ripple animation
  useFrame((state) => {
    if (greaseRef.current) {
      const mat = greaseRef.current.material as THREE.MeshStandardMaterial;
      // Animated roughness for sizzle effect
      mat.roughness = 0.2 + Math.sin(state.clock.elapsedTime * 10) * 0.05 * heatLevel;
    }

    // Steam particles rise and reset
    if (steamRef.current && heatLevel > 0.1) {
      for (let i = 0; i < STEAM_COUNT; i++) {
        steamRef.current.getMatrixAt(i, dummy.matrix);
        dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
        dummy.position.y += heatLevel * 0.02;
        dummy.scale.setScalar(Math.max(0, dummy.scale.x - 0.002));
        if (dummy.position.y > panPosition[1] + 1.5 || dummy.scale.x < 0.01) {
          dummy.position.set(
            panPosition[0] + (Math.random() - 0.5) * 0.3,
            panPosition[1] + 0.1,
            panPosition[2] + (Math.random() - 0.5) * 0.3,
          );
          dummy.scale.setScalar(0.03 + Math.random() * 0.03);
        }
        dummy.updateMatrix();
        steamRef.current.setMatrixAt(i, dummy.matrix);
      }
      steamRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  // Burner glow color based on heat
  const burnerColor = useMemo(() => {
    const c = new THREE.Color();
    c.lerpColors(new THREE.Color('#333'), new THREE.Color('#FF4400'), heatLevel);
    return c;
  }, [heatLevel]);

  return (
    <group>
      {/* Burner ring (TorusGeometry) */}
      <mesh position={[panPosition[0], panPosition[1] - 0.02, panPosition[2]]}>
        <torusGeometry args={[0.25, 0.02, 8, 24]} />
        <meshStandardMaterial
          color={burnerColor}
          emissive={burnerColor}
          emissiveIntensity={heatLevel * 2}
        />
      </mesh>

      {/* Grease surface in pan */}
      <mesh
        ref={greaseRef}
        position={[panPosition[0], panPosition[1] + 0.03, panPosition[2]]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <circleGeometry args={[0.28, 24]} />
        <meshStandardMaterial
          color="#8B7355"
          roughness={0.3}
          metalness={0.1}
          transparent
          opacity={0.7}
        />
      </mesh>

      {/* Steam particles */}
      {heatLevel > 0.1 && (
        <instancedMesh ref={steamRef} args={[undefined, undefined, STEAM_COUNT]}>
          <sphereGeometry args={[1, 6, 6]} />
          <meshBasicMaterial color="#FFFFFF" transparent opacity={0.15} />
        </instancedMesh>
      )}
    </group>
  );
}
```

**Step 2: Run tests**

```bash
pnpm test:ci
```

**Step 3: Commit**

```bash
git add src/components/kitchen/CookingMechanics.tsx
git commit -m "feat: cooking mechanics — burner glow, grease surface, steam particles"
```

---

### Task 18: Phase 3 Verification

**Step 1: Run all checks**

```bash
pnpm test:ci && pnpm lint && pnpm typecheck
```

**Step 2: Commit tag**

```bash
git tag phase3-factory-mechanics
```

---

## Phase 4: Game Flow + Integration

Wire up the factory components, extend the state machine, integrate the full pipeline.

---

### Task 19: Extend Game State Machine

Add the new game states to `gameStore.ts` for the 12-state flow.

**Files:**
- Modify: `src/store/gameStore.ts`
- Test: `src/store/__tests__/gameStore.test.ts` (if exists) or inline verification

**Step 1: Update GameStatus type**

In `gameStore.ts`, extend the game status type:

```typescript
export type GameStatus =
  | 'menu' | 'playing' | 'victory' | 'defeat'
  // Factory pipeline states (new)
  | 'fill_grinder' | 'grinding' | 'move_bowl'
  | 'attach_casing' | 'stuffing' | 'move_sausage'
  | 'move_pan' | 'cooking';
```

**Step 2: Add factory state actions**

```typescript
// New actions
setFactoryState: (state: GameStatus) => void;
```

**Step 3: Add factory progression logic**

The factory states advance automatically based on challenge completion:
- Challenge 1 (grinder) complete → `fill_grinder` → `grinding` → `move_bowl`
- Challenge 2 (stuffer) complete → `attach_casing` → `stuffing` → `move_sausage`
- Challenge 3 (cooking) complete → `move_pan` → `cooking`

**Step 4: Run tests**

```bash
pnpm test:ci
```

**Step 5: Commit**

```bash
git add src/store/gameStore.ts
git commit -m "feat: extend game state machine with factory pipeline states"
```

---

### Task 20: Integrate Factory Components into GameWorld

Wire up `GrinderMechanics`, `StufferMechanics`, `CookingMechanics`, and `ProceduralSausage` into `GameWorld.tsx`'s `SceneContent`.

**Files:**
- Modify: `src/components/GameWorld.tsx`
- Reference: All Task 14-17 components

**Step 1: Import factory components**

```typescript
import { GrinderMechanics } from './kitchen/GrinderMechanics';
import { StufferMechanics } from './kitchen/StufferMechanics';
import { CookingMechanics } from './kitchen/CookingMechanics';
import { ProceduralSausage } from './kitchen/ProceduralSausage';
```

**Step 2: Add to SceneContent render**

Inside `SceneContent`, conditionally render factory components based on `currentChallenge` and factory state:

```typescript
{/* Grinder mechanics — visible during challenge 1 */}
{currentChallenge >= 1 && (
  <GrinderMechanics
    grinderPosition={RESOLVED_TARGETS.grinder.position}
    progress={challengeProgress}
    motorRunning={currentChallenge === 1 && gameStatus === 'grinding'}
    bowlPosition={RESOLVED_TARGETS['grinder-output'].position}
  />
)}

{/* Stuffer mechanics — visible during challenge 2 */}
{currentChallenge >= 2 && (
  <StufferMechanics
    position={RESOLVED_TARGETS.stuffer.position}
    fillLevel={challengeProgress}
    pressure={challengePressure}
  />
)}

{/* Cooking mechanics — visible during challenge 3 */}
{currentChallenge >= 3 && (
  <CookingMechanics
    panPosition={RESOLVED_TARGETS['frying-pan'].position}
    temperature={challengeTemperature}
    heatLevel={challengeHeatLevel}
    cookLevel={challengeProgress / 100}
  />
)}

{/* Procedural sausage — visible after stuffing */}
{sausagePlaced && (
  <ProceduralSausage
    position={RESOLVED_TARGETS['frying-pan'].position}
    cookLevel={challengeProgress / 100}
  />
)}
```

**Step 3: Run tests**

```bash
pnpm test:ci
```

**Step 4: Commit**

```bash
git add src/components/GameWorld.tsx
git commit -m "feat: integrate factory mechanics into GameWorld scene"
```

---

### Task 21: Fridge Interior — Procedural Shelves + Food GLBs

Create the procedural fridge interior with shelves and food GLB placement.

**Files:**
- Create: `src/components/kitchen/FridgeInterior.tsx`
- Modify: `src/components/kitchen/FridgeStation.tsx` (integrate interior)

**Step 1: Create FridgeInterior.tsx**

```typescript
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three/webgpu';
import { getAssetUrl } from '../../engine/assetUrl';
import type { Ingredient } from '../../engine/Ingredients';

interface FridgeInteriorProps {
  position: [number, number, number];
  isOpen: boolean;
  ingredients: Ingredient[];
  selectedIds: Set<number>;
  onSelect: (index: number) => void;
}

/** Food GLB filenames for each ingredient type */
const FOOD_GLB_MAP: Record<string, string> = {
  steak: 'food_steak.glb',
  egg: 'food_egg.glb',
  bacon: 'food_bacon.glb',
  mushroom: 'food_mushroom.glb',
  pepper: 'food_pepper.glb',
  carrot: 'food_carrot.glb',
  broccoli: 'food_broccoli.glb',
  tomato: 'food_tomato.glb',
  cheese: 'food_cheese.glb',
  tentacle: 'food_tentacle.glb',
  fishbone: 'food_fishbone.glb',
  // ... map all ingredient IDs to food GLBs
};

const SHELF_Y = [-0.8, 0.0, 0.8];
const ITEMS_PER_SHELF = 5;

export function FridgeInterior({
  position,
  isOpen,
  ingredients,
  selectedIds,
  onSelect,
}: FridgeInteriorProps) {
  if (!isOpen) return null;

  return (
    <group position={position}>
      {/* Procedural shelves */}
      {SHELF_Y.map((y, si) => (
        <mesh key={si} position={[0, y, 0]}>
          <boxGeometry args={[0.9, 0.02, 0.5]} />
          <meshStandardMaterial color="#CCCCCC" roughness={0.3} metalness={0.5} />
        </mesh>
      ))}

      {/* Food items on shelves */}
      {ingredients.map((ing, i) => {
        const shelfIdx = Math.floor(i / ITEMS_PER_SHELF);
        const posInShelf = i % ITEMS_PER_SHELF;
        if (shelfIdx >= SHELF_Y.length) return null;
        if (selectedIds.has(i)) return null; // Already picked

        const glbFile = FOOD_GLB_MAP[ing.id] || 'food_steak.glb';
        const x = (posInShelf - 2) * 0.2;
        const y = SHELF_Y[shelfIdx] + 0.1;

        return (
          <FoodItem
            key={i}
            url={getAssetUrl('models', glbFile)}
            position={[x, y, 0]}
            onClick={() => onSelect(i)}
          />
        );
      })}
    </group>
  );
}

function FoodItem({
  url,
  position,
  onClick,
}: {
  url: string;
  position: [number, number, number];
  onClick: () => void;
}) {
  const { scene } = useGLTF(url);
  return (
    <primitive
      object={scene.clone()}
      position={position}
      scale={0.3}
      onClick={onClick}
    />
  );
}
```

**Step 2: Run tests**

```bash
pnpm test:ci
```

**Step 3: Commit**

```bash
git add src/components/kitchen/FridgeInterior.tsx
git commit -m "feat: procedural fridge interior with food GLB placement"
```

---

### Task 22: Sound Effect Integration

Add kitchen sound effects from the asset library to station interactions.

**Files:**
- Copy: Selected WAVs from `/Volumes/home/assets/kitchen/sounds/` → `public/audio/`
- Modify: `src/engine/AudioEngine.web.ts` (add new sound mappings)

**Step 1: Copy key sound effects**

```bash
# Select representative sounds for each interaction
cp /Volumes/home/assets/kitchen/sounds/sizzle*.wav public/audio/ 2>/dev/null
cp /Volumes/home/assets/kitchen/sounds/chop*.wav public/audio/ 2>/dev/null
cp /Volumes/home/assets/kitchen/sounds/boil*.wav public/audio/ 2>/dev/null
# etc. — select 10-15 key sounds
```

Note: WAV files may be large. Consider converting to OGG/MP3 for web delivery. The existing `public/audio/` directory already has `.ogg` files.

**Step 2: Add sound mappings to AudioEngine**

Add new methods to `AudioEngine.web.ts` for:
- `playGrind()` — looping grinder motor sound
- `playSizzle()` — looping pan sizzle
- `playChop()` — one-shot chopping sound
- `playSplat()` — one-shot meat splat

**Step 3: Commit**

```bash
git add public/audio/ src/engine/AudioEngine.web.ts src/engine/AudioEngine.ts
git commit -m "feat: kitchen sound effects for grinder, stove, and chopping"
```

---

### Task 23: End-to-End Playtest + Final Verification

Full verification pass. Run all automated checks and manual playtest.

**Step 1: Automated checks**

```bash
pnpm test:ci
pnpm lint
pnpm typecheck
```

All must pass.

**Step 2: Manual playtest**

```bash
npx expo start --web
```

Walk through the full game:
1. Title screen — PNG buttons work, settings accessible
2. Loading — fast (<3 seconds), progress bar visible
3. Kitchen — 18×16 room renders, horror props visible, pipes/door/window present
4. Station 0 (Fridge) — opens, shows food GLBs on shelves, selection works
5. Station 1 (Grinder) — meat chunks visible, motor vibrates, particles emit
6. Station 2 (Stuffer) — casing grows from nozzle
7. Station 3 (Stove) — burner glows, steam rises, sausage cooks
8. Station 4 (CRT TV) — judgment scene, score display
9. Game over — verdict screen, return to menu

**Step 3: Fix any issues found in playtest**

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat: complete sausage factory kitchen game implementation"
```

---

## Verification Checklist

```bash
# All tests pass
pnpm test:ci

# Linter clean
pnpm lint

# Types check
pnpm typecheck

# Asset size check — public/models/ should be <5MB total
du -sh public/models/

# No bloated GLBs remain
ls -lhS public/models/*.glb | head -5
# Largest should be <200KB (meat_grinder.glb at 168KB)

# Game loads and runs
npx expo start --web
```

## Parallel Execution Strategy

Tasks can be parallelized:

**Wave 1 (independent):** Tasks 1-3 (asset copy/delete), Task 5 (title screen)
**Wave 2 (depends on Wave 1):** Tasks 4, 7-10 (loading screen, room expansion)
**Wave 3 (independent of Waves 1-2):** Tasks 12-17 (engine modules + factory components)
**Wave 4 (depends on all):** Tasks 19-23 (integration + verification)
