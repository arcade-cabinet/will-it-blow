<!--
title: Gameplay Elevation Implementation Plan
domain: plan
status: historical
engine: babylon
last-verified: 2026-03-01
depends-on: ["2026-02-26-gameplay-elevation-design.md"]
agent-context: scene-architect, challenge-dev
summary: Task-by-task implementation plan for physics mini-games, MrSausage3D character, Ingredient3D factory, and scene rewrites using Babylon.js.
-->

# Gameplay Elevation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform 5 tap-button-number-goes-up phases into distinct physics-driven mini-games with a full 3D Mr. Sausage host character.

**Architecture:** Each scene component (`src/components/scenes/*.tsx`) gets rewritten with physics interactions and a shared `MrSausage3D` component. UI overlays stay as-is for HUD/buttons but their button handlers will now also trigger 3D scene events via shared game state. The `Ingredient` type gets a new `shape` field for 3D representation.

**Tech Stack:** Babylon.js primitives (MeshBuilder), Babylon.js physics (HavokPlugin or cannon.js via @babylonjs/core), reactylon `useScene()`, React Native overlays unchanged.

---

### Task 1: Add `shape` field to Ingredient type and data

**Files:**
- Modify: `src/engine/Ingredients.ts`

**Step 1: Add shape type and field to Ingredient interface**

Add a `shape` field to the `Ingredient` interface that describes how to render the ingredient in 3D. Each shape is a simple descriptor: a base primitive + optional detail.

```typescript
// Add after the existing Ingredient interface (line 1-18)
export type IngredientShape =
  | { base: "sphere"; detail?: "wobbly" }      // water, gummy bears
  | { base: "box"; detail?: "rounded" }         // bread, hot pocket
  | { base: "cylinder"; detail?: "flat" }       // pizza, corn dog
  | { base: "elongated"; detail?: "claws" }     // lobster
  | { base: "wedge" }                           // cheese
  | { base: "cone" }                            // ice cream, candy cane
  | { base: "small-sphere" }                    // jawbreaker, menthol
  | { base: "irregular" };                      // shoe, dirt, glue
```

Add `shape: IngredientShape` to the `Ingredient` interface.

**Step 2: Add shape to every ingredient in INGREDIENTS array**

Add the `shape` field to each of the 26 ingredients. Examples:
- Big Mac: `{ base: "box", detail: "rounded" }`
- SpaghettiOs: `{ base: "sphere", detail: "wobbly" }`
- Lobster: `{ base: "elongated", detail: "claws" }`
- Water: `{ base: "sphere", detail: "wobbly" }`
- Air: `{ base: "sphere" }`
- Pizza: `{ base: "cylinder", detail: "flat" }`
- Dirt: `{ base: "irregular" }`
- A Shoe: `{ base: "irregular" }`

Use judgment for each — the shape drives which Babylon primitive is created.

**Step 3: Commit**

```bash
git add src/engine/Ingredients.ts
git commit -m "feat: add 3D shape descriptors to ingredient data"
```

---

### Task 2: Create MrSausage3D character component

**Files:**
- Create: `src/components/characters/MrSausage3D.tsx`
- Create: `src/components/characters/reactions.ts`

**Step 1: Define reaction types and animation data**

Create `src/components/characters/reactions.ts`:

```typescript
export type Reaction =
  | "idle"
  | "flinch"
  | "laugh"
  | "disgust"
  | "excitement"
  | "nervous"
  | "nod"
  | "talk";

export interface ReactionTargets {
  bodyY?: number;         // vertical offset
  bodyRotZ?: number;      // lean angle
  headRotX?: number;      // nod angle
  armLRotZ?: number;      // left arm raise
  armRRotZ?: number;      // right arm raise
  shakeIntensity?: number; // body shake magnitude
  duration: number;        // ms for the full animation
  loop?: boolean;
}

export const REACTIONS: Record<Reaction, ReactionTargets> = {
  idle: {
    duration: 2000,
    loop: true,
    // Uses sin wave bob — handled specially in component
  },
  flinch: {
    bodyRotZ: -0.2,
    armLRotZ: -0.8,
    armRRotZ: 0.8,
    duration: 400,
  },
  laugh: {
    shakeIntensity: 0.15,
    bodyY: 0.2,
    duration: 800,
    loop: true,
  },
  disgust: {
    bodyRotZ: 0.15,
    headRotX: -0.3,
    duration: 600,
  },
  excitement: {
    bodyY: 0.5,
    armLRotZ: -1.2,
    armRRotZ: 1.2,
    duration: 500,
  },
  nervous: {
    bodyRotZ: 0.05,
    shakeIntensity: 0.03,
    duration: 1000,
    loop: true,
  },
  nod: {
    headRotX: 0.3,
    duration: 300,
  },
  talk: {
    shakeIntensity: 0.02,
    duration: 400,
    loop: true,
  },
};
```

