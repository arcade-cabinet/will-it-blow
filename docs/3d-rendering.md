# 3D Rendering & Scene System

## Engine Setup

The Babylon.js engine is mounted via reactylon's `<Engine>` and `<Scene>` JSX components in `GameWorld.web.tsx`:

```tsx
<Engine engineOptions={{ preserveDrawingBuffer: true, stencil: true, antialias: true }}
        style={{ width: '100%', height: '100%' }}>
  <Scene onSceneReady={onSceneReady}>
    <KitchenEnvironment />
    <CrtTelevision />
    {showFridge && <FridgeStation ... />}
    {showGrinder && <GrinderStation ... />}
    ...
  </Scene>
</Engine>
```

- **WebGPU** is the primary renderer (Babylon.js 8.53 detects and uses it automatically)
- **WebGL** is the fallback for browsers without WebGPU support
- **Physics:** cannon-es via `CannonJSPlugin`, gravity at -9.81 m/s²
- **Canvas sizing:** CSS `100vw × 100vh`, `engine.resize()` on window resize events

### Light Budget

WebGPU uniform buffers limit simultaneous lights per material. We stay within budget:

| Light | Type | Intensity | Purpose |
|-------|------|-----------|---------|
| ambientLight | Hemispheric | 0.15 | Dim ambient fill (GameWorld) |
| hemiLight | Hemispheric | 0.6 | Main fluorescent tone (KitchenEnvironment) |
| centerFill | Point | 0.8 | Mid-room wall illumination |
| tubeLight0 | Point | 2.0 | Fluorescent tube fixture |
| tubeLight1 | Point | 2.0 | Fluorescent tube fixture |
| tubeLight2 | Point | 2.0 | Fluorescent tube fixture |

**Total: 6 lights.** All PBR materials set `maxSimultaneousLights = 4` to limit uniform buffer size.

## Kitchen Environment (KitchenEnvironment.tsx)

### Room Enclosure

Procedural room constructed from planes and grounds:
- **Floor:** 13×13 ground with checkered tile PBR
- **Ceiling:** 13×13 ground (flipped via `rotation.x = PI`)
- **4 Walls:** Each wall is TWO stacked planes:
  - Lower: subway tile (0 → 2.4m height) with AO map
  - Upper: cracked concrete (2.4m → 5.5m)
  - Both use `DOUBLESIDE` + `backFaceCulling = false` + `twoSidedLighting = true`

### PBR Material Pipeline

Materials use AmbientCG texture sets with the `makePBR()` helper:

```text
albedoTexture   ← Color map (JPG)
bumpTexture     ← NormalGL map (JPG)
metallicTexture ← Roughness map (JPG, read from Green channel)
ambientTexture  ← AO map (JPG, optional)
```

Key settings:
- `useRoughnessFromMetallicTextureGreen = true` (grayscale roughness in G channel)
- `useRoughnessFromMetallicTextureAlpha = false` (JPGs have no alpha)
- `metallic = 0` (multiplier: zeroes out metallic read)
- `roughness = 1` (multiplier: preserves roughness texture values)

### IBL (Image-Based Lighting)

`environment.env` is a prefiltered cubemap loaded at scene init. Required for PBR indirect lighting — without it, all PBR surfaces render nearly black (no reflection/ambient contribution).

- `scene.environmentIntensity = 0.5` (global)
- Per-material overrides: floor `0.1`, ceiling `0.3`, GLB materials `0.05`

### Kitchen GLB Model

`kitchen.glb` (15.5 MB) is loaded via `SceneLoader.ImportMeshAsync`. It contains:
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

**Material overrides** are applied after load to control brightness under scene lighting:

```typescript
const brightMaterialOverrides = {
  blancblanc:    { albedo: [0.28, 0.27, 0.24], directI: 0.3 },
  blanccarreaux: { albedo: [0.30, 0.28, 0.24], directI: 0.4 },
  blancemission: { albedo: [0.25, 0.24, 0.20], directI: 0.25, killEmissive: true },
};
```

All PBR materials get `environmentIntensity = 0.05` and `directIntensity = 0.5`.

### Grime Decals

Transparent PBR planes offset 0.02–0.03 units from walls:
- **Drip decals** (Leaking003): 4 placements on different walls
- **Baseboard mold** (Leaking008): 4 placements along floor line

Use `ALPHA_BLEND` (not `ALPHA_TEST`) for soft gradient edges. Rendered after opaque geometry (`alphaIndex = 10`).

### Fluorescent Tube Flicker

3 tube lights with procedural flicker animation in `onBeforeRenderObservable`:
- Random tube selected every 3–8 seconds
- Flicker duration: 0.1–0.4 seconds
- Flicker pattern: `sin(time * 60) > 0 ? 0.4 : 2.0`

## Station Components

Each station creates procedural `StandardMaterial` meshes in a `useEffect` that depends on `[scene, ...]`. All meshes and materials are tracked in arrays and disposed on cleanup.

