<!--
title: Room Architecture — The Sausage Factory Kitchen
domain: architecture
status: stale
engine: r3f
last-verified: 2026-03-01
depends-on: [architecture, game-design, 3d-rendering, state-management]
agent-context: scene-architect, challenge-dev, asset-pipeline
summary: Definitive spatial reference — room layout, GLB inventory, procedural geometry, station walkthroughs, paper playtesting, spatial feel analysis
-->

# Room Architecture — The Sausage Factory Kitchen

> **The entire game takes place in ONE room.** This document is the definitive spatial reference for every piece of geometry, every station, every prop, and every camera angle in that room.

## 1. The Room

The player is trapped in a filthy basement kitchen. Subway tile on the lower walls, crumbling concrete above. Fluorescent tubes flicker overhead. A CRT television on the back wall shows Mr. Sausage's face. There is no escape. There is only sausage.

### 1.1 Coordinate System

```text
        +Y (up)
        │
        │     -Z (back wall — where CRT TV lives)
        │    /
        │   /
        │  /
        │ /
        └──────── +X (right)
       origin
      (0, 0, 0)
       is room
       center
       at floor
```

- **Origin (0, 0, 0)** = center of floor
- **+X** = toward right wall
- **-X** = toward left wall
- **+Z** = toward front wall (door)
- **-Z** = toward back wall (CRT TV)
- **+Y** = up toward ceiling

### 1.2 Proportional Dimensions

Room size is **NOT fixed**. It derives from the viewport aspect ratio via `computeRoom(aspect)`:

```typescript
// src/engine/FurnitureLayout.ts
const BASE_DEPTH = 13;  // baseline for aspect=1

export function computeRoom(aspect: number): RoomDimensions {
  const area = BASE_DEPTH * BASE_DEPTH;  // 169 sq units, always preserved
  const d = Math.sqrt(area / Math.max(aspect, 0.5));
  const w = d * Math.max(aspect, 0.5);
  return { w, d, h: 5.5 };
}
```

| Viewport | Aspect | Width (w) | Depth (d) | Height (h) | Floor Area |
|----------|--------|-----------|-----------|------------|------------|
| Square | 1.0 | 13.0 | 13.0 | 5.5 | 169 |
| 16:9 | 1.78 | 17.3 | 9.8 | 5.5 | ~169 |
| 4:3 | 1.33 | 15.0 | 11.3 | 5.5 | ~169 |
| 21:9 | 2.33 | 19.8 | 8.5 | 5.5 | ~169 |
| Portrait | 0.56 | 9.2 | 18.4 | 5.5 | ~169 |

All furniture positions use **proportional fractions** of room dimensions:

```typescript
// Example: fridge position
position: [
  -halfW + room.w * 0.103,   // 10.3% from left wall
  room.h * 0.325,            // 32.5% of ceiling height
  -halfD + room.d * 0.114    // 11.4% from back wall
]
```

This means the spatial layout **adapts to any screen shape** while keeping relative positions identical.

### 1.3 Room Structure (Top-Down, aspect=1, 13×13)

```text
    Left wall (-X)                                Right wall (+X)
    x = -6.5                                      x = +6.5
    ┌──────────────────────────────────────────────────────┐
    │                    BACK WALL (-Z)                     │ z = -6.5
    │                                                       │
    │  ┌─────┐                              ┌────────┐     │
    │  │FRIDGE│  ╔═══UPPER-CABINETS═══╗     │SPICE   │     │
    │  │ (S0) │  ║                    ║     │ RACK   │     │
    │  └─────┘  ╚═══════════════════╝     └────────┘     │
    │                                                       │
    │  ┌─L-COUNTER──────────────────────────────────┐      │
    │  │  stove(S3)     grinder(S1)     dishwasher  │      │
    │  │  ┌────┐        ┌──────┐        ┌────┐      │      │
    │  │  │oven│        │grind │        │wash│      │      │
    │  │  └────┘        └──────┘        └────┘      │      │
    │  └────────────────────────────────────────────┘      │
    │                                                       │
    │              ┌──ISLAND──┐                             │
    │              │          │                             │
    │              │ center   │         ┌─TABLE─┐          │
    │              │          │         │ chair │          │
    │              └──────────┘         └───────┘          │
    │                                                       │
    │  ┌─CRT-TV─┐                                          │
    │  │  (S4)  │                    🐻 bear-trap          │
    │  │MrSausag│                                          │
    │  └────────┘                  ┌─TRASH─┐               │
    │                              │  CAN  │               │
    │                              └───────┘               │
    │                    FRONT WALL (+Z)                    │ z = +6.5
    └──────────────────────────────────────────────────────┘
```

### 1.4 Room Structure (Side View, looking from right wall)

```text
    y = 5.5  ┌───────────────────────────────────────┐ CEILING
             │  ═══ fluorescent tubes ═══            │
    y = 4.2  │  💡    💡    💡                       │
             │                                       │
             │  ┌UPPER-CAB┐  ┌SPICE┐                │
    y = 3.6  │  └─────────┘  └─────┘                │
             │                                       │
             │  ┌utensil-hooks┐                      │
    y = 3.0  │  └─────────────┘                      │
             │                  ┌──fly-swatter──┐    │
    y = 2.5  │                  └───────────────┘    │
             │                                       │
    y = 1.8  │      ← FRIDGE top →                   │
    y = 1.6  │  👤 PLAYER EYE HEIGHT                 │
             │                                       │
    y = 1.05 │  ══ COUNTER SURFACE ══  ── TABLE ──   │
    y = 0.95 │                         ── plates ──  │
             │                                       │
    y = 0.0  └───────────────────────────────────────┘ FLOOR
              z=-6.5 (back)                z=+6.5 (front)
```

### 1.5 Wall Surfaces

Each wall is two stacked planes with different PBR materials:

```text
    y = 5.5  ┬────────────────┬
             │   CONCRETE     │  Upper wall: concrete PBR
             │   (3×2 tile)   │  roughness: 0.9
    y = 2.4  ├────────────────┤  ← TILE_LINE transition
             │  SUBWAY TILE   │  Lower wall: tile_wall PBR
             │  (6×3 tile)    │  roughness: 0.85
    y = 0.0  ┴────────────────┴
```

