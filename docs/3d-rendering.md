---
title: 3D Rendering & Scene System
domain: core
status: current
last-verified: 2026-03-13
depends-on: [architecture, state-management]
agent-context: scene-architect
summary: R3F setup, materials, lighting, cameras, stations
---

# 3D Rendering & Scene System

## Engine Setup

The 3D scene is rendered via React Three Fiber (R3F), a React reconciler for Three.js. The `<Canvas>` component in `GameWorld.tsx` creates a `WebGPURenderer`:

```tsx
<Canvas
  gl={async (props) => {
    const renderer = new WebGPURenderer({
      canvas: props.canvas as HTMLCanvasElement,
    });
    await renderer.init();
    return renderer;
  }}
  camera={{ fov: 70, near: 0.1, far: 100 }}
>
  <XR store={xrStore}>
    <KitchenEnvironment />
    <CrtTelevision />
    {showFridge && <FridgeStation ... />}
    {showGrinder && <GrinderStation ... />}
    ...
  </XR>
</Canvas>
```

- **WebGPU** renderer via Three.js `WebGPURenderer` (imported from `'three/webgpu'`)
- **react-native-wgpu** provides a Dawn-based WebGPU surface on iOS/Android; browser WebGPU on web
- **@react-three/xr** wraps scene content for WebXR support (web only)
- **Metro resolver** maps bare `'three'` imports to `'three/webgpu'` on native platforms
- **Physics:** `@react-three/cannon` available for physics interactions
- **Canvas sizing:** Fills parent container via R3F's built-in resize handling

### Lighting Setup

Lighting is set up in `KitchenEnvironment.tsx`:

| Light | Type | Intensity | Purpose |
|-------|------|-----------|---------|
| ambientLight | Ambient | 0.15 | Dim ambient fill |
| hemiLight | Hemisphere | 0.6 | Main fluorescent tone |
| tubeLight0-2 | Point | 2.0 | Fluorescent tube fixtures (with flicker) |

Fluorescent tube lights have procedural flicker animation via `useFrame`:
- Random tube selected every 3–8 seconds
- Flicker duration: 0.1–0.4 seconds
- Flicker pattern: `sin(time * 60) > 0 ? 0.4 : 2.0`

## Kitchen Environment (KitchenEnvironment.tsx)

### GLB Model

`kitchen.glb` (15.5 MB) is loaded via `useGLTF` from `@react-three/drei`:

```tsx
const { scene } = useGLTF('/models/kitchen.glb');
return <primitive object={scene} />;
```

The GLB contains:
- Baked AmbientCG PBR textures (via Blender Python script)
- French material names from the original SketchFab model:
  - `blancblanc` = white (appliances)
  - `bois` = wood (chairs/counters)
  - `fer` = iron (handles/hardware)
  - `nwar` = noir/black
  - `noircarreaux` = black tiles
  - `gris` = grey (appliance parts)
  - `blanccarreaux` = white tiles
  - `blancemission` = emissive (lamp meshes only)
  - `VERRE` = glass

### Room Enclosure

Procedural room constructed from R3F mesh primitives:
- **Floor:** 13×13 plane with checkered tile texture
- **Ceiling:** 13×13 plane (rotated)
- **4 Walls:** Planes with PBR textures (subway tile lower, concrete upper)

### Grime Decals

Transparent PBR planes offset 0.02–0.03 units from walls:
- **Drip decals** (Leaking003): 4 placements on different walls
- **Baseboard mold** (Leaking008): 4 placements along floor line

### PBR Materials

Materials use Three.js `meshStandardMaterial` with texture maps:

```tsx
<meshStandardMaterial
  map={colorTexture}
  normalMap={normalTexture}
  roughnessMap={roughnessTexture}
  aoMap={aoTexture}
/>
```

### IBL (Image-Based Lighting)

`environment.env` provides ambient reflections for PBR surfaces. Without it, standard materials lack indirect lighting contribution.

## Station Components

Each station is a declarative R3F component using `<mesh>` primitives. Animation runs in `useFrame` hooks. Props come from the Zustand store (passed through GameWorld).

### FridgeStation.tsx

