# Kitchen Diorama Redesign — Design Document

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:writing-plans to create the implementation plan from this design.

**Goal:** Explode the monolithic kitchen.glb into discrete, small GLB segments placed by named targets, making the scene responsive, easier to maintain, and faster to load.

**Architecture:** Target-based placement system. The room shell (walls, floor, ceiling) stays procedural R3F with PBR textures. Furniture segments are small GLBs loaded independently and snapped to named targets computed from room geometry. Interactive gameplay (stations, CRT TV, FPS controller) remains procedural R3F.

**Tech Stack:** React Three Fiber, drei (useGLTF, useTexture, useAnimations), Zustand, AmbientCG PBR textures, Draco-compressed GLBs, Rapier-compatible target system.

---

## 1. Core Principle: Targets, Not Coordinates

The layout system defines **named targets** — semantic anchor points computed from room dimensions. All furniture, station triggers, and proximity zones reference targets by name. No raw coordinates appear in furniture or station code.

```ts
// Target definitions — single source of truth
interface Target {
  position: [number, number, number]; // world coords
  rotationY: number;                  // facing direction
  triggerRadius: number;              // proximity activation zone
}

// Computed from room geometry
function resolveTargets(room: RoomDimensions): Record<string, Target> {
  return {
    'fridge':          { position: [-room.w/2 + 1.2, 0, -room.d/2 + 1.5], rotationY: Math.PI/2, triggerRadius: 2.0 },
    'grinder-counter': { position: [-room.w/2 + 1.5, 0, 0],               rotationY: Math.PI/2, triggerRadius: 1.5 },
    'oven':            { position: [-room.w/2 + 1.5, 0, -2.5],            rotationY: Math.PI/2, triggerRadius: 1.5 },
    'island':          { position: [2.0, 0, 2.0],                         rotationY: 0,         triggerRadius: 1.5 },
    'crt-tv':          { position: [0, 2.5, -room.d/2 + 0.5],             rotationY: 0,         triggerRadius: 2.0 },
    'trap-door':       { position: [0, room.h, 0],                        rotationY: 0,         triggerRadius: 0 },
    // ...decorative targets
  };
}
```

**Benefits:**
- Furniture references `target: 'fridge'`, not `position: [-5.16, 0, -5.02]`
- Station triggers derive from the same targets: `TARGETS['fridge'].triggerRadius`
- Room dimensions change → targets recompute → everything follows
- Rapier-compatible: targets map naturally to sensor colliders and named collision groups

## 2. Three-Layer Architecture

### Layer 1: Room Shell (Procedural R3F)

**Stays as-is with texture upgrades:**
- 4 walls (dual-layer: tile backsplash + concrete/plaster upper)
- Floor (black & white grimy kitchen tiles)
- Ceiling (concrete/plaster)
- Grime decals (transparent PBR planes)
- Fluorescent tube lights + flicker animation

**Upgrades:**
- Swap current textures for AmbientCG PBR sets (Tiles for floor/backsplash, Concrete or PaintedPlaster for upper walls/ceiling)
- Add ceiling-mounted steel trap door (small GLB or procedural mesh with AmbientCG Metal PBR)

**Easter egg — Trap door:**
A sealed metallic steel trap door flush-mounted in the ceiling. No handle, visible bolt heads. The implication: the kitchen was built first, then sealed off from above. The player is trapped. Uses AmbientCG Metal PBR for brushed/scratched steel surface.

### Layer 2: Furniture Segments (GLB files, target-based placement)

Each furniture group exported from kitchen-scene.blend as a standalone Draco-compressed GLB:

| Segment | Description | Est. size | Target |
|---------|-------------|-----------|--------|
| `l_counter.glb` | L-shaped lower cabinets + countertop + embedded pans/utensils | ~2MB | `l-counter` |
| `upper_cabinets.glb` | Wall-mounted upper cabinets | ~500KB | `upper-cabinets` |
| `spice_rack.glb` | Wall-mounted spice rack | ~200KB | `spice-rack` |
| `utensil_hooks.glb` | Wall-mounted hook rail + hanging utensils | ~300KB | `utensil-hooks` |
| `island.glb` | Center island counter | ~800KB | `island` |
| `table_chairs.glb` | Table + 2 chairs | ~600KB | `table` |
| `trash_can.glb` | Standalone trash can | ~100KB | `trash-can` |
| `fridge.glb` | Already exists (armature for door animation) | ~1MB | `fridge` |
| `oven_range.glb` | Stove/oven unit | ~800KB | `oven` |
| `dishwasher.glb` | Dishwasher unit | ~400KB | `dishwasher` |
| `meat_grinder.glb` | Already exists (crank animation) | ~200KB | `grinder-counter` |
| `trap_door.glb` | Steel plate, no handle, flush-mount bolts | ~100KB | `trap-door` |

**Total:** ~7MB across 12 files (vs 15MB monolith). Parallel loading via `useGLTF.preload()`.