### FridgeStation.tsx

- **Fridge body:** Box (1.5 × 3 × 1) at position [-5, 1.5, -4]
- **Door:** Box (1.5 × 3 × 0.08) pivoted 90° open
- **Interior light:** Emissive plane (dim sickly blue glow)
- **3 shelves:** Thin boxes
- **Ingredient meshes:** Shape-based (sphere, box, cylinder, cone, elongated) with self-lit emissive materials
- **Interactions:** ActionManager + OnPickTrigger for ingredient selection
- **Animations:** Selected items slide forward on Z, hint-matching items pulse emissive

**Important:** The procedural fridge body renders ON TOP of the GLB's fridge model. The GLB `blancblanc` material is occluded by these procedural meshes. Material colors are set dark (diffuseColor ~0.18) to avoid blown-out white under heavy scene lighting.

### GrinderStation.tsx

- Grinder body, hopper, crank arm
- Crank rotation driven by `challengeProgress` via store
- Splatter particle effect on strike

### StufferStation.tsx

- Plunger, casing tube
- Casing length grows with fill level
- Pressure-to-color interpolation (green → yellow → red)
- Burst particle spray and flash on pressure overflow

### StoveStation.tsx

- Stove body, burner rings, pan
- Burner glow intensity follows heat level
- Sausage mesh in pan

### CrtTelevision.tsx

- TV body mesh with screen plane
- Renders Mr. Sausage's face via the CRT shader
- Chromatic aberration + scanline post-process effect
- `reaction` prop drives Mr. Sausage's expression

## Camera System

5 fixed station cameras + 1 menu camera, defined in `GameWorld.web.tsx`:

```typescript
const STATION_CAMERAS = [
  { position: [0, 1.6, 0],   lookAt: [-3, 1.4, -3] },   // 0: Fridge
  { position: [-1, 1.6, 0],  lookAt: [-4, 1.4, 0] },     // 1: Grinder
  { position: [0, 1.6, 1],   lookAt: [3, 1.2, 2] },      // 2: Stuffer
  { position: [0, 1.6, 0],   lookAt: [2.5, 2.0, 1.5] },  // 3: Stove
  { position: [-1, 1.6, -1], lookAt: [0, 2.5, -5.5] },   // 4: Tasting/CRT
];
```

- All positions use `y = 1.6` (standing eye height)
- Camera type: `FreeCamera` with keyboard input disabled (no WASD)
- `fov = 1.2` (~70° for first-person feel)
- `minZ = 0.1` (close clipping for tight spaces)

### Camera Walk Animation

On challenge transition, the camera smoothly interpolates from current position to next station:
- Duration: ~2.5 seconds (`t += dt * 0.4`)
- Easing: Quadratic ease-in-out
- Both position and lookAt target are lerped
- Runs in `onBeforeRenderObservable`, cleaned up on completion

## MrSausage3D (Procedural Character)

All geometry is created programmatically — no external model files:
- **Head:** Sphere (diameter 3.6)
- **Mustache:** Wavy torus knot
- **Sunglasses:** Paired tori
- **Chef hat:** Stacked cones
- **Self-lit:** All materials use `disableLighting: true` + `emissiveColor`

9 reaction animations controlled by the `reaction` prop, driven by challenge events.

## Common Pitfalls

1. **Babylon ESM in Jest:** Cannot import `@babylonjs/core` in test files. Only test pure logic modules.
2. **Stale closures in render loops:** Use `useRef` for values read inside `onBeforeRenderObservable` callbacks. React state would be stale.
3. **Canvas.width mutation kills WebGPU:** Never set `canvas.width` or `canvas.height` directly — this invalidates the WebGPU swap chain. Only set CSS size and call `engine.resize()`.
4. **PBR nearly black without IBL:** If `scene.environmentTexture` is null, PBR materials render almost entirely black (no indirect light contribution).
5. **Light accumulation on StandardMaterial:** With 6 lights totaling ~7× intensity, `diffuseColor` values above 0.15 will clip to white on directly-lit surfaces.
6. **Double geometry:** Station components create procedural meshes at the same positions as GLB model meshes. The procedural geometry occludes the GLB textures. If you want to see the GLB textures, hide or remove the procedural station meshes.

## Texture Bake Pipeline

The kitchen GLB's PBR textures were baked using a Blender Python script (`bake_kitchen_textures.py`):

1. Import `kitchen-original.glb` into Blender
2. For each material, map to an AmbientCG texture set:
   - Color, NormalGL, Roughness, Metalness maps
   - UV scale tuned per material
   - Color tint multiplier for horror atmosphere
3. Export as `kitchen.glb` with:
   - Draco mesh compression (level 6)
   - JPEG image format (quality 80)
   - Applied transforms

Source textures: AmbientCG 1K-JPG sets (not in repo, downloaded separately per material).