- Fridge body, door (pivoted open), interior light, 3 shelves
- Ingredient meshes: shape-based (via `Ingredient3D` component) with `meshBasicMaterial` (self-lit)
- **Interactions:** `onClick` prop on mesh elements for ingredient selection
- Selected items slide forward on Z, hint-matching items pulse emissive

### GrinderStation.tsx

- Grinder body, hopper, crank arm
- Crank rotation driven by `challengeProgress` via `useFrame`
- Meat chunk meshes fed through hopper
- Splatter particle effect on strike

### StufferStation.tsx

- Plunger, casing tube
- Casing length grows with fill level
- `pressureToColor(pressure)` — exported pure function for green → yellow → red interpolation
- Burst particle spray and flash on pressure overflow

### StoveStation.tsx

- Stove body, burner rings, pan
- Burner glow intensity follows heat level via `useFrame`
- `sausageColor(progress)` — exported pure function for raw → cooked color progression
- Sizzle/smoke particle systems

### CrtTelevision.tsx

- TV housing mesh with screen plane
- Screen uses TSL `NodeMaterial` from `CrtShader.ts` (chromatic aberration + scanlines, compiles to WGSL/GLSL)
- Embeds `<MrSausage3D />` as child, rendered on the TV screen
- `reaction` prop drives Mr. Sausage's expression

## Camera System

5 fixed station cameras + 1 menu camera, defined in `GameWorld.tsx`:

```typescript
const STATION_CAMERAS = [
  { position: [-2, 1.6, -3], lookAt: [-5, 1.2, -4.5] },  // 0: Fridge
  { position: [-1, 1.6, 0],  lookAt: [-4, 1.4, 0] },      // 1: Grinder
  { position: [0, 1.6, 1],   lookAt: [3, 1.2, 2] },        // 2: Stuffer
  { position: [0, 1.6, 0],   lookAt: [2.5, 2.0, 1.5] },    // 3: Stove
  { position: [-1, 1.6, -1], lookAt: [0, 2.5, -5.5] },     // 4: Tasting/CRT
];
```

- All positions use `y = 1.6` (standing eye height)
- Camera managed by `CameraWalker` component inside the Canvas
- `fov = 70` (~70° for first-person feel)
- `near = 0.1` (close clipping for tight spaces)

### CameraWalker Component

On challenge transition, smoothly interpolates camera from current to next station:
- Duration: ~2.5 seconds
- Easing: Quadratic ease-in-out (`easeInOutQuad`)
- Both `camera.position` and lookAt target are lerped
- Runs in `useFrame`, cleans up on completion

## MrSausage3D (Procedural Character)

All geometry is declarative R3F JSX — no external model files:
- **Head:** `<sphereGeometry args={[1.8, 24, 24]} />` (radius 1.8)
- **Mustache:** Wavy torus knot
- **Sunglasses:** Paired tori
- **Chef hat:** Stacked cones
- **Self-lit:** All parts use `<meshBasicMaterial />` (unlit, always visible regardless of scene lighting)

9 reaction animations controlled by the `reaction` prop, driven by challenge events. Animation runs in `useFrame`.

## Ingredient3D

8 shape types rendered as declarative mesh JSX:
- sphere, box, cylinder, cone, torus, elongated, wedge, ring
- All use `<meshBasicMaterial />` (self-lit) with ingredient-specific colors
- `onClick` handler for selection interaction

## CRT Shader (CrtShader.ts)

TSL (Three Shading Language) `NodeMaterial` — compiles to WGSL for WebGPU or GLSL for WebGL2 fallback:
- Built with TSL node functions (`Fn`, `uv`, `sin`, `mix`, etc.) imported from `'three/tsl'`
- Effects: barrel distortion, horizontal roll/tear, phosphor glow, scanlines, RGB sub-pixel pattern, chromatic aberration, flicker, static noise, interlace shimmer, vignette, edge bloom, warm color grading
- Uniforms: `time`, `flickerIntensity`, `staticIntensity`, `reactionIntensity` (exported as `crtUniforms`, updated per-frame by `CrtTelevision.tsx`)
- Factory: `createCrtMaterial(name)` returns a ready-to-use `NodeMaterial`