**Step 2: Create the MrSausage3D component**

Create `src/components/characters/MrSausage3D.tsx`. This is the core character — a single React component using `useScene()` + imperative Babylon.js mesh creation in a `useEffect`.

Build the character from these primitives (all parented to a root `TransformNode`):

**Body group:**
- Torso: `CreateSphere` scaled to egg shape (scaleX=1, scaleY=1.4, scaleZ=1) — tan/peach color `Color3(0.85, 0.55, 0.35)`
- Mustard stripe: `CreateCylinder` (thin, height matching body, yellow emissive) rotated to run vertically — `Color3(1, 0.85, 0)`
- Left leg: `CreateCapsule` (short, positioned below body) — same body color
- Right leg: `CreateCapsule` (short, offset) — same body color

**Head group (TransformNode parented to body):**
- Head sphere: `CreateSphere` diameter ~1.2, positioned above torso — same body color
- Sunglasses: 2x `CreateSphere` (dark, diameter 0.5) + bridge `CreateBox` + 2 arm `CreateBox` — `Color3(0.08, 0.08, 0.08)` with specular
- Mustache: `CreateBox` (wide) + 2x `CreateSphere` curls — `Color3(0.3, 0.15, 0.05)`
- Chin: `CreateSphere` (small) + 2x `CreateSphere` chin balls below — same body color
- Chef hat: brim `CreateCylinder` + body `CreateCylinder` + puff `CreateSphere` — white `Color3(0.95, 0.95, 0.95)`

**Arms:**
- Left arm: `CreateCapsule` + hand `CreateSphere` — same body color
- Right arm: `CreateCapsule` + hand `CreateSphere`

**Animation system:**
- Use `scene.onBeforeRenderObservable` in the useEffect
- Track `time` accumulator from `getDeltaTime()`
- For `idle`: sinusoidal bob on body Y, mustache wiggle on Z rotation
- For other reactions: lerp transforms toward `REACTIONS[reaction]` targets, then back to idle
- Accept `reaction` as a prop — when it changes, start the reaction animation, return to idle when done

**Props interface:**
```typescript
interface MrSausage3DProps {
  reaction?: Reaction;
  position?: [number, number, number];
  scale?: number;
}
```

**Cleanup:** Dispose ALL meshes, materials, and observer in the useEffect return.

**Step 3: Commit**

```bash
git add src/components/characters/
git commit -m "feat: add MrSausage3D character with reaction animations"
```

---

### Task 3: Create Ingredient3D physics factory component

**Files:**
- Create: `src/components/ingredients/Ingredient3D.tsx`

**Step 1: Create the component**

A component that takes an `Ingredient` and creates a 3D physics-enabled mesh:

```typescript
interface Ingredient3DProps {
  ingredient: Ingredient;
  position: [number, number, number];
  id: string; // unique mesh name
}
```

**Implementation:**
- Use `useScene()` to get the scene
- In `useEffect`, create a mesh based on `ingredient.shape.base`:
  - `"sphere"` → `MeshBuilder.CreateSphere` (if `detail: "wobbly"`, add vertex displacement)
  - `"box"` → `MeshBuilder.CreateBox` (if `detail: "rounded"`, use higher tessellation)
  - `"cylinder"` → `MeshBuilder.CreateCylinder` (if `detail: "flat"`, reduce height)
  - `"elongated"` → `MeshBuilder.CreateCylinder` with length 2x width (if `detail: "claws"`, add 2 small sphere claws)
  - `"wedge"` → `MeshBuilder.CreateCylinder` with `diameterTop: 0` (cone shape, flattened)
  - `"cone"` → `MeshBuilder.CreateCylinder` + `CreateSphere` on top
  - `"small-sphere"` → `MeshBuilder.CreateSphere` at 60% normal size
  - `"irregular"` → `MeshBuilder.CreateBox` with random-ish scaling
- Apply material with `ingredient.color` parsed via `hexToColor3`
- Set position from props
- Add physics impostor: `PhysicsImpostor` with `SphereImpostor` or `BoxImpostor`, mass=1, restitution=0.4, friction=0.6
- Mesh name uses the `id` prop for uniqueness

**Dispose** all meshes + materials + impostor on cleanup.

