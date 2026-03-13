---
title: 3D Rendering & Scene System
domain: core
status: current
last-verified: 2026-03-13
depends-on: [architecture, state-management]
agent-context: scene-architect
summary: "R3F setup, procedural stations, camera rail, sausage physics — greenfield rebuild"
---

# 3D Rendering & Scene System

## Engine Setup

The 3D scene is rendered via React Three Fiber (R3F), a React reconciler for Three.js. The `<Canvas>` is created in `GameWorld.tsx`:

- **R3F** provides the declarative scene graph
- **@react-three/drei** for helpers (useGLTF, etc.)
- **@react-three/rapier** for sausage bone-chain physics
- **Canvas sizing:** Fills parent container via R3F's built-in resize handling

### Lighting

Lighting is set up within the scene:

| Light | Type | Purpose |
|-------|------|---------|
| ambientLight | Ambient | Dim ambient fill |
| hemiLight | Hemisphere | Main fluorescent tone |
| pointLights | Point | Fluorescent tube fixtures (with flicker) |

Fluorescent tube lights have procedural flicker animation via `useFrame`:
- Random tube selected every 3–8 seconds
- Flicker duration: 0.1–0.4 seconds

## Kitchen Environment

### GLB Model

`kitchen.glb` (Git LFS, 15.5 MB) loaded via `useGLTF`:

```tsx
const { scene } = useGLTF('/models/kitchen.glb');
return <primitive object={scene} />;
```

**Note:** `Kitchen.tsx` is currently a **stub** — returns an empty fragment. The GLB loading needs to be wired up.

French material names from the original SketchFab model:
- `blancblanc` = white, `bois` = wood, `fer` = iron, `nwar` = black
- `noircarreaux` = black tiles, `gris` = grey, `blanccarreaux` = white tiles
- `blancemission` = emissive (lamps), `VERRE` = glass

### Room Enclosure (BasementRoom.tsx)

Procedural room from R3F mesh primitives:
- Floor, ceiling, 4 walls with PBR textures
- Grime decals (transparent PBR planes)

### PBR Materials

```tsx
<meshStandardMaterial
  map={colorTexture}
  normalMap={normalTexture}
  roughnessMap={roughnessTexture}
/>
```

## Station Components (`src/components/stations/`)

Each station is a self-contained R3F component. No ECS orchestrators — stations own their own geometry, physics, and game logic. Animation runs in `useFrame` hooks. State flows through the Zustand store.

### Grinder.tsx
- Procedural grinder body, hopper, crank arm
- Crank rotation driven by drag interaction
- InstancedMesh particle system (300 max) for ground meat output
- Writes to `groundMeatVol` in store

### Stuffer.tsx
- Plunger, casing tube
- Casing extrusion via SquigglyCurve + QuadraticBezierCurve3
- Hold-to-fill with pressure management
- Writes to `stuffLevel` in store

### Stove.tsx
- Stove body, burner rings, pan
- **FBO grease wave simulation** — ping-pong heightfield shader (256×256, damping 0.98)
- Heat control with temperature targeting
- Writes to `cookLevel` in store

### ChoppingBlock.tsx
- Knife gesture mechanics
- Timing-based cutting interaction

### BlowoutStation.tsx
- TieGesture swipe-to-tie mechanic (separate component in `challenges/TieGesture.tsx`)
- Blowout risk visualization

### TV.tsx
- TV housing mesh with screen
- Embeds `<MrSausage3D />` as child
- **Note:** No CRT shader — uses basic materials. CrtShader.ts from main not ported.

### Sink.tsx
- Cleanup station between rounds
- Procedural geometry

### ChestFreezer.tsx
- Basic geometry for ingredient selection station
- **STUB** — no interactivity, no picking logic

### PhysicsFreezerChest.tsx
- Physics-enabled chest freezer variant
- **PARTIAL** — geometry exists but selection logic not wired

## Camera System (`src/components/camera/`)

### CameraRail.tsx

Smooth camera interpolation between station viewpoints:
- Duration: ~2.5 seconds
- Easing: Ease-in-out
- Position and lookAt target both interpolated
- Runs in `useFrame`

### IntroSequence.tsx

Opening camera tour of the kitchen on game start.

### FirstPersonControls.tsx

Limited look-around within a station's view area. Pointer-based on desktop, touch on mobile.

### PlayerHands.tsx

First-person hand rendering visible in the camera view.

## Sausage Physics (`src/components/sausage/`)

### Sausage.tsx

SkinnedMesh with Rapier rigid bodies per bone segment:
- Spring forces (K=80, damp=10) tie physics bodies to visual bones
- Custom `useFrame` hook applies forces each frame
- Collider radius: ~0.15 (prevents overlap explosions at 0.8 bone spacing)

### SausageGeometry.ts

Procedural tube geometry:
- `SausageCurve` — Main sausage body curve
- `SausageLinksCurve` — Segmented link curves
- `generateMeatTexture(colorHex, fatRatio)` — Canvas API texture generation

## MrSausage3D (Procedural Character)

All geometry is declarative R3F JSX — no external model files:
- **Head:** sphereGeometry (radius 1.8)
- **Mustache:** Wavy torus knot
- **Sunglasses:** Paired tori
- **Chef hat:** Stacked cones
- **Self-lit:** `<meshBasicMaterial />` (unlit)

9 reaction animations controlled by `reaction` prop, driven by challenge events.

## Diegetic UI (SurrealText.tsx)

In-world text meshes positioned in the 3D scene:
- Instructions, timer displays, Mr. Sausage's demands
- Replaces traditional floating HUD elements
- Source: `src/components/environment/SurrealText.tsx`

## Common Pitfalls

1. **useGLTF mocking in tests:** `useGLTF` must be mocked in Jest — depends on file loading unavailable in Node.js.
2. **Stale closures in useFrame:** Use `useRef` for values read inside `useFrame` callbacks. React state would be stale.
3. **sphereGeometry radius vs diameter:** Three.js takes radius, not diameter.
4. **Camera inside mesh:** Camera needs ≥0.5 units from any solid mesh.
5. **Three.js ESM in Jest:** `three` and `@react-three` must be in `transformIgnorePatterns` allowlist.
6. **Physics collider overlap explosions:** Rapier rigid body colliders overlapping at init causes violent repulsion. Use radius ~0.15 for bone segments spaced 0.8 apart — visual mesh held by spring forces.
7. **Physics body singularity (NaN explosion):** Never init multiple rigid bodies at the same coordinate. Space initial positions along the curve path.
8. **Vertex displacement axis after rotateX:** After `geometry.rotateX(-Math.PI/2)` to lay a plane flat, vertical displacement becomes Y (not Z). Affects FBO heightfield shaders.
9. **Square PlaneGeometry in circular containers:** Corners protrude through circular containers. Fix by snapping vertices outside radius threshold inward.

## Planned Work

### CRT Shader
- Port CrtShader.ts (TSL NodeMaterial) from main branch
- Chromatic aberration, scanlines, flicker on TV.tsx
- TSL compiles to WGSL (WebGPU) or GLSL (WebGL2 fallback)

### Kitchen.tsx
- Wire up GLB loading (currently returns empty fragment)
- Apply PBR materials from texture sets

### ChestFreezer Interactivity
- Add ingredient mesh picking (onClick handlers)
- Connect to ingredient selection flow

### Asset Strategy (On Hold)
- 750+ PSX GLBs available in asset library
- 179 low-poly kitchen GLBs (food with cook states)
- Hybrid extraction for mega GLBs
- See `docs/plans/2026-03-10-asset-inventory.md` for inventory