**Note:** Raw GLSL `ShaderMaterial` is not compatible with the WebGPU renderer. All custom shaders must use TSL `NodeMaterial`.

## Texture Bake Pipeline

The kitchen GLB's PBR textures were baked using a Blender Python script (`bake_kitchen_textures.py`):

1. Import `kitchen-original.glb` into Blender
2. For each material, map to an AmbientCG texture set
3. Export as `kitchen.glb` with Draco mesh compression (level 6) + JPEG (quality 80)

Source textures: AmbientCG 1K-JPG sets (not in repo, downloaded separately per material).

## Common Pitfalls

1. **useGLTF mocking in tests:** `useGLTF` must be mocked in Jest tests — it depends on file loading unavailable in Node.js.
2. **Stale closures in useFrame:** Use `useRef` for values read inside `useFrame` callbacks. React state would be stale.
3. **sphereGeometry radius vs diameter:** Three.js sphereGeometry takes radius, not diameter (unlike Babylon.js).
4. **Camera inside mesh:** Check STATION_CAMERAS values. Camera needs ≥0.5 units from any solid mesh.
5. **import.meta compatibility:** Zustand ESM uses `import.meta.env.MODE`. Requires `unstable_transformImportMeta: true` in babel config.
6. **Three.js ESM in Jest:** `three` and `@react-three` must be in the `transformIgnorePatterns` allowlist in jest.config.js.
7. **GLSL ShaderMaterial with WebGPU:** The WebGPU renderer does not support raw GLSL `ShaderMaterial`. Use TSL `NodeMaterial` instead — import node functions from `'three/tsl'` and `NodeMaterial` from `'three/webgpu'`.
8. **Metro WebGPU resolver:** On native, bare `'three'` imports are remapped to `'three/webgpu'` by `metro.config.js`. Direct `'three/webgpu'` imports work on all platforms.

## Planned Work

### Asset Strategy (On Hold)
- 750+ PSX GLBs available in `/Volumes/home/assets/3DPSX/` (~110 MB total)
- 179 low-poly kitchen GLBs in `/Volumes/home/assets/3DLowPoly/` (food with cook states, furniture, utensils)
- Hybrid extraction approach for mega GLBs: load once via `useGLTF`, access individual nodes by name, clone sub-trees
- 1,945 AmbientCG PBR material sets available (rust, concrete, metal, tiles critical for horror kitchen)
- 15 "Leaking" blood decal variants with opacity maps for stain overlays
- `pending-integration/` has Misc.glb (57 objects), Traps.glb (21 objects), kitchen tools FBX (needs conversion)
- See `docs/plans/2026-03-10-asset-inventory.md` for full inventory

### GLB Asset Swap Plan
- Replace bloated furniture GLBs (43MB total) with tiny Quaternius/Styloo alternatives (2-30KB each)
- Target: ~45MB down to ~700KB total GLB budget
- Procedural sausage SkinnedMesh replaces sausage.glb
- Keep lightweight models: fridge.glb (120KB), meat_grinder.glb (168KB), frying_pan.glb (32KB)
- See `docs/plans/2026-03-01-sausage-factory-kitchen-design.md` Section 2 for full swap table

### Procedural Factory Visuals
- Grease FBO simulation: wave equation shader on RenderTarget (GLSL -> TSL conversion needed for WebGPU)
- Procedural meat textures via `generateMeatTexture(colorHex, fatRatio)` using Canvas API
- Sausage bone-chain SkinnedMesh with Rapier physics bodies per bone
- Steam/smoke particle systems using InstancedMesh
- See `docs/plans/2026-03-01-sausage-factory-kitchen-design.md` Sections 6.2-6.4

### Room Architecture Reference
- Coordinate system: origin at floor center, +X right, -Z back wall (CRT TV), +Y up
- Room size derives from viewport aspect ratio via `computeRoom(aspect)` — floor area stays ~169 sq units
- All furniture uses proportional fractions of room dimensions for responsive layout
- See `docs/plans/2026-03-01-room-architecture.md` for definitive spatial reference