- **Floor:** tile_floor PBR, 6×6 tiling, roughness 0.9
- **Ceiling:** concrete PBR, 3×2 tiling, roughness 0.95
- **Grime drips:** 4 transparent planes at z-offset +0.02 from walls
- **Baseboard mold:** 4 transparent planes at z-offset +0.03, y~0.5

---

## 2. What Is Procedural vs What Is GLB

This is the definitive inventory. Every piece of 3D geometry in the game falls into one of these categories.

### 2.1 Procedural Geometry (code-generated, no external files)

| Element | Geometry | File | Notes |
|---------|----------|------|-------|
| **Floor** | `planeGeometry [w, d]` | KitchenEnvironment.tsx | tile_floor PBR textures |
| **Ceiling** | `planeGeometry [w, d]` | KitchenEnvironment.tsx | concrete PBR textures |
| **4 Walls (lower)** | `planeGeometry [wallW, 2.4]` | KitchenEnvironment.tsx | subway tile PBR |
| **4 Walls (upper)** | `planeGeometry [wallW, 3.1]` | KitchenEnvironment.tsx | concrete PBR |
| **Trap door** | `planeGeometry [1.8, 1.8]` | KitchenEnvironment.tsx | brushed steel material |
| **4 Grime drips** | `planeGeometry` various | KitchenEnvironment.tsx | alpha-blended decals |
| **4 Baseboard mold** | `planeGeometry` various | KitchenEnvironment.tsx | alpha-blended decals |
| **3 Fluorescent tubes** | `boxGeometry [0.12, 0.06, 2.5]` | KitchenEnvironment.tsx | emissive + pointLight |
| **Mr. Sausage face** | sphere + torus + cone | MrSausage3D.tsx | 9 reaction animations |
| **CRT screen** | planeGeometry + NodeMaterial | CrtTelevision.tsx | TSL scanline shader |
| **Player collider** | capsule RigidBody | GameWorld.tsx | Rapier physics |
| **Station sensors** | cuboid sensors | GameWorld.tsx | Rapier trigger volumes |
| **Room colliders** | cuboid fixed bodies | GameWorld.tsx | Wall/floor/ceiling collision |
| **Station markers** | cone + ring | StationMarker.tsx | Waypoint indicators |

**Future procedural (not yet implemented):**

| Element | Geometry | Planned File | Notes |
|---------|----------|--------------|-------|
| Sausage body | TubeGeometry + SkinnedMesh | SausageBody.ts | Bone chain physics |
| Meat chunks | InstancedMesh × 20 | GrinderMechanics.tsx | Canvas procedural texture |
| Stuffer canister | CylinderGeometry + ConeGeometry | StufferMechanics.tsx | Metallic material |
| Casing (skin) | TubeGeometry on SquigglyCurve | StufferMechanics.tsx | Grows during stuffing |
| Burner rings | TorusGeometry | CookingMechanics.tsx | Emissive heat glow |
| Grease surface | PlaneGeometry + FBO shader | GreaseSimulation.ts | TSL wave equation |
| Steam particles | InstancedMesh | CookingMechanics.tsx | Rise from pan |
| Pipe runs | CylinderGeometry | BasementStructure.tsx | Ceiling pipes |
| Barred window | BoxGeometry bars + PlaneGeometry | BasementStructure.tsx | High on wall |
| Metal door | BoxGeometry | BasementStructure.tsx | Locked, bear trap nearby |
| Floor drain | PlaneGeometry + alpha cutout | BasementStructure.tsx | Center-ish floor |

### 2.2 GLB Models (external .glb files loaded at runtime)

#### Station GLBs (interactive, animated)

| GLB File | Target | Size | Animated | Station | Purpose |
|----------|--------|------|----------|---------|---------|
| `fridge.glb` | fridge | ~120KB | Yes | S0: Ingredients | Door open/close |
| `meat_grinder.glb` | meat_grinder | ~168KB | Yes | S1: Grinding | Crank rotation |
| `mixing_bowl.glb` | mixing-bowl | ~40KB | No | Between S0→S1 | Ingredient collection |

#### Kitchen Furniture GLBs (decorative, static)

| GLB File | Target | Position Zone | Purpose |
|----------|--------|---------------|---------|
| `workplan.glb` | l-counter | Left wall, floor | Main counter surface |
| `workplan_001.glb` | l-counter-ext | Left wall, further back | Counter extension |
| `kitchen_cabinet1.glb` | upper-cabinets | Left wall, high | Wall cabinets |
| `kitchen_cabinet2.glb` | upper-cabinets-2 | Left wall, high, further | More wall cabinets |
| `island_counter.glb` | island | Center, floor | Center island |
| `table_styloo.glb` | table | Right-back quadrant | Dining table |
| `trashcan_cylindric.glb` | trash-can | Right-front corner | Trash can |
| `kitchen_oven_large.glb` | oven | Left wall, near stove | Oven unit |
| `washing_machine.glb` | dishwasher | Left wall, deep | Dishwasher stand-in |
| `utensil_holder.glb` | utensil-hooks | Left wall, high | Utensil display |
| `shelf_small.glb` | spice-rack | Left wall, mid-height | Spice shelf |

#### Atmospheric Props GLBs (scatter, mood)

| GLB File | Target | Position Zone | Purpose |
|----------|--------|---------------|---------|
| `frying_pan.glb` | frying-pan | Counter surface | Cooking station centerpiece |
| `cutting_board.glb` | cutting-board | Counter surface | Prep surface |
| `pot.glb` | pot | Counter surface | Dressing |
| `pot_lid.glb` | pot-lid | Counter surface | Askew, lived-in feel |
| `bottle.glb` | bottle | Island surface | Condiment/mystery liquid |
| `glass_big.glb` | glass | Table area | Dirty drinking glass |
| `plate_big.glb` | plate | Table area | Used plate |
| `knife_holder.glb` | knife-holder | Counter surface | Block with knives |
| `toaster.glb` | toaster | Counter surface, back | Grimy toaster |
| `roller.glb` | roller | Island surface | Rolling pin |
| `cutlery_knife.glb` | cutlery-knife | Island surface | Loose knife |
| `cutlery_cleaver.glb` | cutlery-cleaver | Island surface | Loose cleaver |
| `cutlery_ladle.glb` | cutlery-ladle | Counter surface | Loose ladle |
| `cutlery_fork.glb` | cutlery-fork | Table area | Loose fork |
| `cutlery_spoon.glb` | cutlery-spoon | Table area | Loose spoon |
| `chair_styloo.glb` | chair-extra | Right side, floor | Extra chair |

