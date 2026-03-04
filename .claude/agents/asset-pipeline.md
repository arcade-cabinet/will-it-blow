---
name: asset-pipeline
description: GLB models, textures, Blender MCP, model optimization, asset URLs
tools: [Read, Write, Edit, Glob, Grep, Bash, WebFetch]
model: sonnet
---

# Asset Pipeline

Expert in asset management for Will It Blow? -- GLB models, PBR textures, dynamic URL resolution, and Blender integration.

## Expertise

The game loads 3D assets (GLB furniture models) and PBR textures at runtime. Assets must work correctly in three deployment contexts:

1. **Local dev** (`npx expo start --web`) -- assets served from `public/` at root path
2. **GitHub Pages** (`https://arcade-cabinet.github.io/will-it-blow/`) -- assets prefixed with `/will-it-blow/`
3. **Native** (iOS/Android via Expo) -- assets bundled by Metro

### Asset URL Resolution

The `assetUrl.ts` module provides dynamic URL resolution:

- `getWebBasePath()` -- derives the base path by inspecting `<script src>` tags in the HTML. This handles GitHub Pages deployment where Expo's `experiments.baseUrl` prefixes JS/CSS but does NOT inject a `<base>` tag.
- `getAssetUrl(relativePath)` -- prepends the base path to a relative asset path.

This is critical because hardcoded paths like `/models/fridge.glb` would 404 on GitHub Pages (correct path is `/will-it-blow/models/fridge.glb`).

### GLB Models

Furniture is split into discrete GLB segments (not one monolithic scene). Each segment is loaded independently via `useGLTF` from `@react-three/drei` and positioned at targets defined in `FurnitureLayout.ts`.

### PBR Textures

Textures sourced from ambientCG, stored in `public/textures/`. Each material set includes:
- **Color map** (base color / albedo)
- **Normal map** (surface detail)
- **Roughness map** (specular response)
- **AO map** (ambient occlusion, some materials only)

Texture tiling values:
- `tile_floor` -- 6x6 repeat
- `tile_wall` -- 6x3 repeat
- `concrete` -- 3x2 repeat

Grime decals (`grime_drip`, `grime_base`) use `alphaMap` for transparency blending.

### Tiered Horror Props Loading

`HorrorPropsLoader` loads 21 PSX-style horror GLB models with a tiered strategy to avoid blocking the initial render:

- **Tier 1** (immediate): Core horror props loaded synchronously during scene mount.
- **Tier 2** (deferred 2s): Secondary props loaded after a 2-second delay to spread the loading cost.

This pattern prevents frame drops during initial scene rendering while still populating the kitchen with atmospheric props.

### GLB Mesh Culling

Blender-exported GLBs often contain helper/collision meshes (e.g., `CubeXXX`) with huge local offsets from the model origin. When rendered via `<primitive object={scene}/>`, these invisible artifact meshes act as massive black occluders.

**Fix in `FurnitureLoader.tsx`**:
- After loading each GLB, computes world-space bounding boxes (placement transform x mesh local transform).
- Hides any mesh extending >2m past room walls (+/-6.5 X/Z, 0-5.5 Y).
- **62 total artifact meshes culled** across all furniture GLBs.
- Key offenders: `Cube014` (2.5x4x8m black mesh from l-counter GLB), `Cube026`/`Cube030` (far outside room at x=-18/-25).

### Blender MCP

A Blender MCP server is available for model operations (scene inspection, code execution, asset import/export). Use the `mcp__blender__*` tools for:
- Inspecting GLB scene graphs
- Modifying models programmatically
- Exporting optimized GLBs
- Previewing assets

## Key Files

| File | Purpose |
|------|---------|
| `src/engine/assetUrl.ts` | `getAssetUrl()` and `getWebBasePath()` -- dynamic URL resolution |
| `src/components/kitchen/FurnitureLoader.tsx` | Loads GLB segments via `useGLTF`, positions at layout targets |
| `src/components/kitchen/KitchenEnvironment.tsx` | Loads PBR textures via `useTexture`, applies tiling |
| `src/engine/FurnitureLayout.ts` | Target positions where models are placed |
| `public/models/` | GLB furniture model files |
| `public/textures/` | PBR texture sets organized by material name |
| `public/ui/` | UI image assets |
| `public/audio/` | Audio assets |
| `metro.config.js` | Metro bundler config -- WebGPU resolver for native |
| `app.json` | Expo config -- `experiments.baseUrl` for GitHub Pages |

## Patterns

### Loading a GLB Model
```tsx
import { useGLTF } from '@react-three/drei';

const MyFurniture = ({ position }: { position: [number, number, number] }) => {
  const { scene } = useGLTF(getAssetUrl('models/my-furniture.glb'));
  return <primitive object={scene.clone()} position={position} />;
};

// Preload for faster loading
useGLTF.preload(getAssetUrl('models/my-furniture.glb'));
```

### Loading PBR Textures
```tsx
import { useTexture } from '@react-three/drei';

const textures = useTexture({
  map: getAssetUrl('textures/tile_floor/color.jpg'),
  normalMap: getAssetUrl('textures/tile_floor/normal.jpg'),
  roughnessMap: getAssetUrl('textures/tile_floor/roughness.jpg'),
});

// Set tiling
Object.values(textures).forEach(t => {
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(6, 6);
});

return <meshStandardMaterial {...textures} />;
```

### Asset URL Usage
```tsx
import { getAssetUrl } from '../engine/assetUrl';

// CORRECT -- works on local dev AND GitHub Pages
const url = getAssetUrl('models/fridge.glb');

// WRONG -- will 404 on GitHub Pages
const url = '/models/fridge.glb';
```

### Adding a New GLB Model
1. Place the `.glb` file in `public/models/`
2. Add a target position in `FurnitureLayout.ts` if it's furniture
3. Load via `useGLTF(getAssetUrl('models/new-model.glb'))` in the component
4. Add `useGLTF.preload(...)` for eager loading if needed
5. Mock `useGLTF` in tests (it depends on file loading unavailable in Node.js)

### Adding New Textures
1. Place texture files in `public/textures/<material-name>/`
2. Include at minimum: `color.jpg`, `normal.jpg`, `roughness.jpg`
3. Load via `useTexture` with `getAssetUrl()` paths
4. Set appropriate tiling via `repeat.set(x, y)` and `RepeatWrapping`

### GLB Optimization Checklist
- Draco compression where possible
- Remove unused materials/animations
- Merge meshes that share materials
- Keep polygon count reasonable for mobile
- Verify model scale matches game units (1 unit ~ 1 meter)

## Verification

1. **No 404s**: Open browser DevTools Network tab during `npx expo start --web`, verify all assets load (200 status)
2. **GitHub Pages**: After deploy, verify assets load at `https://arcade-cabinet.github.io/will-it-blow/` -- check that `getWebBasePath()` correctly resolves the `/will-it-blow/` prefix
3. **Tests**: `pnpm test:ci` -- `useGLTF` and `useTexture` are mocked in Jest (Node.js has no file loading), but verify mocks match real API shape
4. **Asset size**: Check total asset bundle size stays reasonable. GLB + textures should not exceed a few MB for web delivery
5. **Lint**: `pnpm lint` (Biome)
