# Development Guide

## Quick Start

```bash
# Install dependencies
npm install

# Start web dev server
npx expo start --web

# Run tests
npm test

# Type check (ignore Jest type warnings in __tests__/)
npx tsc --noEmit
```

## Project Conventions

### File Organization

- **Pure logic** goes in `src/engine/` — no React, no Babylon imports
- **3D components** go in `src/components/kitchen/` — Babylon.js mesh/material creation
- **UI overlays** go in `src/components/ui/` — React Native views
- **Challenge overlays** go in `src/components/challenges/` — game phase UX
- **Data** goes in `src/data/` — dialogue trees, challenge variants

### Challenge Component Pattern

Each challenge follows this structure:

```text
src/components/challenges/FooChallenge.tsx    ← React Native overlay (UI + game logic)
src/components/kitchen/FooStation.tsx          ← Babylon.js 3D visuals
src/data/dialogue/foo.ts                       ← Mr. Sausage dialogue for this phase
src/data/challenges/variants.ts                ← Variant config (shared file)
```

The challenge overlay:
1. Shows dialogue intro (DialogueOverlay)
2. Runs the main mechanic (progress bar, timer, touch handlers)
3. Writes to the store (setChallengeProgress, addStrike, etc.)
4. Calls `completeChallenge(score)` when done

The station component:
1. Creates 3D meshes in a `useEffect([scene, ...])`
2. Reads store state via props (passed from GameWorld)
3. Animates meshes in `onBeforeRenderObservable`
4. Disposes everything on cleanup

### 3D Scene Rules

1. **All meshes and materials must be tracked for disposal.** Push to a `disposables` or `allMeshes`/`allMaterials` array and dispose in the cleanup function.
2. **Use `useRef` for values read in render loops.** React state is stale inside `onBeforeRenderObservable` callbacks. Store current values in refs.
3. **Scene setup effects should depend on `[scene]` only** (plus stable props). Avoid dependencies that change frequently or the entire scene rebuilds.
4. **Self-lit materials** for non-physical objects: `disableLighting = true` + `emissiveColor`. Used for MrSausage3D, ingredient meshes, fluorescent tubes.
5. **PBR materials** for physical surfaces: Use `albedoTexture` + `bumpTexture` + `metallicTexture` (roughness in G channel).
6. **StandardMaterial `diffuseColor` must be very low** (0.15–0.20) because scene lights total ~7× intensity. Values above 0.3 will clip to white on directly-lit faces.

### UI Rules