#### Horror Props GLBs (atmosphere, dread)

| GLB File | Target | Position Zone | Story Purpose |
|----------|--------|---------------|---------------|
| `beartrap_open.glb` | bear-trap | Right-front corner, floor | "Don't try the door" |
| `worm.glb` | worm | Counter surface, near food | Contamination horror |
| `tapetteamouche.glb` | fly-swatter | Right wall, mid-height | Suspicious stains |
| `can_broken.glb` | broken-can | Right-back corner, floor | Debris, neglect |
| `bandages.glb` | bandages | Counter surface | Bloody bandages — who was here before? |
| `matchbox.glb` | matchbox | Counter surface, near stove | Fire risk, arson hints |
| `postit.glb` | postit-note | Left wall, low-mid | Cryptic note ("RULE #4") |
| `fridgeletter.glb` | fridge-letters | Left wall, low-mid | Fridge magnets spelling threats |
| `prop_knife.glb` | prop-knife | Island surface | Suspiciously clean knife |

#### Food GLBs (fridge ingredient display — NOT all loaded every game)

15 food GLBs exist in `public/models/`. A random subset is selected per game session:

| GLB File | Visual | Notes |
|----------|--------|-------|
| `food_bacon_uncooked.glb` | Raw bacon strips | Normal food |
| `food_broccoli.glb` | Broccoli head | Vegetable |
| `food_carrot.glb` | Carrot | Vegetable |
| `food_cheese_singles.glb` | Cheese slices | Processed food |
| `food_chickenleg.glb` | Raw chicken leg | Meat |
| `food_egg_whole.glb` | Whole egg | Basic ingredient |
| `food_eggplant.glb` | Eggplant | Vegetable |
| `food_fishbone.glb` | Fish skeleton | Horror ingredient |
| `food_lettuce.glb` | Lettuce head | Vegetable |
| `food_mushroom.glb` | Mushroom | Vegetable |
| `food_pepper_red.glb` | Red bell pepper | Vegetable |
| `food_sausage_raw.glb` | Raw sausage link | Meta ingredient |
| `food_steak.glb` | Raw steak | Meat |
| `food_tentacle.glb` | Tentacle | Horror ingredient |
| `food_tomato.glb` | Tomato | Vegetable |

### 2.3 Textures (PBR sets in `public/textures/`)

| Set | Files | Applied To | Tiling |
|-----|-------|-----------|--------|
| `tile_floor` | color, normal, roughness | Floor plane | 6×6 |
| `tile_wall` | color, normal, roughness, AO | Lower walls | 6×3 |
| `concrete` | color, normal, roughness | Upper walls + ceiling | 3×2 |
| `grime_drip` | color, normal, roughness, opacity | Wall drip decals | 1×1 |
| `grime_base` | color, normal, roughness, opacity | Baseboard mold decals | 1×1 |
| `environment.env` | — | IBL environment map | — |

### 2.4 UI Assets (`public/ui/`)

| File | Purpose |
|------|---------|
| `btn_newgame_normal.png` | New Game button (idle) |
| `btn_newgame_hover.png` | New Game button (hover) |
| `btn_load_normal.png` | Continue button (idle) |
| `btn_load_hover.png` | Continue button (hover) |
| `btn_quit_normal.png` | Quit button (idle) |
| `btn_quit_hover.png` | Quit button (hover) |

---

## 3. The Five Stations

### Station Map (with challenge flow)

```text
    ┌────────────────────────────────────────────────┐
    │                                                 │
    │  ╔═S0═╗                                        │
    │  ║FRID║─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┐               │
    │  ║ GE ║  ingredients           │               │
    │  ╚════╝                        │               │
    │                                │               │
    │  ┌counter──────────────────┐   │               │
    │  │ ╔═S3═╗      ╔═S1═╗     │   │               │
    │  │ ║STOV║      ║GRIN║ ← ─ ┘   │               │
    │  │ ║  E ║      ║ DER║─ ─ ─ ┐  │               │
    │  │ ╚════╝      ╚════╝      │  │               │
    │  └─────────────────────────┘  │               │
    │         ↑                      │               │
    │         │              ╔═S2═╗  │               │
    │         │              ║STUF║← ┘               │
    │         │              ║ FER║─ ─ ─ ─ ┐        │
    │         │              ╚════╝         │        │
    │         │                             │        │
    │         └ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ─ ┘        │
    │                                                 │
    │  ╔═S4═╗                                        │
    │  ║ CRT║ ← player walks back for verdict        │
    │  ║ TV ║                                        │
    │  ╚════╝                                        │
    │                                                 │
    └────────────────────────────────────────────────┘

    Challenge Flow:
    S0 (fridge) → S1 (grinder) → S2 (stuffer) → S3 (stove) → S4 (CRT TV)
```

### Station Detail: Proportional Positions

All positions are proportional fractions of room width (w), depth (d), and height (h). At aspect=1 (13×13×5.5), the concrete positions are:

| Station | Name | X fraction | Y fraction | Z fraction | Concrete pos (13×13) |
|---------|------|-----------|-----------|-----------|---------------------|
| S0 | fridge | -halfW + w×0.103 | h×0.325 | -halfD + d×0.114 | (-5.16, 1.79, -5.02) |
| S1 | grinder | -halfW + w×0.135 | h×0.375 | -halfD + d×0.451 | (-4.75, 2.06, -0.64) |
| S2 | stuffer | +halfW - w×0.325 | h×0.487 | +halfD - d×0.327 | (2.28, 2.68, 2.25) |
| S3 | stove | -halfW + w×0.117 | h×0.387 | -halfD + d×0.328 | (-4.98, 2.13, -2.24) |
| S4 | crt-tv | 0 | h×0.455 | -halfD + d×0.077 | (0, 2.50, -5.50) |

Each station has a **trigger radius** (scaled by `min(w,d)/13`) and a **marker Y** for the waypoint indicator.

---

## 4. Lighting

### Lighting Rig

