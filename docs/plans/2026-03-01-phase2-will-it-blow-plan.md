<!--
title: Phase 2 Implementation Plan — Will It Blow + Difficulty + Multi-Round
domain: game-design
status: draft
engine: r3f
last-verified: 2026-03-02
depends-on: [game-design, state-management, 3d-rendering, phase1-complete]
agent-context: challenge-dev, scene-architect, store-warden
summary: Task-by-task execution plan for Phase 2 — 21 tasks across 5 waves
-->

# Phase 2 Implementation Plan: "Will It Blow?" — The Full Game

> **Design doc:** `docs/plans/2026-03-01-phase2-will-it-blow-design.md`
> **Phase 2 vision:** `memory/phase2-vision.md`
> **Prerequisite:** Phase 1 (sausage factory kitchen) merged to main

---

## Execution Strategy

5 waves of parallelizable work. Each wave completes before the next starts.
Total: 21 tasks. Estimated: 4-5 agent sessions.

**Wave 0 addresses Phase 1 gaps** — features from the POC (`sausage_factory.html`) that were not ported during Phase 1's orchestrator promotion. These are prerequisites for the Phase 2 gameplay loop.

---

## Wave 0: Phase 1 Completion Gaps (Tasks 0a-0f)

These fill gaps between the POC and the current codebase. All are parallelizable except 0e (depends on 0d).

### Task 0a: Fridge Door Pull Gesture

**Files:**
- Modify: `src/components/kitchen/FurnitureLoader.tsx`
- Modify: `src/store/gameStore.ts`

Currently the fridge door auto-opens when `isFridgeActive` becomes true. Replace with a drag-to-open gesture:
- Add `fridgeDoorProgress: number` (0=closed, 1=open) to store
- Player clicks fridge door handle mesh → begins drag
- Vertical drag maps to door animation progress (0→1)
- Door snaps open at progress > 0.7 (auto-completes animation)
- Once open, ingredient selection begins as normal
- POC reference: fridge door opens on proximity but the design spec calls for pull gesture

**Tests:** Drag sets progress, snap threshold works, ingredients accessible only after door open.

### Task 0b: Ingredient GLB Props on Fridge Shelves

**Files:**
- Create: `public/models/ingredients/` (GLB files per ingredient shape)
- Modify: `src/components/kitchen/FridgeStation.tsx`
- Modify: `src/engine/Ingredients.ts`

Currently all ingredients are procedural geometry (boxGeometry, cylinderGeometry, sphereGeometry). Replace with GLB models:
- Source or generate simple food GLB models (e.g., steak, cheese wheel, carrot, pepper, fish)
- Add `glbPath?: string` field to ingredient data in `Ingredients.ts`
- FridgeStation: if ingredient has `glbPath`, render via `useGLTF` instead of procedural shape
- Fall back to procedural for ingredients without GLB
- Scale each model to fit within `INGREDIENT_DIAMETER = 0.28` bounding sphere
- Place on fridge shelves using existing grid: 3 shelves, 5×4 grid per shelf

**Tests:** GLB ingredients render at correct scale, click detection works, fallback to procedural.

### Task 0c: Cutting Board / Chopping Station

**Files:**
- Create: `src/ecs/orchestrators/ChoppingOrchestrator.tsx`
- Create: `src/ecs/archetypes/choppingArchetype.ts`
- Create: `src/components/challenges/ChoppingHUD.tsx`
- Create: `src/data/dialogue/chopping.ts`
- Modify: `src/engine/ChallengeRegistry.ts`
- Modify: `src/store/gameStore.ts`
- Modify: `src/components/GameWorld.tsx`
- Modify: `App.tsx`

Add a chopping station between fridge (challenge 0) and grinder (challenge 1). The cutting board GLB already exists in FURNITURE_RULES as a decorative prop — promote it to an interactive station.

