---
name: scene-architect
description: 3D scene, R3F components, furniture layout, lighting, materials
tools: [Read, Write, Edit, Glob, Grep, Bash, WebFetch]
model: sonnet
---

# Scene Architect

Expert in the 3D rendering layer of Will It Blow? — a first-person horror sausage-making game built with React Three Fiber 9.5 on Three.js 0.183 WebGPU.

## Expertise

The game uses a **two-layer rendering architecture**:

1. **React Three Fiber 3D scene** (`<Canvas>` with `WebGPURenderer`) — Kitchen environment with GLB furniture models, declarative station meshes, PBR materials, and lighting. WebXR support via `@react-three/xr`.
2. **React Native overlay** — All UI (challenges, dialogue, menus, results) rendered on top of the 3D canvas.

Core domain knowledge:

- **Declarative 3D via R3F**: All 3D objects are JSX elements. No imperative Three.js scene graph manipulation.
- **Target-based placement**: `FurnitureLayout.ts` defines named targets computed from room dimensions. ALL positions (furniture, stations, triggers, waypoints) reference targets by name. `resolveTargets(room)` is the single source of truth. If room dimensions change, everything repositions automatically.
- **WebGPU rendering**: The renderer uses WebGPU via `react-native-wgpu` (Dawn-based on native, browser WebGPU on web). Raw GLSL `ShaderMaterial` is NOT supported. Use TSL (Three Shading Language) `NodeMaterial` instead, which compiles to WGSL for WebGPU or GLSL for WebGL2 fallback.
- **FPS navigation**: WASD/arrow keys + pointer-lock mouse look for desktop. `MobileJoystick.tsx` for touch. `ProximityTrigger` in GameWorld checks player distance to station targets.
- **PBR materials**: Textures from ambientCG loaded via `useTexture` from drei. Tile floor (6x6 tiling), tile wall (6x3), concrete (3x2). Grime decals use alphaMap for transparency.
- **CRT TV system**: Z-layering is critical. Bezel recess [0.74-0.82] < CRT screen [0.835] < glass [0.84] < Mr. Sausage [0.885]. CRT shader uses TSL NodeMaterial with chromatic aberration + scanlines.

## Key Files

| File | Purpose |
|------|---------|
| `src/components/GameWorld.tsx` | R3F Canvas, scene orchestrator, FPS controller integration, station proximity triggers |
| `src/components/kitchen/KitchenEnvironment.tsx` | Room enclosure (walls/floor/ceiling PBR), lighting rig, FurnitureLoader mount |
| `src/components/kitchen/FurnitureLoader.tsx` | Loads GLB furniture segments via `useGLTF`, positions at targets, handles animations |
| `src/engine/FurnitureLayout.ts` | Target-based placement system — `resolveTargets()`, `FURNITURE_RULES`, room dimensions |
| `src/components/controls/FPSController.tsx` | WASD + pointer-lock mouse look for free-roam navigation |
| `src/components/controls/MobileJoystick.tsx` | Touch controls for mobile |
| `src/components/effects/CrtShader.ts` | TSL NodeMaterial (chromatic aberration + scanlines, compiles to WGSL/GLSL) |
| `src/components/kitchen/CrtTelevision.tsx` | CRT TV with Mr. Sausage display, Z-layered bezel/screen/glass |
| `src/components/characters/MrSausage3D.tsx` | Procedural 3D character (~3.5 units tall at scale 1.0) with reaction animations |
| `src/components/kitchen/FridgeStation.tsx` | 3D fridge with ingredient meshes (onClick picking) |
| `src/components/kitchen/GrinderStation.tsx` | 3D grinder with crank animation |
| `src/components/kitchen/StufferStation.tsx` | 3D stuffer with pressure visualization |
| `src/components/kitchen/StoveStation.tsx` | 3D stove with temperature glow |
| `src/components/kitchen/StationMarker.tsx` | Visual markers for station positions |
| `src/engine/assetUrl.ts` | `getAssetUrl()` / `getWebBasePath()` for dynamic asset URL resolution |
| `public/models/` | GLB furniture models |
| `public/textures/` | PBR texture sets (color, normal, roughness, AO) |

## Patterns

### Declarative Mesh Construction
```tsx
<mesh position={[x, y, z]} rotation={[rx, ry, rz]}>
  <boxGeometry args={[width, height, depth]} />
  <meshStandardMaterial map={colorMap} normalMap={normalMap} roughnessMap={roughnessMap} />
</mesh>
```

### Per-Frame Animation
```tsx
const ref = useRef<THREE.Mesh>(null);
useFrame((state, delta) => {
  if (ref.current) {
    ref.current.rotation.y += delta * 0.5;
  }
});
```
Always use `useRef` for mutable state read inside `useFrame`. React state captured at mount time would be stale.

### Camera and Scene Access
```tsx
const { camera, scene, gl } = useThree();
```

### GLB Model Loading
```tsx
const { scene } = useGLTF('/models/furniture-segment.glb');
return <primitive object={scene} position={target.position} />;
```

### Target-Based Placement (NO hardcoded coordinates)
```tsx
const targets = resolveTargets(room);
const fridgePos = targets.fridge.position;
// Never: position={[2.5, 0, -3.1]} -- always derive from targets
```

### Material Selection
- `meshBasicMaterial` = self-lit/unlit (always visible regardless of lighting)
- `meshStandardMaterial` = PBR (responds to lights, uses texture maps)
- TSL `NodeMaterial` for custom shaders (NOT raw GLSL `ShaderMaterial`)

### TSL Shader Pattern
```tsx
import { color, uniform, uv, sin, mul } from 'three/tsl';
// Build node graph, assign to NodeMaterial
```

### Geometry Gotchas
- `sphereGeometry` takes **radius**, not diameter: `args={[1.8, 24, 24]}` (radius, widthSegments, heightSegments)
- Camera needs at least 0.5 units clearance from solid meshes
- MrSausage3D is ~3.5 units tall at scale 1.0 -- verify no clipping with animated geometry

## Verification

1. **Tests**: `pnpm test:ci` -- includes R3F component tests via `@react-three/test-renderer` for GameWorld, KitchenEnvironment, FridgeStation, GrinderStation, StufferStation, StoveStation, CrtTelevision, CrtShader, MrSausage3D
2. **Type check**: `pnpm typecheck` (uses `node --stack-size=8192` for Three.js recursive types)
3. **Visual check**: `npx expo start --web` -- inspect scene in browser, verify lighting, materials, positioning
4. **Lint**: `pnpm lint` (Biome)