```text
    CEILING (y=5.5)
    ┌────────────────────────────────────────┐
    │                                         │
    │   💡═══════════  (tube 0)              │
    │   [-2.5, 4.2, 1.5]                     │
    │                                         │
    │            💡═══════════  (tube 1)      │
    │            [1.5, 4.2, -1.0]            │
    │                                         │
    │   💡═══════════  (tube 2)              │
    │   [-2.5, 4.2, -3.0]                   │
    │                                         │
    │                  🔴 (emergency light)   │
    │                  [1.5, 5.2, 1.5]       │
    │                                         │
    └────────────────────────────────────────┘

    CENTER FILL: pointLight [0, 2.0, 0] #d9e1cc intensity=0.8
    HEMISPHERE: sky=#d9e6d1 ground=#4d473d intensity=0.6
    UNDER-COUNTER: pointLight [0, 0.15, 0] #443322 intensity=0.3
```

### Flicker System

Every 3–11 seconds, a random fluorescent tube flickers for 0.1–0.4 seconds:
```text
    Normal:  intensity = 2.0 (BASE_INTENSITY)
    Flicker: intensity = sin(time×60) > 0 ? 0.4 : 2.0  (rapid strobe)
```

This creates subliminal unease — the player never consciously notices the flicker pattern but the room feels alive and threatening.

---

## 5. Camera & Player

### FPS Controller

```text
    EYE_HEIGHT = 1.6 (locked Y — no jump, no crouch)
    WALK_SPEED = 3.0 units/sec
    MOUSE_SENSITIVITY = 0.002 rad/pixel
    PITCH_LIMIT = ±80° (can look almost straight up/down)

    Initial position: (0, 1.6, 0) — room center
    Initial yaw: π (facing -Z, toward back wall / CRT TV)

    Bounds: x ∈ [-halfW+0.5, halfW-0.5]
            z ∈ [-halfD+0.5, halfD-0.5]
```

### What the Player Sees on Spawn

```text
    Standing at room center, facing back wall (-Z):

    ┌──────────────────────────────────────────────┐
    │                                               │
    │     ┌─CABINETS─┐        ┌─CABINETS─┐        │
    │     └──────────┘        └──────────┘        │
    │                                               │
    │  ┌FRIDGE┐                    ┌SPICE┐         │
    │  │      │                    │RACK │         │
    │  │      │     ┌UTENSILS┐    └─────┘         │
    │  └──────┘     └────────┘                     │
    │                                               │
    │  ═══════ COUNTER SURFACE ═══════════         │
    │  │ pot │ stove │ grinder │ knife │ toaster │  │
    │                                               │
    │              ← player looks this way          │
    └──────────────────────────────────────────────┘
```

On spawn the player faces the "production line" — counter with all the stations visible in a sweeping left-to-right view. The CRT TV is at the back wall to their left. Turning around (180°) shows the table, chair, bear trap, and the (locked) implied exit.

---

## 6. Paper Playtesting — Full Walkthrough

### 6.1 MENU → LOADING

**What the player sees:** A butcher shop sign hangs on chains, swinging gently. Three sausage-character buttons bounce subtly. The aesthetic is intentionally kitschy — the horror hasn't started yet.

**FEEL:** Playful, slightly off. The sausage characters are cute but their eyes are just slightly too eager. Something is wrong but it's charming.

**Player presses NEW GAME.**

**Loading screen:** Progress bar fills as 39 GLBs load in parallel (~1.1MB total). Mr. Sausage quotes cycle: "Patience... the meat must rest." / "Almost ready... the grinder is hungry." On a fast connection this screen flashes by in <1 second. On 3G it takes maybe 5-8 seconds.

**TRANSITION:** Black fade → game world appears.

### 6.2 CHALLENGE 0: Ingredient Selection (Fridge Station)

**Player spawns at room center, facing back wall.**

The first thing they see: a dimly lit kitchen. Fluorescent tubes hum overhead with occasional flickers. Grime streaks down the tile walls. A CRT television shows a static image of a cartoon sausage face — Mr. Sausage.

**What draws attention:** The fridge is against the back-left wall. A glowing station marker (cone + ring) bobs above it. The waypoint says "come here."

**The walk:** 3-4 seconds from center to fridge. During the walk, the player takes in the room:
- Counter along the left wall with pots, knives, a grinder
- Island in the center with scattered cutlery
- Table and chair in the back-right corner
- Something glints on the floor near the right wall... is that a bear trap?
- Bloody bandages on the counter surface
- A post-it note on the wall (too far to read)
- The lighting flickers once. Just once.

**At the fridge:** Trigger radius (2.0 units × scale) activates. The fridge door opens (GLB animation). Inside: shelves with 12 randomly-selected food GLBs. Some are normal (steak, eggs, carrots). Some are weird (tentacle, fishbone).

**Mr. Sausage speaks** (CRT TV, typewriter text): "Only the finest ingredients... I want something SPICY..."

**Mechanic:** Player taps/clicks food items. Correct picks (matching the tag criteria) slide forward with reduced opacity. Wrong picks trigger a strike (red X in the corner). Three strikes = game over. Must pick 3 correct items.

**FEEL:** Pressure. The fridge interior feels cramped. The food items are slightly too colorful against the grimy kitchen — they don't belong here. The tentacle DEFINITELY doesn't belong here. Every wrong pick makes the red emergency light pulse briefly.

**DEPTH:** The fridge has actual depth — 3 shelves with items at different z-depths. Items in the back are slightly darker (shadow). This isn't a flat UI; it's a 3D space you're reaching into.

**Score:** `(correct / required) × 100 - (strikes × penalty)`

### 6.3 CHALLENGE 1: Grinding (Grinder Station)

**Camera transition:** Smooth walk from fridge to grinder (~2.5 seconds, ease-in-out). The player's selected ingredients float toward the mixing bowl (lerp animation).

**At the grinder:** The meat grinder sits on the counter surface. It's a real GLB model — cast iron, industrial, heavy-looking. The mixing bowl with ingredients sits beside it.

**Mr. Sausage speaks:** "Grind it FINE... but not too fast, or you'll splatter my kitchen."

**Mechanic:** The player drags/flings to control grind speed. A speed indicator shows three zones:

```text
    ┌─────────────────────────────────────┐
    │▓▓▓▓▓░░░░░░░░░░░░░░░░░░░░░░░░░░░░│  SLOW (yellow)
    │▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░░░░░░░░░░│  GOOD (green)
    │▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░░░░░░░░░│  TOO FAST (red)
    └─────────────────────────────────────┘
```

