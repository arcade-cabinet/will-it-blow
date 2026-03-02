<!--
title: Sausage Factory Kitchen — Game Completion Design
domain: game-design
status: active
engine: r3f
last-verified: 2026-03-01
depends-on: [architecture, game-design, 3d-rendering, state-management]
agent-context: scene-architect, challenge-dev, asset-pipeline, store-warden
summary: Complete game system design — title screen, loading screen, procedural factory mechanics layered on GLB furniture, creative direction for horror basement kitchen
-->

# Sausage Factory Kitchen — Game Completion Design

## 1. Vision

Transform the prototype kitchen into a complete, shippable horror sausage-making game. The player is trapped in a basement prison kitchen, forced to make sausages for the sinister Mr. Sausage (the animated face on the CRT television). Five stations, one chance — score S-rank (≥92) or you become the sausage.

### Design Principles

1. **GLB for objects, procedural for mechanics** — Real furniture models for visual richness; procedural geometry only for physics interactions (sausage body, grease simulation, casing deformation)
2. **Replace bloat, keep character** — The 43MB of overweight furniture GLBs get swapped for tiny Quaternius/Styloo alternatives (2-30KB each). Small characterful props stay.
3. **Mr. Sausage IS the CRT screen** — No character model needed. The animated circular face behind the TV glass is the antagonist's physical presence.
4. **Depth through props** — A basement kitchen tells its story through details: bear traps, suspicious jars, fly swatters, cryptic post-it notes, worms in the food.

## 2. Asset Strategy

### 2.1 GLBs to REMOVE (43MB savings)

These bloated furniture GLBs get replaced with tiny Quaternius/Styloo alternatives from `/Volumes/home/assets/kitchen/`:

| Current GLB | Size | Replacement | New Size |
|-------------|------|-------------|----------|
| l_counter.glb | 9.1MB | workplan.glb + workplan_001/002/003.glb | 47KB |
| oven_range.glb | 7.1MB | kitchen_oven_large.glb | 7KB |
| upper_cabinets.glb | 5.2MB | kitchen_cabinet1.glb + kitchen_cabinet2.glb | 8KB |
| utensil_hooks.glb | 4.2MB | poseustensils.glb | 7KB |
| island.glb | 4.1MB | bartable.glb (or procedural counter) | 4KB |
| dishwasher.glb | 4.1MB | whashing_machine.glb | 14KB |
| trash_can.glb | 4.0MB | trashcan_cylindric.glb | 3KB |
| table_chairs.glb | 2.2MB | table.glb + chair1/2.glb | 76KB |
| spice_rack.glb | 2.1MB | shelf_small1.glb + jar bottles | 10KB |
| sausage.glb | 1.1MB | Procedural SkinnedMesh | 0KB |
| funny_sausage.glb | 1.1MB | Not needed | 0KB |

**Before:** ~45MB of GLBs → **After:** ~700KB total (including kept models)

### 2.2 GLBs to KEEP

These are lightweight and valuable:

| GLB | Size | Why Keep |
|-----|------|----------|
| fridge.glb | 120KB | Animated door open/close |
| meat_grinder.glb | 168KB | Animated crank, core station |
| mixing_bowl.glb | 40KB | Physics interaction target |
| frying_pan.glb | 32KB | Cooking station centerpiece |
| cutting_board.glb | 8KB | Ingredient prep surface |
| trap_door.glb | 8KB | Ceiling escape panel |
| All cutlery/small props | ~200KB | Atmospheric scatter (<30KB each) |

### 2.3 NEW GLBs from Asset Library

Copy from `/Volumes/home/assets/kitchen/` into `public/models/`:

**Horror Props** (in-game placement):
- `worm.glb` — found crawling near food
- `blobfish.glb` — in a jar on the shelf
- `piranha.glb` — in the fish tank / jar
- `anglerfish.glb` — hanging from a hook
- `beartrap_open.glb` — near the door (escape warning)
- `tapetteamouche.glb` — fly swatter on counter
- `can_broken.glb`, `can_open.glb` — debris scatter
- `match_burnt.glb`, `matchbox.glb` — near stove
- `bandages.glb` — bloody bandages on counter
- `postit.glb` — cryptic notes on fridge
- `fridgeletter.glb` — fridge magnets spelling threats

**Food for Fridge** (ingredient selection):
- All 51 food GLBs available, ~15 used per game (randomly selected)
- Mix of normal food (steak, eggs, vegetables) and horror items (tentacle, fishbone, worm)
- Scoring: correct ingredients = meat/spices, wrong = garbage/bugs