**Step 2: Commit**

```bash
git add src/components/ingredients/Ingredient3D.tsx
git commit -m "feat: add Ingredient3D physics factory component"
```

---

### Task 4: Rewrite GrinderScene — "Feed the Beast"

**Files:**
- Modify: `src/components/scenes/GrinderScene.tsx`
- Modify: `src/components/ui/GrindOverlay.tsx` (minor: remove the tap-to-grind button, simplify to progress display + SFX)

**Step 1: Rewrite GrinderScene**

Replace the entire file. New scene layout:

**Meshes:**
- Grinder body: `CreateBox` (large, metallic gray) at center
- Hopper funnel: `CreateCylinder` (truncated cone, `diameterTop: 3, diameterBottom: 1, height: 2`) — semi-transparent, above grinder body
- Blade: `CreateBox` (red, thin) inside hopper — spins continuously
- Output bowl: `CreateSphere` (half-sphere, below grinder) using `slice: 0.5`
- Ground meat accumulation: `CreateSphere` in bowl that scales up with `grindProgress`

**Ingredient physics objects:**
- Create 3 `Ingredient3D`-style meshes (inline, not as sub-components since we need direct physics control) positioned on a shelf to the left
- Each has `PhysicsImpostor` with mass based on ingredient properties

**Hopper collider:**
- Invisible cylinder collider at hopper opening — when an ingredient mesh intersects it (detected via `mesh.intersectsMesh`), trigger the grind:
  - Dispose the ingredient mesh
  - Emit particle burst from grinder
  - Increase `grindProgress` by ~33% (100/3 since 3 ingredients)
  - Shake the hopper
  - Play grinder sound

**Drag interaction:**
- `scene.onPointerDown` → pick mesh under pointer via `scene.pick()`
- If it's an ingredient mesh, start tracking pointer delta
- `scene.onPointerMove` → apply position delta to picked mesh (or apply force via `applyImpulse`)
- `scene.onPointerUp` → release. If pointer was moving fast, the ingredient gets flung (velocity at release → impulse)

**MrSausage3D:**
- Positioned to the right of the grinder, `position={[4, 0, 0]}`
- Starts with `reaction="idle"`
- On ingredient enter hopper → briefly `"flinch"` then back to `"idle"`
- On all ingredients ground → `"excitement"`

**Particle system:** Same meat chunks as current, but emit on each ingredient grind event.

**Step 2: Simplify GrindOverlay**