The grinder crank animates to match player input. Too fast: splatter particle effect, strike. Timer counts down (25-35 seconds depending on variant).

**FEEL:** Rhythmic. The grinding mechanic should feel like controlling a hand-cranked machine — physical effort. The EMA smoothing prevents jitter, making the speed feel weighty. Ground meat extrudes from the grinder into the bowl. The meat texture is procedural (canvas-generated fat specks in muscle fiber).

**DEPTH:** The grinder is a chunky 3D object. The player can see behind it, around it. The crank handle has actual geometry that rotates. Meat chunks visibly enter the top and ground meat exits the bottom. The counter surface extends away in both directions — you're working at a specific spot on a long counter, not floating in UI space.

**Score:** Based on time spent in the "good" speed zone.

### 6.4 CHALLENGE 2: Stuffing (Stuffer Station)

**Camera transition:** Walk from grinder to stuffer. The mixing bowl slides along (animation).

**At the stuffer:** The stuffer station is at the island counter. The canister, nozzle, and crank are procedural geometry (not GLB — metallic cylinders and cones).

**Mr. Sausage speaks:** "Careful with the casing... too much pressure and—" *makes explosion sound*

**Mechanic:** Hold to fill, release to let pressure drop. The casing (TubeGeometry on a SquigglyCurve) extends from the nozzle, filling with meat.

```text
    PRESSURE GAUGE:
    ┌──────────────────────────┐
    │████████████░░░░░░░░░░░░│  50% — green
    │██████████████████░░░░░░│  75% — yellow
    │████████████████████████│  95% — RED (burst imminent!)
    └──────────────────────────┘
```

Burst = particle spray, flash, strike. Must fill to 100% before timer expires.

**FEEL:** Tense. The pressure gauge is the central anxiety source. The casing VISUALLY GROWS — you can see the sausage taking shape, and that creates ownership ("that's MY sausage"). The burst is violent — particles spray, the screen shakes, Mr. Sausage laughs.

**DEPTH:** The stuffer is at the island, away from the wall. The player can see the kitchen stretching in all directions around this station. The dangling casing has physics — it sways and wobbles (Rapier spring joints). This isn't a 2D mini-game; it's a physical object in a physical room.

**Score:** Based on fill level and burst count.

### 6.5 CHALLENGE 3: Cooking (Stove Station)

**Camera transition:** Walk from stuffer to stove. The completed sausage is carried along.

**At the stove:** The oven (kitchen_oven_large.glb) sits against the left wall. A frying pan (GLB) sits on the burner. The sausage is placed in the pan.

**Mr. Sausage speaks:** "Temperature is EVERYTHING. Brown, not black. This is ART."

**Mechanic:** Control heat level to keep temperature in a target zone.

```text
    TEMPERATURE:
    ═══════════════════════════════════
    ░░░░░░░░░░░░░░░║TARGET║░░░░░░░░░
    ═══════════════════════════════════
    100°     140°   160°   180°   220°
                    ├─────┤
                    ±10° tolerance
```

Too hot: sausage darkens (material color shifts pink → brown → black). Too cold: undercooked. Must hold in the target zone for holdSeconds (4-6 seconds).

**FEEL:** Meditative focus after the tension of stuffing. The sizzle sound loop plays. Steam rises (particle InstancedMesh). Grease surface simulates with wave equation FBO — tiny ripples spread across the pan. The burner ring glows orange-red, pulsing with heat level. This is the most visually rich station.

**DEPTH:** The grease FBO is the depth hero here. The pan is a real 3D object with a physically-simulated grease surface. The sausage in the pan changes color over time. Steam particles have actual height — they rise from the pan surface and dissipate. The burner geometry (TorusGeometry) glows beneath the pan. Behind the player, the rest of the kitchen is visible — the island, the table, the ominous bear trap.

**Score:** Based on time in target zone.

### 6.6 CHALLENGE 4: Tasting / Verdict (CRT TV Station)

**Camera transition:** Walk from stove to room center, facing CRT TV.

**At the CRT TV:** No player interaction. This is pure spectacle.

**Mr. Sausage speaks:** "Let me taste..." The sausage rises toward the TV screen (animation). It disappears into the CRT.

**The verdict unfolds:**
1. Each challenge score revealed one at a time with dramatic pauses
2. Mr. Sausage's face cycles through reaction animations (flinch, disgust, excitement, nod)
3. Final rank badge appears:

```text
    ╔═══════════════════════════╗
    ║         S  RANK           ║
    ║   THE SAUSAGE KING        ║
    ║                           ║
    ║  "Perfection. You have    ║
    ║   earned my respect."     ║
    ╚═══════════════════════════╝
```

| Rank | Score | Title | FEEL |
|------|-------|-------|------|
| **S** (≥92) | Victory | THE SAUSAGE KING | Relief, triumph, the lights brighten |
| **A** (≥75) | Defeat | Almost Worthy | Bittersweet — so close, Mr. Sausage sounds genuinely sad |
| **B** (≥50) | Defeat | Mediocre | Disappointment, Mr. Sausage is disgusted |
| **F** (<50) | Defeat | Unacceptable | Terror — "You are the sausage now." Lights go red |

**FEEL:** The CRT shader (TSL NodeMaterial) gives Mr. Sausage's face a VHS quality — scanlines, chromatic aberration, slight static. When he delivers the verdict, the screen distorts based on rank. S-rank: the screen clears and brightens. F-rank: the screen fills with static, the emergency light pulses, all other lights go dark.

**DEPTH:** The CRT TV is a physical object in the room. Mr. Sausage's face is BEHIND the glass (z-layering: bezel < screen < glass < face). The room is visible around the TV — the kitchen you just worked in is still there. You didn't leave the room. You'll never leave the room.

---

## 7. Spatial Feel Analysis

### 7.1 Scale

The player is 1.6 units tall (eye height). The room is 5.5 units high. This gives a ceiling-to-eye ratio of ~3.4:1 — the ceiling feels high but not cavernous. A real basement kitchen ceiling is typically 7-8 feet (2.1-2.4m), and with eye height at ~5.2 feet (1.6m), the ratio is about 1.4:1. Our room is more spacious than a real basement — this is intentional. A claustrophobic room makes FPS navigation frustrating. The extra vertical space lets the lighting rig breathe.