**Replacement Furniture:**
- `kitchen_oven_large.glb` — replaces oven_range.glb
- `kitchen_cabinet1.glb`, `kitchen_cabinet2.glb` — replaces upper_cabinets.glb
- `kitchen_fridge.glb` — alternative fridge (if existing fridge.glb animation proves problematic)
- `workplan_*.glb` — counter surfaces
- `shelf_*.glb` — wall shelving
- `trashcan_cylindric.glb` — replaces trash_can.glb

## 3. Title Screen

### Current State
Text-only `TouchableOpacity` buttons with CSS styling. Butcher shop sign header with chain animations.

### Design

Replace text buttons with the 6 sausage character PNG sprites from `public/ui/`:

```text
btn_newgame_normal.png  /  btn_newgame_hover.png
btn_load_normal.png     /  btn_load_hover.png
btn_quit_normal.png     /  btn_quit_hover.png
```

Each button is a `<Image>` with `onPressIn`/`onPressOut` swapping normal↔hover variants. The sausage characters' eyes change expression on hover.

**Settings button:** No PNG exists. Create a 4th button matching the sausage character style using a `<View>` composite: sausage body shape with gear icon eyes, rendered with React Native drawing (no SVG dependency). Alternatively, use a text-styled button that matches the aesthetic but doesn't require a custom PNG.

**Layout:**
```text
┌──────────────────────────┐
│   🔗 WILL IT BLOW? 🔗   │  ← Keep butcher sign + chains
│   ⛓️  (swing anim)  ⛓️   │
│                          │
│   [🌭 NEW GAME  🌭]     │  ← PNG sprite button
│   [🌭  CONTINUE 🌭]     │  ← PNG sprite button
│   [🌭 SETTINGS  🌭]     │  ← Composite or text button
│   [🌭   QUIT    🌭]     │  ← PNG sprite button
│                          │
│   v1.5.0                 │
└──────────────────────────┘
```

**Keep:** Swing animation, fade-in sequence, butcher sign header, version badge.
**Remove:** Text `TouchableOpacity` buttons, `MENU_ITEMS` array.
**Add:** `<Image source={require('public/ui/btn_*.png')}>`-style buttons with hover state swap.

## 4. Loading Screen

### Current State
Downloads `kitchen.glb` (was the single large combined file) + 18 textures. Shows CSS sausage-shaped progress bar and cycling Mr. Sausage quotes.

### Design

With the GLB replacement strategy, total asset size drops from ~47MB to ~2MB. The loading screen may barely be visible on fast connections. Two options:

**Option A: Minimal Loading (Recommended)**
- Keep the progress bar and Mr. Sausage quotes
- Replace the sausage-shaped CSS bar with a procedural sausage animation: a `<Canvas>` showing the SkinnedMesh sausage body being "built" — bones appear one by one, skin wraps around them, color fills in
- This serves as foreshadowing for the grinding→stuffing→cooking pipeline
- Duration: natural asset load time (likely <2 seconds with new tiny GLBs)

**Option B: Enforced Minimum Duration**
- Add a 3-5 second minimum display time
- Show a more elaborate procedural sausage factory animation
- Risk: feels sluggish when assets are cached

**Recommendation:** Option A. The loading screen becomes a brief flash of atmosphere rather than a loading gate. On slow connections or first load, the procedural sausage animation provides entertainment. On subsequent loads, it's barely visible.

### Asset Loading Changes

```typescript
// OLD: One giant kitchen.glb + textures
const CRITICAL_ASSETS = ['kitchen.glb'];
const TEXTURE_SETS = [...18 textures...];

// NEW: Many tiny GLBs loaded in parallel
const FURNITURE_GLBS = [
  'kitchen_oven_large.glb', 'kitchen_cabinet1.glb', ...
]; // ~48 files, ~700KB total
const FOOD_GLBS = [...15 random food items...]; // ~100KB
const PROP_GLBS = [...10 horror props...]; // ~80KB
const TEXTURE_SETS = [...]; // Same PBR textures, keep
```

`useGLTF.preload()` handles parallel loading. Total: ~1MB vs previous ~47MB.

## 5. Kitchen Environment — Creative Direction

### 5.1 The Basement Prison Kitchen

This isn't a restaurant kitchen — it's a **basement prison**. The player woke up here. The door is locked. Mr. Sausage's face flickers on the CRT. "Make me a sausage. A PERFECT sausage. Or else."