Challenge mechanics:
- Player places selected ingredients on cutting board (via TransferBowl or drag)
- Tap/rhythm mechanic: tap knife to chop (like POC's crank rhythm but for knife)
- ECS input: button primitive for chop action
- Progress: each ingredient needs N chops based on hardness
- Speed zone: too fast = sloppy (strike), good rhythm = clean cuts
- Visual: ingredient mesh splits/shrinks with each chop
- Score: precision + speed

Update challenge indices: ingredients=0, chopping=1, grinding=2, stuffing=3, cooking=4, tasting=5.

**Tests:** Chopping mechanics, station trigger, challenge progression updated.

### Task 0d: Grinder Hopper Tray Interaction

**Files:**
- Modify: `src/ecs/orchestrators/GrinderOrchestrator.tsx`
- Modify: `src/ecs/archetypes/grinderArchetype.ts`

Currently ingredients flow through TransferBowl → store state. Add visual hopper loading:
- Modify grinder tray (already defined as static box in archetype, scale `[5, 0.3, 4]`)
- When challenge starts, render ingredient chunks in the hopper tray (use ingredient decomposition colors)
- As grinder runs, chunks visually descend into the grinder body (translate Y down)
- Hopper empties proportionally to `challengeProgress`
- Ground output particles emerge from bottom (already implemented)

The tray ECS entity already exists — just needs visual ingredient filling.

**Tests:** Hopper shows ingredients, empties with progress, ingredient colors match.

### Task 0e: Sausage Body Rapier Physics

**Files:**
- Modify: `src/engine/SausageBody.ts` (407 lines, already has curve + skinned mesh)
- Modify: `src/ecs/orchestrators/StufferOrchestrator.tsx`
- Modify: `src/components/GameWorld.tsx`

POC implementation (sausage_factory.html lines 253-305):
- Each bone segment gets a Rapier `RigidBodyDesc.dynamic()` with `linearDamping: 8`, `angularDamping: 5`
- Each body gets `ColliderDesc.ball(0.15)` with `mass: 1`, `restitution: 0`
- Rigid bodies are anchored to target positions via spring-like interpolation
- On extrusion, anchor targets extend outward, dragging the physics bodies
- SkinnedMesh bones read positions from Rapier rigid bodies each frame
- Result: sausage links swing and drape realistically as they extrude

Port this to the existing `SausageBody.ts` + StufferOrchestrator:
- `SausageBody.ts` already has `SausageLinksCurve`, `pinchFactor`, `NUM_BONES = 12`
- Add Rapier rigid body creation per bone (web-only, plain mesh fallback on native)
- StufferOrchestrator's `useFrame` reads Rapier body positions → updates bone transforms
- Gravity + damping makes links swing naturally as they emerge from casing

**Tests:** Physics bodies created per bone (web), bone positions update from Rapier, native fallback works.

### Task 0f: Pan Flip Player Trigger

**Files:**
- Modify: `src/ecs/orchestrators/CookingOrchestrator.tsx`
- Modify: `src/ecs/archetypes/stoveArchetype.ts`

Currently `flipProgressRef` exists but nothing triggers it during active gameplay. Wire it:
- Add a button ECS input primitive to the stove archetype (e.g., pan handle mesh)
- Player clicks/taps pan handle → triggers flip animation
- Flip during target temp zone = flair bonus (call `recordFlairPoint('pan-flip', points)`)
- Flip outside zone = risky (resets hold timer progress by 0.5s)
- Mr. Sausage reaction: 'excitement' on successful flip, 'nervous' on risky flip
- Maximum 3 flips per cooking challenge

**Tests:** Flip triggers on tap, flair bonus when in zone, hold timer penalty outside zone.

---

## Wave 1: Store + Engine Foundation (Tasks 1-4)

These are pure data/logic tasks with no UI. All parallelizable.

### Task 1: Difficulty System Store + Config

**Files:**
- Create: `src/engine/DifficultyConfig.ts`
- Modify: `src/store/gameStore.ts`

Add `DifficultyConfig` interface and the 5 tier definitions (Rare through Well Done) as a const map.

```typescript
interface DifficultyConfig {
  name: string;
  color: string;
  hintsEnabled: boolean;
  hintCount: number;
  timePressure: number;
  permadeath: boolean;
  hiddenObjectLevel: 'none' | 'basic' | 'full' | 'extreme';
  cleanupRequired: boolean;
  assemblyRequired: boolean;
  maxStrikes: number;
}
```

Add store fields: `difficulty: DifficultyConfig`, `setDifficulty(config)`.
Add store field: `maxStrikes` (override from difficulty config).
Modify `addStrike()` to respect `maxStrikes` from difficulty (currently hardcoded to 3).
Modify `startNewGame()` to apply difficulty settings.

**Tests:** DifficultyConfig defaults, all 5 tiers have valid configs, setDifficulty updates store, addStrike respects maxStrikes per tier.

### Task 2: Round Management Store + Engine

**Files:**
- Create: `src/engine/RoundManager.ts`
- Modify: `src/store/gameStore.ts`

Add store fields:
- `currentRound: number` (starts at 1)
- `totalRounds: number` (computed from ingredient combos)
- `usedIngredientCombos: string[][]`

`RoundManager.ts` exports:
- `generateNextRound(usedCombos, ingredientPool)` — picks 3 ingredients not yet used together
- `isAllCombosExhausted(usedCombos, poolSize)` — C(n,3) check
- `getComboCount(poolSize)` — returns C(n,3)

Store actions:
- `startNextRound()` — increments round, generates new demands, regenerates fridge pool
- `recordCombo(ingredients)` — adds to usedIngredientCombos
- `checkWinCondition()` — returns true if all combos exhausted

**Tests:** Combo generation produces unique combos, exhaustion detection, round counter increments, demands regenerate per round.

### Task 3: Kitchen State Machine

**Files:**
- Create: `src/engine/KitchenAssembly.ts`
- Modify: `src/store/gameStore.ts`

Add `KitchenState` interface to store:

```typescript
interface KitchenState {
  cabinets: boolean[];     // open/closed per index
  drawers: boolean[];      // open/closed per index
  equipment: Record<string, 'stored' | 'found' | 'placed' | 'assembled'>;
  sinkRunning: boolean;
  stationCleanliness: Record<string, number>;
}
```

`KitchenAssembly.ts` exports:
- `getRequiredEquipment(difficulty)` — which pieces must be found
- `getEquipmentLocations(difficulty)` — random placement per difficulty
- `validateAssembly(state, station)` — check if station is ready
- `EQUIPMENT_PARTS` — catalog of all findable parts

Store actions: `openCabinet(i)`, `openDrawer(i)`, `findEquipment(id)`, `placeEquipment(id)`, `assembleEquipment(id)`, `resetKitchen()`.

**Tests:** Equipment placement randomization, assembly validation, difficulty-appropriate requirements.

### Task 4: Blowout Physics Engine

**Files:**
- Create: `src/engine/BlowoutPhysics.ts`

Pure physics simulation module:
- `simulateBlowout(blowForce, tubeContents)` — produces chunk trajectories
- `calculateBlowoutScore(chunks, cerealBoxBounds)` — coverage, distance, style, speed bonuses
- `BlowoutChunk` interface: position, velocity, color, size, stuck flag
- `BlowoutScore` interface: distance, coverage, style, speed, total

No store dependency — pure functions only.

**Tests:** Chunk trajectories respond to blow force, scoring rewards coverage, distance bonus calculation, speed bonus for fast blows.

---

## Wave 2: 3D Components — New Scene Elements (Tasks 5-9)

These create new visual/interactive components. Mostly parallelizable (some share store fields from Wave 1).

### Task 5: Difficulty Selector Modal

**Files:**
- Create: `src/components/ui/DifficultySelector.tsx`
- Modify: `src/components/ui/TitleScreen.tsx`

React Native modal with 3x2 grid of difficulty buttons:
- Top row: Rare (#ffb6c1), Medium Rare (#e8967a), Medium (#c97a5a)
- Bottom row: Medium Well (#8b5a3a), Well Done (#3d2b1f)
- Visual permadeath line between rows
- Each button uses scaled-down SausageButton colors (static, no animation)
- On select: writes difficulty to store, transitions to loading screen

Modify TitleScreen: NEW GAME → opens DifficultySelector instead of going straight to loading.

**Tests:** Renders 5 buttons, selecting sets difficulty in store, permadeath line visible, transitions correctly.

### Task 6: Cereal Box + Table Place Setting

**Files:**
- Create: `src/components/kitchen/CerealBox.tsx`
- Create: `src/components/kitchen/PlaceSetting.tsx`

`CerealBox.tsx`:
- `BoxGeometry(3, 5, 1.5)` with CanvasTexture per face
- Front face: procedural "Mr. Sausage's Own" cereal brand
- Stain layer: accumulated splatter (CanvasTexture, persists per session)
- Dynamic chunks: particle system for blowout landing

`PlaceSetting.tsx`:
- Tablecloth: PlaneGeometry with checkered CanvasTexture
- Plate, fork, knife: procedural or GLB meshes
- Glass: CylinderGeometry (transparent)
- Napkin: procedural folded mesh
- Positions relative to FurnitureLayout dining table

**Tests:** Components render, cereal box has 6 faces, place setting contains plate/fork/knife.

### Task 7: Tie Gesture Interaction

**Files:**
- Create: `src/components/kitchen/TieGesture.tsx`
- Modify: `src/store/gameStore.ts`

Two-finger pinch gesture on each end of the casing:
- Visual: casing constricts, knot mesh appears
- ~0.5s animation per tie with snap sound
- Must tie BOTH ends before detaching tube
- Flair bonus for fast ties via `recordFlairPoint('fast-tie', points)`

Store: `casingTied: boolean`, `tieEndA: boolean`, `tieEndB: boolean`.

**Tests:** Tying both ends sets casingTied, partial tie doesn't advance, flair bonus for speed.

### Task 8: Blowout Mechanics Component

**Files:**
- Create: `src/components/kitchen/BlowoutMechanics.tsx`
- Modify: `src/store/gameStore.ts`

The namesake mechanic:
1. Tube detaches from stuffer nozzle (pop animation)
2. Player holds tube, taps/holds to blow
3. Particle emission rate proportional to hold intensity
4. Chunks land on cereal box (uses CerealBox's dynamic stain layer)
5. Air pressure simulation: tube "deflates"
6. Score: coverage, distance, artistry, speed

Uses `BlowoutPhysics.ts` for trajectory + scoring.
Store: `blowoutScore: number`, `recordBlowoutScore(score)`.

Sequence: TieGesture → tube detach → BlowoutMechanics → cooking.

**Tests:** Tube renders, blow produces particles, scoring integrates with flair system.

### Task 9: Procedural Sink

**Files:**
- Create: `src/components/kitchen/ProceduralSink.tsx`

Replace static sink GLB with procedural chrome sink:
- Basin: LatheGeometry (chrome MeshPhysicalMaterial)
- Faucet: curved CylinderGeometry
- Hot/cold taps: CylinderGeometry with red/blue indicator rings
- Water stream: particle system on tap open
- Drain: dark circle at basin bottom

Interactions:
- Click tap → rotation animation → water on/off
- Items in sink → washing progress bar
- Grime overlay (CanvasTexture) fades during wash

**Tests:** Sink renders, tap toggle works, water particles spawn on tap open.

---

## Wave 3: Hidden Object + Assembly System (Tasks 10-12)

### Task 10: Interactive Cabinets and Drawers

**Files:**
- Create: `src/components/kitchen/CabinetDrawer.tsx`

Reusable component for kitchen storage:
- Cabinet: upper, hinged door open/close animation
- Drawer: lower, slide-out animation
- Click to open/close, reveals contents
- Contents determined by KitchenAssembly.ts placement
- At higher difficulties, red herrings (spice rack, extra knife)

Props: `type: 'cabinet' | 'drawer'`, `index: number`, `contents: EquipmentPart[]`.

**Tests:** Opens/closes on click, reveals contents, reads from kitchen state.

### Task 11: Equipment Assembly UI

**Files:**
- Create: `src/components/ui/HiddenObjectOverlay.tsx`
- Modify: `src/components/GameWorld.tsx`

2D overlay tracking found/missing equipment:
- Inventory bar showing found parts (icons)
- Station readiness indicators
- Assembly instructions when hovering a station
- Visual feedback: snap-to-place animation when assembling

GameWorld: conditionally render cabinets/drawers and assembly UI based on `difficulty.hiddenObjectLevel`.

**Tests:** Overlay shows correct part count, parts move from inventory to station, assembly validation.

### Task 12: Cleanup/Wash Mechanic

**Files:**
- Modify: `src/components/kitchen/ProceduralSink.tsx`
- Modify: `src/store/gameStore.ts`

Cleanup mechanic for Medium Rare+ difficulties:
- Equipment gets "dirty" after use (grime CanvasTexture)
- Must carry to sink, wash, optionally dry with towel
- Well Done: must wash, dry, AND put back in correct cabinet/drawer
- Store tracks `stationCleanliness` per station
- Block progression until cleanup complete (at required difficulty)

**Tests:** Dirty state after use, washing reduces grime, Well Done requires full return.

---

## Wave 4: Game Loop Integration (Tasks 13-15)

### Task 13: Multi-Round Flow

**Files:**
- Modify: `src/components/challenges/TastingChallenge.tsx`
- Modify: `src/components/GameWorld.tsx`
- Modify: `src/store/gameStore.ts`

After tasting verdict:
- If not all combos exhausted: "Mr. Sausage is never satisfied..."
- Transition to next round (new demands, new ingredients)
- Kitchen resets based on difficulty (cleanup if required)
- If permadeath + failed: instant game over, back to menu
- If all combos exhausted: trigger win sequence

Store: `startNextRound()` action resets challenge state but preserves round progress.

**Tests:** Round transitions, demands regenerate, permadeath enforcement.

### Task 14: Win Sequence

**Files:**
- Create: `src/components/ui/WinScreen.tsx`
- Modify: `src/components/GameWorld.tsx`

When all ingredient combos completed:
- Mr. Sausage: "You've... you've done it."
- Ceiling trap door swings open (hinge animation)
- Camera tilts up toward light
- Fade to white
- WIN SCREEN: "THE SAUSAGE KING ESCAPES"

This is the TRUE ending — escaping the kitchen.

**Tests:** Win screen renders, triggered by combo exhaustion, camera animation plays.

### Task 15: Pipeline Integration + State Machine Update

**Files:**
- Modify: `src/components/GameWorld.tsx`
- Modify: `src/store/gameStore.ts`

Wire the full Phase 2 pipeline:

```text
MENU → DIFFICULTY → LOADING → ROUND N:
  Fridge → Grinder → Stuffer → [TIE] → [WILL IT BLOW] → Cooking → Tasting
  → Next Round OR Win OR Game Over
```

Insert new stages between stuffing and cooking:
- Challenge 2.5: TieGesture (after stuffing, before blowout)
- Challenge 2.75: BlowoutMechanics (after tie, before cooking)

Update state machine: `gameStatus` gains new phases for tie/blowout.
Update `currentChallenge` to support the expanded sequence.
Conditional rendering: hidden objects, sink, cabinets based on difficulty.

**Tests:** Full flow transitions, difficulty gates work, round counter advances.

---

## Execution Order Summary

```text
Wave 0 (parallel): Tasks 0a, 0b, 0c, 0d, 0f  (0e depends on 0d)
Wave 0b:           Task 0e (after 0d — sausage physics needs stuffer changes)
Wave 1 (parallel): Tasks 1, 2, 3, 4
Wave 2 (parallel): Tasks 5, 6, 7, 8, 9
Wave 3 (parallel): Tasks 10, 11, 12
Wave 4 (sequential): Task 13 → 14 → 15
```

## Verification

After each wave:

```bash
pnpm test:ci          # All tests pass
pnpm lint             # Clean
pnpm typecheck        # No errors
```

After Wave 4: full playthrough verification in Chrome.

## Dependencies on Phase 1

These Phase 1 systems are used directly:
- `PlayerDecisions` interface + all recording actions
- `MrSausageDemands` + demand generation
- `recordFlairPoint()` system
- `blendColor` pipeline (fridge → grinder → stuffer → cooking)
- `TransferBowl` cross-station continuity
- `SausageLinksBody` + Rapier physics
- `CookingMechanics` heat system
- `HintDialogue` (hint count governed by difficulty)
- `GameWorld` scene orchestration
- `FurnitureLayout` positions