The overlay no longer needs the big tap button since interaction happens in 3D. Simplify to:
- Keep the grinder turn-on sub-phase (it's fun show-accurate flavor)
- After turn-on, show only: instruction text, progress bar, SFX text
- Remove the large circular grind button and its rotation animation
- The `handleGrind` function and `clicks` state are no longer needed
- Progress is now driven by 3D hopper collision, not button taps

**Step 3: Commit**

```bash
git add src/components/scenes/GrinderScene.tsx src/components/ui/GrindOverlay.tsx
git commit -m "feat: rewrite grind phase as drag-fling physics mini-game"
```

---

### Task 5: Rewrite StufferScene — "Squeeze It In"

**Files:**
- Modify: `src/components/scenes/StufferScene.tsx`
- Modify: `src/components/ui/StuffOverlay.tsx` (minor: remove stuff button, keep progress bar + countdown)

**Step 1: Rewrite StufferScene**

New scene layout:

**Meshes:**
- Stuffer body: `CreateBox` (metallic, horizontal) at center
- Plunger: `CreateCylinder` (slides left-right inside stuffer) — its X position is driven by pointer drag
- Casing: `CreateCylinder` extending from stuffer end, semi-transparent pink
  - Vertex deformation: Use `mesh.getVerticesData(VertexBuffer.PositionKind)` and `mesh.updateVerticesData()` to bulge the casing dynamically based on fill progress
  - Alternative simpler approach: scale Y + add random small spheres inside to simulate lumps
- Knot spheres at ends (appear when full)
- Ground meat color inside casing: use ingredient colors for the casing's `diffuseColor` blended

**Drag mechanic:**
- `scene.onPointerDown` on the plunger mesh → start drag tracking
- `scene.onPointerMove` → move plunger along X axis (clamped to stuffer range)
- Each drag increment increases `stuffProgress` proportionally
- Drag speed affects casing behavior:
  - Fast drag → casing wobbles red (emissive flash), threatens tear
  - Slow drag → casing fills smoothly
- `scene.onPointerUp` → stop drag

**Casing visual:**
- Scale increases with `stuffProgress` (existing pattern works, enhanced with vertex wobble)
- At 100%: tie-off animation (knot spheres pop in)

**MrSausage3D:**
- Position right of stuffer
- `idle` → `nervous` when casing gets close to tearing → `nod` on successful fill

**Step 2: Simplify StuffOverlay**

- Keep countdown sub-phase (it's the "3-2-1 LET'S SAUSAGE!" moment — show-accurate)
- After countdown, show only: instruction text, progress bar, SFX text
- Remove the STUFF! button — interaction is now 3D plunger drag
- Keep the casing visual in the overlay as a secondary HUD indicator (optional, could remove since 3D casing is visible)

**Step 3: Commit**

```bash
git add src/components/scenes/StufferScene.tsx src/components/ui/StuffOverlay.tsx
git commit -m "feat: rewrite stuff phase as plunger-drag physics mini-game"
```

---

### Task 6: Rewrite BlowScene — "Will It Blow?"

**Files:**
- Modify: `src/components/scenes/BlowScene.tsx`

**Step 1: Rewrite BlowScene**

The UI overlay (`BlowOverlay.tsx`) already has good hold-to-blow mechanics. The 3D scene needs to match with proper physics splatter.

**Meshes:**
- Stuffer tube: `CreateCylinder` (horizontal, facing camera) at center
- Tube opening: `CreateTorus` (ring around tube end) — glows brighter as pressure builds
- Back wall: `CreatePlane` (large, dark) — splatter target
- Tube body shake: In render loop, vibrate tube position based on `holdPower` from game state

**Physics splatter on release:**
- When `ruffalos` transitions from 0 to positive (existing `useEffect` pattern):
  - Create N small spheres (N = ruffalos * 15 + 5) as rigid bodies
  - Each with `PhysicsImpostor`, mass=0.1
  - Apply impulse in the +Z direction (toward wall) with random spread
  - Colors from `ingredients[].color`
  - On wall collision (intersect check): freeze the sphere in place (set mass to 0), creating persistent splatter
  - Slow spheres with gravity drip down the wall

**MrSausage3D:**
- Position off to the side
- `nervous` during pressure build
- `laugh` on big splatter (ruffalos >= 3)
- `nod` on medium (1-2)
- `idle` on nothing

**Step 2: Commit**

```bash
git add src/components/scenes/BlowScene.tsx
git commit -m "feat: rewrite blow phase with physics splatter"
```

---

### Task 7: Rewrite CookScene — "Here We Go!"

**Files:**
- Modify: `src/components/scenes/CookScene.tsx`

**Step 1: Rewrite CookScene**

Keep existing progressive color change and spark system (it's good), add:

**New meshes:**
- Pan handle: extend existing handle mesh
- Stove burner glow: `CreateDisc` below pan with orange emissive that pulses

**Sausage physics:**
- Make sausage a physics body (mass=1) sitting in pan (pan has mass=0 static)
- Player tap → `applyImpulse` upward to flip the sausage (it tumbles and lands back)
- Player drag → roll the sausage around in the pan

**Burst explosion:**
- When `hasBurst` becomes true:
  - Existing pulsing/jitter behavior (keep it)
  - After a beat (500ms), EXPLODE: dispose the sausage mesh, create 20+ small sphere chunks as physics bodies launching outward
  - Chunks are ingredient-colored
  - Grease splatter particles (existing spark system, but more intense)
  - Mr. Sausage `"flinch"` → `"excitement"`

**No-burst:**
- Sausage gets char marks: darken stripe bands on the cylinder (create thin dark `CreateCylinder` rings at intervals that fade in)
- Mr. Sausage `"nod"` at completion

**MrSausage3D:**
- Position beside the stove
- `nervous` during cooking
- Reactions as described above on burst/no-burst

**Step 2: Commit**

```bash
git add src/components/scenes/CookScene.tsx
git commit -m "feat: rewrite cook phase with flippable sausage and physics burst"
```

---

### Task 8: Rewrite TasteScene — "The Verdict"

**Files:**
- Modify: `src/components/scenes/TasteScene.tsx`

**Step 1: Rewrite TasteScene**

Keep existing cut-apart animation (it works well), add:

**Enhanced cross-section:**
- Instead of a single color disc, create a swirl pattern: multiple small colored discs at the cut face, one per ingredient, randomly positioned within the circle radius

**Mr. Sausage bite sequence:**
- When `sausageRating` goes > 0 (cut triggered):
  1. Cut animation (existing: halves slide apart) — 500ms
  2. Mr. Sausage reaches toward the sausage: `"talk"` reaction
  3. After 800ms, Mr. Sausage reacts based on rating:
     - 0-1: `"disgust"`
     - 2-3: `"nod"` (meh)
     - 4-5: `"excitement"`

**Plate enhancement:**
- Add a bun mesh: two half-cylinders (bun halves) flanking the sausage position
- Subtle condiment drizzle: thin yellow/red cylinders as mustard/ketchup lines

**MrSausage3D:**
- Position behind the plate, centered
- Drives the reaction sequence above

**Step 2: Commit**

```bash
git add src/components/scenes/TasteScene.tsx
git commit -m "feat: rewrite taste phase with Mr. Sausage bite reactions"
```

---

### Task 9: Rewrite TitleScene — Use MrSausage3D component

**Files:**
- Modify: `src/components/scenes/TitleScene.tsx`

**Step 1: Replace inline mascot with MrSausage3D**

The current TitleScene has ~200 lines of inline mesh creation that duplicate what MrSausage3D now provides. Replace with:

- Import and use `MrSausage3D` component (or call it imperatively from useEffect since scenes use `useScene()`)
- Since MrSausage3D is itself an imperative `useEffect` component, the TitleScene can simply:
  - Keep the spotlight
  - Remove all inline body/hat/sunglasses/mustache creation (lines 20-165)
  - Add a render of MrSausage3D with `reaction="idle"` at center, larger `scale`
  - Or: if MrSausage3D returns null (imperative pattern), just mount it as a sibling

**Key consideration:** The TitleScene currently uses `useScene()` and creates meshes imperatively. MrSausage3D does the same. Both patterns are compatible — they both run `useEffect` with the same scene reference.

**Step 2: Commit**

```bash
git add src/components/scenes/TitleScene.tsx
git commit -m "refactor: use shared MrSausage3D in title scene"
```

---

### Task 10: Enable Babylon.js physics engine

**Files:**
- Modify: `src/components/GameWorld.web.tsx`
- Modify: `src/components/GameWorld.native.tsx`

**Step 1: Add physics plugin initialization in onSceneReady**

In both GameWorld files, add physics initialization to the `onSceneReady` function:

```typescript
import { HavokPlugin } from "@babylonjs/core";
// If Havok isn't available, fall back to:
// import { CannonJSPlugin } from "@babylonjs/core";

const onSceneReady = async (scene: any) => {
  // ... existing lighting/camera setup ...

  // Enable physics
  const havok = await HavokPhysics();
  scene.enablePhysics(new Vector3(0, -9.81, 0), new HavokPlugin(true, havok));
};
```

**Note:** If HavokPhysics WASM doesn't work well with Metro/Expo, fall back to cannon.js:
```typescript
import * as CANNON from "cannon";
window.CANNON = CANNON;
scene.enablePhysics(new Vector3(0, -9.81, 0), new CannonJSPlugin());
```

This may require: `pnpm add cannon --legacy-peer-deps`

**Step 2: Commit**

```bash
git add src/components/GameWorld.web.tsx src/components/GameWorld.native.tsx
git commit -m "feat: enable physics engine in both GameWorld platforms"
```

---

### Task 11: Verify web build

**Step 1: Run the dev server**

```bash
npx expo start --web --port 8090
```

**Step 2: Manual verification checklist**

- [ ] Title screen loads with MrSausage3D character (not old inline meshes)
- [ ] Ingredient selection works
- [ ] Grind: Can drag/fling ingredients into hopper
- [ ] Stuff: Can drag plunger, casing fills
- [ ] Blow: Hold-release splatter with physics chunks on wall
- [ ] Cook: Sausage sizzles, can tap to flip, burst/no-burst works
- [ ] Taste: Cut reveals cross-section, Mr. Sausage reacts
- [ ] Mr. Sausage visible and reacting in every scene
- [ ] Audio still works (web)

**Step 3: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues found during web verification"
```

---

## Dependency Graph

```
Task 1 (Ingredient shapes)  ─┐
Task 2 (MrSausage3D)        ─┼─→ Task 4 (Grind)  ─┐
Task 3 (Ingredient3D)       ─┘    Task 5 (Stuff)   │
                                   Task 6 (Blow)    ├─→ Task 10 (Physics) → Task 11 (Verify)
                                   Task 7 (Cook)    │
                                   Task 8 (Taste)   │
                                   Task 9 (Title)  ─┘
```

Tasks 1, 2, 3 are prerequisites. Tasks 4-9 can be done in any order after those. Task 10-11 are final integration.