**Atmosphere layers:**

1. **Structural** — Concrete walls (lower), tile backsplash (upper), exposed pipes on ceiling, single barred window (high up, too small to escape), locked metal door with bear trap in front
2. **Lighting** — Flickering fluorescent tubes (existing), red emergency light in corner, under-counter glow, CRT screen glow casting shadows
3. **Grime** — Existing grime decals stay. Add more: bloodstains near grinder, grease splatter near stove, water stains from leaky pipe
4. **Sound** — Ambient dripping water, fridge hum, distant muffled screams (from `kitchen/sounds/`), flickering light buzz
5. **Props** — Scattered horror items tell a story: bear trap near door, bloody bandages on counter, cryptic post-it notes ("RULE #4: NEVER LOOK IN THE JAR"), fly swatter with suspicious stains, burnt matches

### 5.2 Room Layout

Expand from current 13×13 to **18×16** for more gameplay space. The extra room allows proper station separation and atmospheric dead zones (creepy corners the player must walk through).

```text
         18 units wide
    ┌────────────────────────────────┐
    │ PIPES  PIPES  PIPES  PIPES    │ ← ceiling pipes
    │                                │
    │  ┌FRIDGE┐  ┌STOVE┐  ┌SINK┐   │ ← left wall: stations
    │  │ (0)  │  │ (3) │  │    │   │
    │  └──────┘  └─────┘  └────┘   │
    │  ┌──COUNTER───────────────┐   │
    │  │ grinder(1)   cutting   │   │  16
    │  └────────────────────────┘   │  units
    │                                │  deep
    │     ┌──ISLAND──┐              │
    │     │ stuffer(2)│  ┌TABLE┐   │
    │     └──────────┘  │chair │   │
    │                    └─────┘   │
    │  ┌CRT─TV┐                    │
    │  │  (4)  │    ☠ BEAR TRAP    │
    │  └──────┘     🚪 DOOR        │
    └────────────────────────────────┘
```

**Key positions:**
- **Left wall** — Fridge, stove, counter with grinder (stations 0, 3, 1)
- **Center** — Island with stuffer (station 2)
- **Back wall** — CRT TV with Mr. Sausage (station 4), table with chair
- **Right wall** — Door (locked, bear trap warning), shelving, window (barred)
- **Ceiling** — Trap door (existing), exposed pipes, flickering lights

### 5.3 Procedural Room Surfaces

Keep the existing `KitchenEnvironment.tsx` pattern (plane meshes with PBR textures) but expand:

```typescript
// Room dimensions
const ROOM: RoomDimensions = { w: 18, d: 16, h: 5.5 };

// New surface elements (procedural, not GLB)
// - Exposed pipe runs on ceiling (CylinderGeometry)
// - Barred window (BoxGeometry bars + PlaneGeometry glass)
// - Metal door (BoxGeometry with lock detail)
// - Drain grate in floor (PlaneGeometry with alpha cutout)
// - Stain decals (PlaneGeometry with alpha, like existing grime)
```

## 6. Station Mechanics — Procedural Factory System

The sausage_factory.html POC proves all factory physics. Each station keeps its GLB furniture but adds procedural interactive elements ON TOP.

### 6.1 Station 0: Fridge — Ingredient Selection

**GLB:** Keep `fridge.glb` (120KB, animated door open/close)
**Procedural additions:**
- Fridge interior: 3 shelves + 2 pull-out drawers (BoxGeometry)
- GLB food items placed on shelves with depth-aware positioning
- Each shelf holds 4-5 items spaced evenly
- Pull-out drawers slide forward on interaction (Rapier kinematic body)

**Mechanic:**
- Fridge door opens (existing animation)
- Player sees 15 randomly-selected food GLBs placed on shelves
- Tap items to select ingredients (existing fridge click bridge pattern)
- 5 required ingredients are "correct" (meat, spices), rest are decoys/horror items
- Selected items float to mixing bowl (lerp animation)

**Scoring:** Same as current `Ingredients.ts` system — ingredient rarity × correct count.

### 6.2 Station 1: Grinder — Grinding

**GLB:** Keep `meat_grinder.glb` (168KB, animated crank)
**Procedural additions:**
- Raw meat chunks: `InstancedMesh` with count=20, procedural meat texture via canvas
- Particle system: smaller InstancedMesh for ground meat coming out
- Bowl at output using `LatheGeometry` (from POC line 152)
- Ground meat accumulation texture (procedural, fat specks + muscle fibers)

