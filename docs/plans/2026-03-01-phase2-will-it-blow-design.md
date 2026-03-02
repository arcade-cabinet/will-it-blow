<!--
title: Phase 2 Design — Will It Blow + Difficulty + Multi-Round
domain: game-design
status: draft
engine: r3f
last-verified: 2026-03-01
depends-on: [game-design, state-management, 3d-rendering]
agent-context: challenge-dev, scene-architect, store-warden
summary: Phase 2 game expansion — titular blowout mechanic, 5-tier difficulty, multi-round loop, hidden objects
-->

# Phase 2 Design: "Will It Blow?" — The Full Game

## Overview

Phase 1 built the single-run sausage pipeline: fridge → grinder → stuffer → cooking → tasting. Phase 2 transforms this into a full game with the titular "Will It Blow" mechanic, difficulty tiers, multi-round progression, and hidden object gameplay.

**Source inspiration:** [Ordinary Sausage](https://www.youtube.com/@OrdinarySausage) — after stuffing, he detaches the plastic tube from the stuffer and blows out whatever remains onto a cereal box. This is the game's namesake.

---

## 1. The "Will It Blow" Mechanic

### Concept

After stuffing, the game doesn't immediately proceed to cooking. Instead, a new sequence plays:

1. **Tie Gesture** — Player ties off both ends of the translucent casing using a swipe/pinch gesture
2. **Detach Tube** — Player grabs the plastic tube attached to the stuffer nozzle (it pops off)
3. **Mr. Sausage Demands** — "Well? WILL IT BLOW?" (CRT TV reaction: manic)
4. **Blow Interaction** — Player holds the tube to their face and taps/holds to blow
5. **Blowout** — Remaining ground meat/debris shoots out of the tube
6. **Landing** — Chunks land on a procedurally-stained cereal box on the dining table
7. **Scoring** — Blowout coverage, distance, and artistry contribute to flair bonus

### 3D Scene Elements

```text
TABLE (existing dining table position from FurnitureLayout)
├── Place Setting (GLB assets)
│   ├── Plate — white ceramic, centered
│   ├── Fork — left of plate
│   └── Knife — right of plate
├── Cereal Box — procedurally generated
│   ├── Box geometry (BoxGeometry, cereal-brand procedural texture)
│   ├── Existing stains (CanvasTexture with splatter patterns)
│   └── New blowout layer (dynamic: chunks land as player blows)
└── Napkin — optional garnish
```

### Cereal Box Procedural Generation

- `BoxGeometry(3, 5, 1.5)` with CanvasTexture per face
- Front face: procedural "Mr. Sausage's Own" cereal brand design
- Stain layer: accumulated splatter from previous rounds (saved per session)
- Dynamic chunks: particle system — ground meat + whatever was in the grinder (ingredient decomposition colors)
- Physics: chunks use small Rapier rigid bodies that stick on contact (coefficient of restitution = 0)

### Tube Physics

- Tube mesh: `CylinderGeometry` with translucent `MeshPhysicalMaterial` (transmission: 0.7)
- Interior visible contents: procedural fill mesh colored by `blendColor`
- Blow force: particle emission rate proportional to tap/hold intensity
- Air pressure simulation: tube "deflates" as contents eject
- Residual chunks: some stick inside (random, ingredient-colored)

### Tie Gesture

- Two-finger pinch on each end of the casing
- Visual: casing constricts, small knot mesh appears
- Animation: ~0.5s per tie, with satisfying snap sound
- Must tie BOTH ends before detaching tube
- Flair bonus for fast ties

### Flair Scoring (Blowout)

- **Distance bonus**: chunks that travel furthest from tube = more points
- **Coverage bonus**: how much of the cereal box surface area gets hit
- **Style bonus**: all chunks landing within the cereal box boundary (precision)
- **Speed bonus**: fast, confident blow vs. timid puffing
- Points feed into existing `recordFlairPoint()` system

---

## 2. Difficulty System — Sausage Doneness

### Selector UI

After clicking NEW GAME, a difficulty modal appears before the loading screen:

```text
╔══════════════════════════════════════════╗
║         CHOOSE YOUR DONENESS            ║
║                                         ║
║   ┌────────┐ ┌────────┐ ┌────────┐     ║
║   │  RARE  │ │MED RARE│ │ MEDIUM │     ║
║   │ #ffb6c1│ │ #e8967a│ │ #c97a5a│     ║
║   └────────┘ └────────┘ └────────┘     ║
║                                         ║
║       ┌────────┐ ┌────────┐             ║
║       │MED WELL│ │WELL DNE│             ║
║       │ #8b5a3a│ │ #3d2b1f│             ║
║       └────────┘ └────────┘             ║
║   ─ ─ ─ ─ PERMADEATH LINE ─ ─ ─ ─      ║
║                                         ║
║   Each button = scaled-down SausageButton║
║   Different shade = different doneness   ║
║   No animation, just static color       ║
╚══════════════════════════════════════════╝
```

### Difficulty Parameters

```typescript
interface DifficultyConfig {
  /** Display name */
  name: string;
  /** SausageButton tint color */
  color: string;
  /** Whether hints are available */
  hintsEnabled: boolean;
  /** Starting hint count (if enabled) */
  hintCount: number;
  /** Time pressure multiplier (1.0 = normal) */
  timePressure: number;
  /** Whether permadeath is enforced */
  permadeath: boolean;
  /** Hidden object complexity: 'none' | 'basic' | 'full' | 'extreme' */
  hiddenObjectLevel: 'none' | 'basic' | 'full' | 'extreme';
  /** Whether the sink/cleanup mechanic is active */
  cleanupRequired: boolean;
  /** Whether equipment must be found and assembled */
  assemblyRequired: boolean;
  /** Strike tolerance (3 = normal, 1 = permadeath) */
  maxStrikes: number;
}
```

| Parameter | Rare | Med Rare | Medium | Med Well | Well Done |
|-----------|------|----------|--------|----------|-----------|
| hints | 5 | 3 | 2 | 1 | 0 |
| timePressure | 0.5x | 0.75x | 1.0x | 1.5x | 2.5x |
| permadeath | No | No | No | Optional | Enforced |
| hiddenObject | none | none | basic | full | extreme |
| cleanup | No | Sink | Sink+basics | Everything | Full reset |
| assembly | No | No | Pan only | Grinder+stuffer | All equipment |
| maxStrikes | 5 | 3 | 3 | 2 | 1 |

### Store Integration

```typescript
// New store fields
difficulty: DifficultyConfig;
currentRound: number;
totalRounds: number;
usedIngredientCombos: string[][];  // track which combos have been made
```

---

## 3. Multi-Round Gameplay Loop

### Flow

```text
MENU → DIFFICULTY SELECT → LOADING → ROUND 1:
  Fridge → Grinder → Stuffer → [TIE] → [WILL IT BLOW] → Cooking → Tasting
  ↓
  "Mr. Sausage is never satisfied..."
  ↓
ROUND 2 (different ingredients, Mr. Sausage re-rolls demands):
  Fridge → ... → Tasting
  ↓
  ... repeat until all ingredient combos found ...
  ↓
FINAL WIN:
  Trap door in ceiling swings open
  Camera tilts up to see light streaming in
  Fade to white → WIN SCREEN
  "You are free."
```

### Round Mechanics

- Each round, Mr. Sausage re-generates demands (`generateDemands()`)
- Available ingredients rotate — can't reuse the same 3-ingredient combo
- Difficulty settings persist across rounds
- Player's skill theoretically improves with repetition
- At higher difficulties, kitchen resets between rounds (cleanup required)
- Permadeath means ONE failed round = game over, back to menu

### Win Condition

- Track `usedIngredientCombos` across rounds
- When the player has successfully completed rounds with ALL unique combos from the ingredient pool:
  - Mr. Sausage: "You've... you've done it. Every combination. Every permutation."
  - Trap door animation: ceiling panel swings down on hinge, light floods in
  - Player camera rises toward the opening
  - Fade to white
  - WIN SCREEN: "THE SAUSAGE KING ESCAPES"

### Combo Math

- 12 ingredients in pool, choose 3 = C(12,3) = 220 unique combos
- At ~2-3 min per round, full completion = ~8-11 hours
- This is intentionally marathon-length — the horror IS the grind
- Difficulty scaling makes later rounds harder

---

## 4. Hidden Object Mechanics

### Kitchen State Machine

At Medium+ difficulty, the kitchen starts in a "tidied" state:

```typescript
interface KitchenState {
  /** Cabinet doors: open/closed per cabinet index */
  cabinets: boolean[];
  /** Drawer states: open/closed per drawer index */
  drawers: boolean[];
  /** Equipment location: 'stored' | 'found' | 'placed' | 'assembled' */
  equipment: Record<string, EquipmentState>;
  /** Sink state */
  sinkRunning: boolean;
  /** Cleanup progress per station */
  stationCleanliness: Record<string, number>;
}
```

### Searchable Locations

```text
KITCHEN CABINETS (upper, procedural doors)
├── Cabinet 1: frying pan
├── Cabinet 2: grinder motor housing
├── Cabinet 3: stuffer crank handle
└── Cabinet 4: spice rack (red herring)

KITCHEN DRAWERS (lower, slide-out)
├── Drawer 1: grinder faceplate
├── Drawer 2: stuffer nozzle
├── Drawer 3: kitchen towel (for cleanup)
└── Drawer 4: knife (already on table, red herring)

WALL HOOKS
├── Hook 1: frying pan (alternative location)
├── Hook 2: oven mitt
└── Hook 3: apron (cosmetic)

UNDER COUNTER
├── Grinder base (heavy, requires drag)
└── Stuffer body (heavy, requires drag)
```

### Assembly Mechanic

Found parts must be carried to their station and assembled:
1. Find part (click in cabinet/drawer → goes to inventory)
2. Carry to station (GrabSystem: carry to station area)
3. Place (drop on station → snap to correct position)
4. Assemble (click to attach: bolt sound, visual snap)

At "extreme" difficulty, parts are scattered randomly among ALL locations.

---

## 5. Procedural Sink

### Design

Replace the static sink GLB with a procedural chrome sink:

```text
SINK (procedural geometry)
├── Basin — LatheGeometry (chrome material, reflective)
├── Faucet — curved CylinderGeometry (chrome)
├── Hot tap — CylinderGeometry (red indicator ring)
├── Cold tap — CylinderGeometry (blue indicator ring)
├── Water stream — particle system (when taps open)
└── Drain — dark circle at basin bottom
```

### Interaction

- Click tap → turns on/off (rotation animation)
- Water stream: vertical particle column, splash particles at basin bottom
- Items placed in sink → "washing" progress bar
- Dirty items: post-use equipment has a "grime" overlay (CanvasTexture)
- Clean items: grime fades over wash time

### When Required

- Medium Rare+: Mr. Sausage: "I like things nice and clean. Wash your hands."
- Medium: Must wash pan before cooking
- Medium Well+: Must wash ALL equipment after each stage
- Well Done: Must wash, dry (kitchen towel), and PUT BACK in correct storage location

---

## 6. Place Setting + Table Scene

### Table Layout

The dining table (already in FurnitureLayout) gets dressed:

```text
TABLE
├── Tablecloth — PlaneGeometry with checkered CanvasTexture
├── Plate — plate.glb (white ceramic)
├── Fork — fork.glb (left of plate)
├── Knife — knife.glb (right of plate)
├── Glass — procedural CylinderGeometry (transparent)
├── Napkin — procedural folded mesh
└── Cereal Box — procedural (see section 1)
```

GLB assets needed: plate, fork, knife (simple silverware — can be found in free GLB libraries or generated procedurally).

---

## Architecture Changes Summary

### New Store Fields

- `difficulty: DifficultyConfig`
- `currentRound: number`
- `totalRounds: number`
- `usedIngredientCombos: string[][]`
- `kitchenState: KitchenState` (hidden object tracking)
- `blowoutScore: number`
- `casingTied: boolean`

### New Components

- `DifficultySelector.tsx` — 3x2 grid modal with SausageButton variants
- `TieGesture.tsx` — casing tie-off interaction
- `BlowoutMechanics.tsx` — tube detach, blow, particle landing
- `CerealBox.tsx` — procedural cereal box with dynamic stain layer
- `PlaceSetting.tsx` — table arrangement with GLBs
- `ProceduralSink.tsx` — chrome sink with faucet taps and water
- `HiddenObjectOverlay.tsx` — UI for found/missing equipment tracking
- `CabinetDrawer.tsx` — interactive cabinet/drawer with open/close animation

### New Engine Modules

- `DifficultyConfig.ts` — difficulty tier definitions
- `RoundManager.ts` — multi-round progression logic
- `KitchenAssembly.ts` — equipment placement and assembly validation
- `BlowoutPhysics.ts` — tube blow simulation + particle landing

### Modified Files

- `gameStore.ts` — new state fields + round management actions
- `GameWorld.tsx` — conditional rendering based on difficulty (hidden objects, sink)
- `StufferMechanics.tsx` — tube detach + tie gesture hooks
- `TastingChallenge.tsx` — round completion → next round vs final win
- `LoadingScreen.tsx` — difficulty-specific loading messages
- `TitleScreen.tsx` — NEW GAME → difficulty select flow