### 7.2 Density

At aspect=1 (13×13 floor), the room contains:
- 11 furniture GLBs
- 16 atmospheric prop GLBs
- 9 horror prop GLBs
- 3 station GLBs (fridge, grinder, mixing bowl)
- 3 fluorescent light fixtures
- 4 grime drip decals + 4 baseboard decals
- 1 trap door
- 1 CRT TV (procedural)
- 1 Mr. Sausage (procedural)

That's ~48 visible objects in 169 square units = roughly 1 object per 3.5 sq units. This is a comfortable density — not cluttered, not empty. Real kitchens feel busier because every surface is covered in small items. Our horror prop scatter (bear trap, bandages, worms, broken cans) fills the "small item" role.

### 7.3 Sightlines

From the player's spawn position (center, facing -Z), the key sightlines are:

```text
    Player at (0, 1.6, 0), facing -Z:
    ─────────────────────────────
    LEFT:   Counter surface → fridge (S0), stove (S3), grinder (S1)
    CENTER: Upper cabinets on back wall
    RIGHT:  Spice rack, dishwasher area
    DOWN:   Island counter directly ahead (partially blocks floor view)
    UP:     Fluorescent tubes, trap door

    Player turns 90° RIGHT (facing +X):
    ─────────────────────────────
    Bear trap on floor, trash can, implied door area
    Fly swatter on wall, broken can debris

    Player turns 180° (facing +Z):
    ─────────────────────────────
    Table with chair, plate, glass, cutlery
    CRT TV is now behind them (can hear Mr. Sausage's voice)

    Player turns 90° LEFT (facing -X):
    ─────────────────────────────
    Full counter surface view with all kitchen activity
    Stove, cutting board, grinder in a line
```

The design intentionally front-loads the "work" sightline (facing -Z shows all the stations) and hides the "horror" sightline (facing +X shows the door/bear trap). The player discovers the horror elements as they turn to navigate between stations.

### 7.4 Dead Zones

Some areas of the room have NO functional purpose — they exist purely for atmosphere:

1. **Right-front corner (bear trap area):** The player never needs to go here. But they can see it. The bear trap on the floor and the fly swatter on the wall tell a story about what happens to people who try to leave.

2. **Table area:** The table, chair, plate, and cutlery suggest someone ate here. The chair is pulled out slightly (rotationY: -0.6). Someone left in a hurry. Or was taken.