**Mechanic (from POC lines 330-380):**
- Drag chunks from mixing bowl into grinder hopper
- Click switch to start motor (vibration animation on grinder body)
- Grinder extruder pushes ground meat into output bowl
- Particle spray of ground meat bits
- Rhythm mechanic: crank handle at consistent BPM for bonus score

**State machine:**
```text
FILL_GRINDER → GRINDING → MOVE_BOWL
```

**Key POC code to port:**
- Line 118: `generateMeatTexture(colorHex, fatRatio)` — canvas procedural texture
- Lines 492-520: Grinder vibration + particle emission in render loop
- Lines 330-355: Drag interaction for chunks

### 6.3 Station 2: Stuffer — Stuffing

**Procedural (no GLB base needed):**
- Canister: `CylinderGeometry` with metallic material
- Nozzle: `ConeGeometry` at canister mouth
- Crank handle: `BoxGeometry` + `CylinderGeometry`
- Casing (sausage skin): `TubeGeometry` following `SquigglyCurve`

**Mechanic (from POC lines 174-202, 380-420):**
- Bowl of ground meat slides to stuffer (anime.js lerp)
- Player rotates crank by circular drag gesture
- Casing fills from nozzle end, extending via growing TubeGeometry
- Pressure gauge overlay shows fill level (too fast = burst, too slow = loose)
- Completed casing detaches as sausage body

**State machine:**
```text
ATTACH_CASING → STUFFING → MOVE_SAUSAGE
```

**Key POC code to port:**
- Lines 174-202: Stuffer geometry + SquigglyCurve for casing shape
- Lines 380-420: Crank rotation interaction, casing growth

### 6.4 Station 3: Stove — Cooking

**GLB:** Replace `oven_range.glb` (7.1MB) with `kitchen_oven_large.glb` (7KB)
**GLB:** Keep `frying_pan.glb` (32KB)
**Procedural additions:**
- Burner rings: `TorusGeometry` with emissive heat glow
- Grease FBO simulation: wave equation shader on RenderTarget
- Steam particles: `InstancedMesh` rising from pan
- Temperature dial: procedural knob with rotation interaction

**Mechanic (from POC lines 204-250, 440-487):**
- Sausage placed in frying pan on burner
- Grease surface simulates with FBO wave equation (POC lines 230-241)
- Player controls temperature via dial drag
- Too hot = burns (sausage darkens, score drops)
- Too cold = undercooked (score drops)
- Steam particles increase with heat
- Sausage must be flipped (tap to turn) for even cooking
- Visual: sausage skin color shifts from pink → golden brown → burnt black

**Grease FBO (critical — needs TSL conversion):**
```text
POC uses WebGL ShaderMaterial for wave equation:
  prev_height → curr_height → next_height (ping-pong render targets)
  normal_map computed from height field
  Applied as displacement + normal on MeshPhysicalMaterial

For WebGPU: Convert to TSL NodeMaterial
  - tslFn for wave equation compute
  - RenderTarget for ping-pong buffers
  - MeshPhysicalNodeMaterial for grease surface
```

**State machine:**
```text
MOVE_PAN → COOKING → DONE
```

### 6.5 Station 4: CRT TV — Tasting/Judgment

**Existing:** CRT shader on TV screen with Mr. Sausage face — KEEP AS-IS.

**Mechanic:**
- Mr. Sausage "tastes" the sausage (animation: sausage rises toward TV, disappears)
- CRT screen shows reaction animations (existing face expressions)
- Score calculation runs (existing `SausagePhysics.ts` scoring)
- Verdict displayed on CRT screen: S/A/B/F rank

No new procedural geometry needed. This station is already well-implemented.

### 6.6 Sausage Body — Bone Chain Physics

The central physical object. Procedurally generated, carried between stations.

**From POC lines 252-306:**

```typescript
// SausageCurve — custom path for sausage shape
class SausageCurve extends THREE.Curve<THREE.Vector3> {
  getPoint(t: number): THREE.Vector3 {
    return new THREE.Vector3(0, t * length, 0);
  }
}

// Bone chain — N bones along curve
// Each bone backed by Rapier dynamic RigidBody
// Spring impulses pull bones toward anchor positions each frame

// SkinnedMesh — tube geometry with manual vertex skinning
// Procedural meat texture applied as map
// Color shifts during cooking (pink → brown → black)
```