### Layer 3: Interactive Gameplay (Procedural R3F)

**Unchanged — all of these stay as procedural R3F components:**
- `CrtTelevision` — TSL NodeMaterial shader + Mr. Sausage 3D character (glowing green CRT)
- `FridgeStation` — clickable PBR ingredients on shelves, door animation via `useAnimations`
- `GrinderStation` — meat chunks, crank animation, splatter particles
- `StufferStation` — plunger, casing inflation, pressure color, burst particles
- `StoveStation` — burner glow, sausage color change, sizzle/smoke particles
- `FPSController` — free-roam first-person movement
- `ProximityTrigger` — station activation zones (now derived from targets)
- Fluorescent light flicker animation

**Key change:** All station components get their positions from targets instead of hardcoded constants.

## 3. FurnitureLayout System

### New file: `src/engine/FurnitureLayout.ts`

Defines:
- `RoomDimensions` — width, depth, height
- `Target` — position, rotation, trigger radius
- `FurnitureRule` — maps a GLB to a target name
- `resolveTargets(room)` — computes all target world positions from room geometry
- `FURNITURE_RULES` — the list of GLB-to-target mappings

### New component: `src/components/kitchen/FurnitureLoader.tsx`

- Iterates `FURNITURE_RULES`
- Loads each GLB via `useGLTF`
- Positions at the resolved target's world coordinates
- Handles animations (fridge door, grinder crank) via `useAnimations`

### Modified: `src/components/GameWorld.tsx`

- `STATION_TRIGGERS` becomes derived from `resolveTargets()` instead of hardcoded
- `ProximityTrigger` reads trigger radii from the same target definitions
- Station components receive positions from targets

## 4. AmbientCG Texture Upgrades

Source: `/Volumes/home/assets/AmbientCG/Assets/MATERIAL/1K-JPG/`

Each material provides: Color, NormalGL, Roughness, (some) Metalness, Displacement

| Surface | Current texture | Proposed AmbientCG replacement |
|---------|----------------|-------------------------------|
| Floor | `tile_floor_*` | `Tiles0XX` — black & white grimy kitchen tiles |
| Lower walls (backsplash) | `tile_wall_*` | `Tiles0XX` — subway tile or small square tile |
| Upper walls | `concrete_*` | `Concrete0XX` or `PaintedPlaster0XX` — stained/grimy |
| Ceiling | `concrete_*` | `PaintedPlaster0XX` — water-stained plaster |
| Grime decals | `grime_drip_*`, `grime_base_*` | Keep current or supplement with AmbientCG `Leaking0XX` decals |
| Trap door | N/A | `Metal0XX` — brushed/scratched industrial steel |

Exact material IDs to be selected during implementation by visual inspection of the AmbientCG library.

## 5. Code Changes Summary

| File | Change |
|------|--------|
| `src/engine/FurnitureLayout.ts` | **NEW** — target definitions, placement rules, resolver |
| `src/components/kitchen/FurnitureLoader.tsx` | **NEW** — loads GLB segments, positions by targets |
| `src/components/kitchen/KitchenEnvironment.tsx` | **MODIFY** — remove `KitchenModel` (~100 lines), keep room enclosure + lighting + grime, add `FurnitureLoader`, swap texture paths |
| `src/components/GameWorld.tsx` | **MODIFY** — `STATION_TRIGGERS` derived from targets, `ProximityTrigger` uses target radii |
| `src/components/kitchen/GrinderStation.tsx` | **MODIFY** — `GRINDER_POS` from target |
| `src/components/kitchen/StufferStation.tsx` | **MODIFY** — `STUFFER_POS` from target |
| `src/components/kitchen/StoveStation.tsx` | **MODIFY** — `STOVE_POS` from target |
| `src/components/kitchen/FridgeStation.tsx` | **MODIFY** — `FRIDGE_POS` from target |
| `src/components/kitchen/CrtTelevision.tsx` | **MODIFY** — default position from target |
| `public/models/` | **ADD** ~10 small GLBs, **REMOVE** `kitchen.glb` + `kitchen-original.glb` |
| `public/textures/` | **ADD/REPLACE** AmbientCG textures for floor/walls/ceiling/trap door |

## 6. What Gets Deleted

- `KitchenModel` component (monolithic GLB loader + material overrides) — ~100 lines
- `public/models/kitchen.glb` (15MB monolith)
- `public/models/kitchen-original.glb` (backup)
- All hardcoded `*_POS` constants in station components
- Hardcoded `STATION_TRIGGERS` array in GameWorld.tsx

## 7. Migration Path

1. Build `FurnitureLayout.ts` with target system
2. Export GLB segments from kitchen-scene.blend (Blender)
3. Build `FurnitureLoader.tsx` component
4. Wire up station components to use targets
5. Swap textures to AmbientCG
6. Add trap door (model + placement)
7. Remove monolithic kitchen.glb and KitchenModel
8. Verify all 256 tests pass + E2E playthrough