3. **Under-counter shadow:** The under-counter horror glow (y=0.15, color=#443322) creates a warm-shadow pocket beneath the counter. Nothing is there. But it LOOKS like something could be.

4. **Ceiling trap door:** Centered above the island (0, 5.5, 0). The brushed steel panel is slightly different from the concrete ceiling — the player notices it on their second or third look up. It's an escape hatch. But it's 5.5 units up, and the player can't jump.

### 7.5 Progression Through Space

The challenge flow (S0 → S1 → S2 → S3 → S4) moves the player in an intentional pattern:

```text
    S0 (back-left) → S1 (left counter, mid) : moving along left wall
    S1 (left counter) → S2 (center island)  : crossing open floor
    S2 (center island) → S3 (left counter)  : back to counter
    S3 (left counter) → S4 (back wall, CRT) : crossing to back wall

    The pattern traces a rough Z-shape:
    ──→
       ╲
        ──→
       ╱
    ──→
```

This Z-pattern ensures the player sees most of the room during natural gameplay. They start in the back-left corner (fridge), work along the counter, cross to the island (where they see the bear trap and table), return to the counter, and finally walk to the CRT TV for judgment — passing the island again, seeing the kitchen they've been working in from a new angle.

---

## 8. Variant System

Each playthrough uses a `variantSeed` (Date.now()) to deterministically select challenge parameters:

### Ingredient Variants (7 options)

| # | Demand | Tags | Required | Mr. Sausage Says |
|---|--------|------|----------|-----------------|
| 0 | Sweet | `['sweet']` | 3 | "I want something SWEET..." |
| 1 | Savory | `['savory']` | 3 | "I want something SAVORY..." |
| 2 | Spicy | `['spicy']` | 3 | "Bring me heat. SPICY..." |
| 3 | Fancy | `['fancy']` | 3 | "Only the finest ingredients..." |
| 4 | Comfort | `['comfort']` | 4 | "Comfort food..." |
| 5 | Meat | `['meat']` | 3 | "MEAT. Nothing but MEAT..." |
| 6 | Sweet (hard) | `['sweet']` | 4 | "Something sweet..." |

### Grinding Variants (3 options)

| # | Target Speed | Tolerance | Timer | Difficulty |
|---|-------------|-----------|-------|------------|
| 0 | 3.0 | ±1.5 | 30s | Medium |
| 1 | 4.0 | ±1.0 | 25s | Hard |
| 2 | 2.5 | ±2.0 | 35s | Easy |

### Stuffing Variants (3 options)

| # | Fill Rate | Pressure Rate | Decay | Burst At | Timer | Difficulty |
|---|-----------|--------------|-------|----------|-------|------------|
| 0 | 8%/tick | 12%/tick | 6%/tick | 90% | 30s | Medium |
| 1 | 10%/tick | 15%/tick | 5%/tick | 85% | 25s | Hard |
| 2 | 6%/tick | 10%/tick | 8%/tick | 90% | 35s | Easy |

### Cooking Variants (3 options)

| # | Target Temp | Tolerance | Hold Time | Heat Rate | Timer | Difficulty |
|---|------------|-----------|-----------|-----------|-------|------------|
| 0 | 160° | ±10° | 5s | 15/tick | 30s | Medium |
| 1 | 170° | ±8° | 4s | 20/tick | 25s | Hard |
| 2 | 155° | ±12° | 6s | 12/tick | 35s | Easy |

### Variant Selection Formula

```typescript
index = Math.abs(((seed * 2654435761) >>> 0) % arrayLength)
// Each challenge offsets seed by its index:
// ingredients: seed+0, grinding: seed+1, stuffing: seed+2, cooking: seed+3
```

Total unique combinations: 7 × 3 × 3 × 3 = **189 distinct game configurations**.

---

## 9. Scoring Deep Dive

### Per-Challenge Scoring

Each challenge overlay (React Native 2D) computes its own 0-100 score and writes it to the store via `completeChallenge(score)`.

### Final Verdict Calculation

```typescript
averageScore = sum(challengeScores) / challengeScores.length

S-rank (≥ 92): THE SAUSAGE KING     — only true victory
A-rank (≥ 75): Almost Worthy         — defeat (close)
B-rank (≥ 50): Mediocre              — defeat
F-rank (< 50): Unacceptable          — defeat ("You are the sausage now")
```

### Legacy SausagePhysics Scoring

The original scoring model (pre-horror redesign) is still in the codebase and may be used for the tasting challenge's theatrical score reveal:

```text
finalScore = (tasteRating/5 × 60) + (ruffalos/5 × 20) + (noBurstBonus: 20) + bonus

Where:
  tasteRating = avg(tasteMod × 0.6 + textureMod × 0.4) across ingredients
  ruffalos    = clamp(holdDuration/3 × avgBlowPower + random×1.5, 0, 5)
  noBurstBonus = 20 if no burst, 0 if burst occurred
```

### The S-Rank Trap

Getting S-rank (≥92 average) is intentionally difficult. The ingredient database has a design tension: high-taste ingredients (Lobster: taste=5, texture=4) have low blow power (1), while high-blow ingredients (Water: blow=5) have terrible taste (0). The S-rank effectively requires perfect execution on ALL mechanical challenges plus smart ingredient selection. By design, S-rank should feel earned — most players will see A or B rank on their first few attempts.

---

## 10. Ingredient Database (25 items)

| # | Name | Category | Taste | Texture | Burst | Blow | Shape | Color |
|---|------|----------|-------|---------|-------|------|-------|-------|
| 1 | Big Mac | fast food | 3 | 3 | 0.2 | 2 | box/rounded | #D4A017 |
| 2 | SpaghettiOs | canned | 2 | 1 | 0.5 | 4 | sphere/wobbly | #E85D2C |
| 3 | Lobster | fancy | 5 | 4 | 0.1 | 1 | elongated/claws | #C41E3A |
| 4 | Water | absurd | 0 | 0 | 0.9 | 5 | sphere/wobbly | #4FC3F7 |
| 5 | Air | absurd | 0 | 0 | 0.1 | 0 | sphere | #E0E0E0 |
| 6 | Candy Cane | sweet | 3 | 2 | 0.3 | 2 | cone | #FF1744 |
| 7 | Carolina Reaper | spicy | 1 | 2 | 0.6 | 3 | small-sphere | #B71C1C |
| 8 | Chicken Soup | comfort | 4 | 3 | 0.4 | 3 | sphere/wobbly | #FFC107 |
| 9 | Elmer's Glue | absurd | 0 | 1 | 0.7 | 1 | cylinder | #FAFAFA |
| 10 | Beef Wellington | fancy | 5 | 5 | 0.15 | 2 | box/rounded | #8D6E63 |
| 11 | Habanero | spicy | 1 | 2 | 0.4 | 3 | small-sphere | #FF6D00 |
| 12 | Jawbreaker | absurd | 1 | 0 | 0.5 | 1 | small-sphere | #E040FB |
| 13 | Pad Thai | international | 4 | 3 | 0.3 | 3 | sphere/wobbly | #FF8A65 |
| 14 | Crunchwrap | fast food | 3 | 2 | 0.3 | 2 | cylinder/flat | #7B1FA2 |
| 15 | Cotton Candy | sweet | 2 | 1 | 0.6 | 4 | sphere | #F48FB1 |
| 16 | Vanilla Cake | sweet | 4 | 3 | 0.25 | 2 | cylinder | #FFF9C4 |
| 17 | Pizza | fast food | 4 | 3 | 0.3 | 3 | cylinder/flat | #F57C00 |
| 18 | Dirt | absurd | 0 | 1 | 0.2 | 1 | irregular | #5D4037 |
| 19 | Rice Crispy Treat | sweet | 5 | 4 | 0.15 | 2 | box | #FFE082 |
| 20 | Sushi Tray | fancy | 5 | 4 | 0.2 | 2 | box/rounded | #EF5350 |
| 21 | Hot Pocket | fast food | 2 | 2 | 0.5 | 3 | box/rounded | #1565C0 |
| 22 | Cough Drop | absurd | -1 | 1 | 0.3 | 2 | small-sphere | #00BFA5 |
| 23 | Mac & Cheese | comfort | 4 | 2 | 0.4 | 3 | sphere/wobbly | #FFCA28 |
| 24 | Corn Dog | fast food | 3 | 3 | 0.2 | 2 | elongated | #F9A825 |
| 25 | A Shoe | absurd | 0 | 0 | 0.8 | 1 | irregular | #616161 |

**Category distribution:** fast food (5), absurd (6), fancy (3), sweet (5), spicy (2), comfort (2), canned (1), international (1)

**Trap design:** "absurd" ingredients look funny but have terrible stats (taste 0, high burst risk). They're the wrong answer in every variant. First-time players will pick A Shoe because it's hilarious — and they'll get an F rank.

---

## 11. State Machine

```text
    ┌─────────┐
    │  MENU   │←──────────────────────────────────┐
    │ appPhase│                                    │
    │ ='menu' │                                    │
    └────┬────┘                                    │
         │ startNewGame()                          │
         ▼                                         │
    ┌─────────┐                                    │
    │ LOADING │                                    │
    │ appPhase│                                    │
    │='loading│                                    │
    └────┬────┘                                    │
         │ all assets loaded                       │
         ▼                                         │
    ┌─────────┐     ┌────────┐     ┌────────┐    │
    │CHALLENGE│────→│CHALLENG│────→│CHALLENG│    │
    │   0     │     │   1    │     │   2    │    │
    │(fridge) │     │(grinder│     │(stuffe │    │
    └─────────┘     └────────┘     └────────┘    │
         │               │              │         │
         │ strike≥3      │ strike≥3     │ strike≥3│
         ▼               ▼              ▼         │
    ┌─────────┐                                   │
    │ DEFEAT  │──────────────────────────────────→│
    │gameStatu│     returnToMenu()                 │
    │='defeat'│                                    │
    └─────────┘                                    │
                                                   │
    ┌────────┐     ┌────────┐     ┌────────┐      │
    │CHALLENG│────→│CHALLENG│────→│VERDICT │      │
    │   3    │     │   4    │     │ (rank) │      │
    │(stove) │     │(tasting│     │S/A/B/F │      │
    └────────┘     └────────┘     └───┬────┘      │
         │                            │            │
         │ strike≥3                   │            │
         ▼                            ▼            │
    ┌─────────┐                  ┌─────────┐      │
    │ DEFEAT  │                  │VICTORY/ │──────┘
    └─────────┘                  │ DEFEAT  │
                                 └─────────┘
```

### Store Fields

```typescript
// src/store/gameStore.ts
{
  appPhase: 'menu' | 'loading' | 'playing',
  gameStatus: 'menu' | 'playing' | 'victory' | 'defeat',
  currentChallenge: 0 | 1 | 2 | 3 | 4,
  challengeScores: number[],          // grows as challenges complete
  strikes: number,                    // resets between challenges
  variantSeed: number,                // Date.now() at game start
  playerPosition: [number, number, number],
  totalGamesPlayed: number,           // persisted
  hintsRemaining: number,             // persisted
  musicVolume: number,                // persisted
  sfxVolume: number,                  // persisted
}
```

---

## 12. File Architecture

```text
src/
├── engine/                    # Pure logic, no React
│   ├── FurnitureLayout.ts     # Room dimensions, targets, FURNITURE_RULES
│   ├── ChallengeRegistry.ts   # Challenge configs, variants, verdict calc
│   ├── SausagePhysics.ts      # Legacy scoring formulas
│   ├── Ingredients.ts         # 25 ingredient definitions
│   ├── IngredientMatcher.ts   # Tag-based matching algorithm
│   ├── AudioEngine.ts         # Web: Tone.js / Native: expo-audio
│   ├── AudioEngine.web.ts     # Web-specific Tone.js implementation
│   └── assetUrl.ts            # Asset URL resolution (GitHub Pages aware)
│
├── store/
│   └── gameStore.ts           # Zustand store (single source of truth)
│
├── components/
│   ├── GameWorld.tsx           # R3F Canvas, SceneContent, physics world
│   │
│   ├── kitchen/               # 3D station components
│   │   ├── KitchenEnvironment.tsx  # Procedural room geometry
│   │   ├── FurnitureLoader.tsx     # Loads all FURNITURE_RULES GLBs
│   │   ├── FridgeStation.tsx       # S0: fridge interaction
│   │   ├── GrinderStation.tsx      # S1: grinder crank
│   │   ├── StufferStation.tsx      # S2: stuffer interaction
│   │   ├── StoveStation.tsx        # S3: cooking interaction
│   │   ├── CrtTelevision.tsx       # S4: CRT TV + shader
│   │   ├── GrabbableSausage.tsx    # Sausage physics body
│   │   └── StationMarker.tsx       # Waypoint indicators
│   │
│   ├── challenges/            # 2D React Native overlays
│   │   ├── IngredientChallenge.tsx  # S0: ingredient picker UI
│   │   ├── GrindingChallenge.tsx    # S1: speed gauge UI
│   │   ├── StuffingChallenge.tsx    # S2: pressure gauge UI
│   │   ├── CookingChallenge.tsx     # S3: temperature UI
│   │   └── TastingChallenge.tsx     # S4: verdict reveal UI
│   │
│   ├── characters/
│   │   └── MrSausage3D.tsx    # Procedural face with 9 animations
│   │
│   ├── controls/
│   │   ├── FPSController.tsx  # WASD + pointer-lock movement
│   │   ├── GrabSystem.tsx     # Object pickup (unused)
│   │   └── MobileJoystick.tsx # Touch joystick for mobile
│   │
│   ├── effects/
│   │   └── CrtShader.ts      # TSL scanline + aberration shader
│   │
│   └── ui/                    # React Native 2D overlays
│       ├── TitleScreen.tsx    # Menu with PNG sausage buttons
│       ├── LoadingScreen.tsx  # Parallel GLB loading + progress
│       ├── DialogueOverlay.tsx # Mr. Sausage typewriter text
│       ├── GameOverScreen.tsx  # Defeat/victory screen
│       ├── ProgressBar.tsx     # HUD progress indicator
│       ├── StrikeIndicator.tsx # Red X strike counter
│       ├── ChallengeTransition.tsx # Fade between challenges
│       └── SettingsScreen.tsx  # Volume controls (stub)
│
├── data/
│   ├── challenges/
│   │   └── variants.ts        # 7+3+3+3 variant configs
│   └── dialogue/
│       ├── fridge.ts          # S0 dialogue lines
│       ├── grinder.ts         # S1 dialogue lines
│       ├── stuffer.ts         # S2 dialogue lines
│       ├── stove.ts           # S3 dialogue lines
│       ├── tasting.ts         # S4 verdict dialogue
│       └── reactions.ts       # Mr. Sausage reaction map
│
├── input/
│   ├── InputActions.ts        # Engine-agnostic input abstraction
│   └── HapticService.ts      # Vibration feedback service
│
└── dev/
    └── GameGovernor.ts        # Debug API (window.__gov)
```

---

## 13. Open Questions

1. **Reactive room dimensions:** `KitchenEnvironment.tsx` still has hardcoded `ROOM_W = 13; ROOM_D = 13`. `FPSController.tsx` derives from `DEFAULT_ROOM` which is `computeRoom(1)`. These need to read actual viewport aspect ratio. Where does the aspect ratio come from? Canvas `useThree().size`? Window resize event?

2. **Food GLB display:** The current fridge interaction uses procedural ingredient shapes (sphere, box, cylinder from `Ingredients.ts`). Should we switch to loading the actual food GLBs and displaying them on shelves? This would look much better but adds complexity to the fridge station.

3. **Sausage continuity:** The sausage body doesn't exist yet as a persistent object. Currently each challenge is independent. The design envisions a single sausage that is built through the stations — but this requires the bone chain SkinnedMesh + Rapier physics system.

4. **Sound integration:** 138 WAV files available but AudioEngine only has web Tone.js support. Native audio needs expo-audio integration. No sounds are currently playing in-game.

5. **Post-processing:** Bloom, Vignette, ChromaticAberration, and Noise effects are planned but not implemented. The `@react-three/postprocessing` package is installed.