**Key physics (POC line 556):**
```javascript
b.applyImpulse({
  x: ((p.x - pos.x) * 80 - vel.x * 10) * delta,
  y: ((p.y - pos.y) * 80 - vel.y * 10) * delta,
  z: ((p.z - pos.z) * 80 - vel.z * 10) * delta
});
```

Spring constant 80, damping 10. This creates the wobbly-but-following behavior.

## 7. Game Flow — 12-State Machine

Extends the POC's 9 states with front-end ingredient selection:

```text
MENU → LOADING → INTRO_DIALOGUE
  → OPEN_FRIDGE → PICK_INGREDIENTS → CLOSE_FRIDGE
  → FILL_GRINDER → GRINDING → MOVE_BOWL
  → ATTACH_CASING → STUFFING → MOVE_SAUSAGE
  → MOVE_PAN → COOKING
  → TASTING → VERDICT → GAME_OVER
```

**State transitions stored in Zustand `gameStore`:**

```typescript
// New states added to gameStatus
type GameStatus =
  | 'menu' | 'loading' | 'intro'
  | 'fridge_open' | 'picking' | 'fridge_close'
  | 'fill_grinder' | 'grinding' | 'move_bowl'
  | 'attach_casing' | 'stuffing' | 'move_sausage'
  | 'move_pan' | 'cooking'
  | 'tasting' | 'verdict' | 'game_over';
```

**Movement:** Player walks between stations using existing FPS controller. Waypoint markers (existing `StationMarker.tsx`) guide the player to the next station. Proximity sensors (existing `StationSensor` in `GameWorld.tsx`) trigger station activation.

## 8. Animation Library

### anime.js vs @react-spring/three

The POC uses direct Three.js transforms in the render loop. For the R3F port, we need declarative animations for object transitions (bowl slides between stations, sausage moves to pan, etc.).

**Recommendation: @react-spring/three**

Rationale:
- Already in the React ecosystem (R3F compatible)
- Declarative: `useSpring({ position: [x, y, z] })`
- Physics-based easing (spring, bounce)
- No additional dependency if we use `@react-three/drei`'s built-in animation utilities

Alternative: `drei`'s `useAnimations` for GLB clip playback (already used for fridge/grinder).

For procedural animations (grinder vibration, steam particles, sausage bone physics): **useFrame** callbacks, same as current pattern.

## 9. Sound Design

From `/Volumes/home/assets/kitchen/sounds/` (138 WAVs):

| Station | Sounds |
|---------|--------|
| Fridge | door_open, door_close, fridge_hum |
| Grinder | motor_start, motor_loop, grind_crunch, splat |
| Stuffer | crank_turn, casing_stretch, pressure_hiss |
| Stove | sizzle_oil, fry_loop, boil_over, steam_hiss |
| Tasting | dramatic_sting, verdict_fanfare/failure |
| Ambient | drip, pipe_creak, distant_scream, light_buzz, fridge_hum |

Integration via existing `AudioEngine` (Tone.js on web, no-op on native).

## 10. Removals

### Files to Delete
- `public/models/sausage.glb` (1.1MB) — replaced by procedural SkinnedMesh
- `public/models/funny_sausage.glb` (1.1MB) — not needed
- `public/models/l_counter.glb` (9.1MB) — replaced by Quaternius workplan GLBs
- `public/models/oven_range.glb` (7.1MB) — replaced by kitchen_oven_large.glb
- `public/models/upper_cabinets.glb` (5.2MB) — replaced by kitchen_cabinet1/2.glb
- `public/models/utensil_hooks.glb` (4.2MB) — replaced by poseustensils.glb
- `public/models/island.glb` (4.1MB) — replaced by bartable.glb or procedural
- `public/models/dishwasher.glb` (4.1MB) — replaced by whashing_machine.glb
- `public/models/trash_can.glb` (4.0MB) — replaced by trashcan_cylindric.glb
- `public/models/table_chairs.glb` (2.2MB) — replaced by table.glb + chair GLBs
- `public/models/spice_rack.glb` (2.1MB) — replaced by shelf + jars

### Code to Refactor
- `FurnitureLayout.ts` — Update `FURNITURE_RULES` array: remove deleted GLBs, add replacements, add horror props
- `LoadingScreen.tsx` — Remove `kitchen.glb` single-file loading, add parallel GLB preloading
- `FurnitureLoader.tsx` — Handle new GLB filenames
- Room dimensions: `DEFAULT_ROOM` from `{w:13, d:13, h:5.5}` to `{w:18, d:16, h:5.5}`