1. **Font:** "Bangers" for all game text (loaded by Expo)
2. **Colors:** Dark backgrounds (#0a0a0a), red accents (#FF1744), gold highlights (#FFD700)
3. **Overlay pattern:** `StyleSheet.absoluteFillObject` + `pointerEvents="box-none"` — lets touches pass through to the 3D canvas
4. **Sub-phase pattern:** Use a local `SubPhase` type (e.g., `'dialogue' | 'selecting' | 'success' | 'complete'`) to manage multi-step UX within a single challenge
5. **TouchableOpacity:** Keep mounted across sub-phase changes to prevent `onPressIn`/`onPressOut` event loss

### Store Rules

1. **All shared game state lives in Zustand.** No React Context, no prop drilling for game data.
2. **Challenge ephemeral state** (progress, pressure, temperature) is written by overlays and read by 3D stations.
3. **Actions that reset state** (startNewGame, completeChallenge, returnToMenu) always reset ALL ephemeral fields to defaults.

## Adding a New Challenge

1. **Define the challenge** in `src/engine/ChallengeRegistry.ts`:
   - Add to `ChallengeId` union type
   - Add to `CHALLENGE_ORDER` array
   - Add config entry to `CHALLENGE_CONFIGS`

2. **Create variant data** in `src/data/challenges/variants.ts`:
   - Define variant type (e.g., `FooVariant`)
   - Create variants array (e.g., `FOO_VARIANTS`)
   - Add case to `pickVariant()` in ChallengeRegistry

3. **Write dialogue** in `src/data/dialogue/foo.ts`

4. **Create the challenge overlay** at `src/components/challenges/FooChallenge.tsx`:
   - Props: `onComplete: (score: number) => void`, `onReaction: (reaction: Reaction) => void`
   - Sub-phases: dialogue → main mechanic → success → complete
   - Call `onComplete(score)` when done

5. **Create the 3D station** at `src/components/kitchen/FooStation.tsx`:
   - Props: challenge-specific state (progress, etc.)
   - Create meshes in `useEffect([scene, ...])`
   - Animate in `onBeforeRenderObservable`
   - Dispose everything on cleanup

6. **Wire into GameWorld.web.tsx**:
   - Add camera position to `STATION_CAMERAS`
   - Add visibility flag: `const showFoo = gameStatus === 'playing' && currentChallenge === N`
   - Add station component in JSX
   - Update `TOTAL_CHALLENGES` in gameStore if needed

7. **Wire into App.tsx** (GameUI):
   - Add challenge flag: `const isFooChallenge = ...`
   - Add challenge overlay in JSX

8. **Add tests** for any pure logic in `__tests__/`

## Adding Store State

If a new challenge needs new ephemeral state:

1. Add field to `GameState` interface
2. Add default to `INITIAL_GAME_STATE`
3. Add setter action
4. Reset the field in `startNewGame()`, `completeChallenge()`, `returnToMenu()`, and `continueGame()`
5. Add tests in `__tests__/gameStore.test.ts`

## Common Pitfalls

### Babylon.js ESM in Jest
**Problem:** `import { Vector3 } from '@babylonjs/core'` fails in tests.
**Solution:** Only test pure logic modules. Never import Babylon or reactylon in test files.

### Stale closure in render loops
**Problem:** `onBeforeRenderObservable` callback captures state from mount time.
**Solution:** Use `useRef` and update `.current` on each render. Read from ref inside the callback.

### Canvas.width mutation
**Problem:** Setting `canvas.width = N` directly invalidates the WebGPU swap chain, causing a black screen.
**Solution:** Only set CSS dimensions (`canvas.style.width`). Call `engine.resize()` to sync.

### Camera inside mesh
**Problem:** Camera positioned inside or too close to a mesh → black screen.
**Solution:** Check STATION_CAMERAS values. Ensure camera is at least 0.5 units from any solid mesh.

### MrSausage3D overlap
**Problem:** Character's head sphere (diameter 3.6, extends ~3.5 units tall) clips into scene geometry.
**Solution:** Verify position in each scene. Check that animated geometry (casing, etc.) doesn't grow into the character.

### Double geometry at stations
**Problem:** Station components create procedural meshes at the same location as GLB model meshes.
**Solution:** This is by design — the procedural meshes ARE the interactive elements. The GLB provides the backdrop. Don't expect PBR material overrides on the GLB to affect the visual appearance of a station.

### Light budget overflow
**Problem:** More than 4 lights hitting a single mesh causes incorrect rendering.
**Solution:** All materials set `maxSimultaneousLights = 4`. Keep total scene lights ≤ 6.

## Debugging 3D Scenes

Since you can't easily inspect Babylon.js from DevTools (tree-shaken by bundler):

1. **Add `console.log` in material loops** — Log material names, types, albedo values, texture presence
2. **Use color coding** — Set materials to bright red/green/blue to identify which mesh is which
3. **Toggle visibility** — Set `mesh.isVisible = false` to isolate which mesh produces a visual artifact
4. **Playwright MCP** — Use browser automation to navigate through the game and take screenshots programmatically
5. **Blender re-export** — For GLB issues, import into Blender to inspect material nodes

## External Assets

Downloaded but not integrated:
- `Kitchen Sound Effects.zip` (27 MB) — Pre-recorded kitchen SFX
- `KitchenTools.zip` (55 MB) — 3D kitchen tool models
- `cocina.glb` (6.1 MB) — Alternative kitchen model
- `fbxfileskitchenbystyloo.zip` (3.5 MB) — FBX kitchen assets
- `funny sausag.obj` (4.1 MB) — Legacy sausage model

AmbientCG texture sources (not in repo, downloaded separately per material)