### Code to Keep
- All challenge overlays (IngredientChallenge, GrindingChallenge, etc.)
- All scoring functions (SausagePhysics.ts, Ingredients.ts)
- CRT shader and Mr. Sausage TV system
- FPS controller and waypoint navigation
- Rapier physics integration (PlayerBody, StationSensor, RoomColliders)
- Zustand store architecture
- Grime decals and atmospheric lighting

## 11. Implementation Priority

### Phase 1: Asset Swap + Title Screen (Minimal Risk)

1. Copy replacement GLBs from asset library → `public/models/`
2. Update `FURNITURE_RULES` in `FurnitureLayout.ts`
3. Delete bloated GLBs
4. Update `LoadingScreen.tsx` for parallel loading
5. Implement PNG button title screen
6. Test: game loads, kitchen renders with new furniture

### Phase 2: Room Expansion + Horror Props

1. Expand room to 18×16
2. Add procedural room elements (pipes, window, door)
3. Place horror prop GLBs (bear trap, worm, bandages, etc.)
4. Add sound effects (ambient, interaction)
5. Update `resolveTargets()` for new dimensions
6. Test: atmosphere feels right, stations reachable

### Phase 3: Procedural Sausage System

1. Port `generateMeatTexture()` canvas texture
2. Implement bone chain SkinnedMesh + Rapier bodies
3. Port grinder mechanics (chunks, particles, vibration)
4. Port stuffer mechanics (casing growth, pressure)
5. Port cooking mechanics (FBO grease, temperature, steam)
6. Test: full factory pipeline works end-to-end

### Phase 4: Polish + Fridge Interior

1. Procedural fridge interior (shelves, drawers)
2. Food GLB placement with depth awareness
3. Ingredient selection → mixing bowl flow
4. Game flow state machine (12 states)
5. Loading screen procedural sausage animation
6. Final scoring and verdict system
7. Test: complete game loop, playable start to finish

## 12. Technical Risks

| Risk | Mitigation |
|------|------------|
| FBO grease shader needs TSL conversion | GLSL → TSL is mechanical; Three.js TSL docs cover RenderTarget usage |
| Bone chain physics may jitter on mobile | Reduce bone count (8→5), increase spring damping |
| 48+ GLBs may cause many HTTP requests | Use `useGLTF.preload()` with Promise.all, consider GLB atlas |
| Room expansion breaks existing camera positions | Update `resolveTargets()` first, test station reachability |
| Quaternius models may look too "cute" for horror | Apply dark materials, grime overlays, dramatic lighting |

## 13. Dependencies

- `@react-spring/three` — for declarative object transitions (add to package.json)
- `/Volumes/home/assets/kitchen/` — shared asset library (179 GLBs, 138 sounds)
- Existing R3F + Rapier + Zustand stack — no framework changes
- AmbientCG PBR textures — already integrated

## 14. File Manifest — New/Modified

### New Files

| File | Purpose |
|------|---------|
| `src/engine/SausageBody.ts` | Bone chain SkinnedMesh + Rapier physics |
| `src/engine/MeatTexture.ts` | Canvas procedural meat texture generator |
| `src/engine/GreaseSimulation.ts` | FBO wave equation shader (TSL) |
| `src/components/kitchen/GrinderMechanics.tsx` | Procedural grinder interactions |
| `src/components/kitchen/StufferMechanics.tsx` | Procedural stuffer interactions |
| `src/components/kitchen/CookingMechanics.tsx` | Procedural cooking interactions |
| `src/components/kitchen/FridgeInterior.tsx` | Procedural shelves + food placement |
| `src/components/kitchen/HorrorProps.tsx` | Horror prop placement + animations |
| `src/components/kitchen/BasementStructure.tsx` | Pipes, window, door, drain |

### Modified Files

| File | Changes |
|------|---------|
| `src/engine/FurnitureLayout.ts` | New room dimensions, updated FURNITURE_RULES, horror prop targets |
| `src/components/ui/TitleScreen.tsx` | PNG sprite buttons |
| `src/components/ui/LoadingScreen.tsx` | Parallel GLB loading, procedural sausage animation |
| `src/components/kitchen/KitchenEnvironment.tsx` | Expanded room, new surface elements |
| `src/store/gameStore.ts` | Extended game status states |
| `src/components/GameWorld.tsx` | New station sensors for expanded layout |
| `package.json` | Add @react-spring/three |
