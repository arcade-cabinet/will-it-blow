<!--
title: Development Guide
domain: core
status: current
engine: r3f
last-verified: 2026-03-01
depends-on: [architecture, state-management, 3d-rendering, testing]
agent-context: scene-architect, challenge-dev, store-warden
summary: Conventions, patterns, pitfalls, how to add features
-->

# Development Guide

## Quick Start

```bash
# Install dependencies
pnpm install

# Start web dev server
npx expo start --web

# Run tests
pnpm test

# Type check
npx tsc --noEmit
```

## Project Conventions

### File Organization

- **Pure logic** goes in `src/engine/` — no React, no Three.js imports
- **3D components** go in `src/components/kitchen/` — R3F declarative mesh components
- **UI overlays** go in `src/components/ui/` — React Native views
- **Challenge overlays** go in `src/components/challenges/` — game phase UX
- **Data** goes in `src/data/` — dialogue trees, challenge variants
- **Component tests** go in `src/components/*/__tests__/` — co-located with source

### Challenge Component Pattern

Each challenge follows this structure:

```text
src/components/challenges/FooChallenge.tsx    ← React Native overlay (UI + game logic)
src/components/kitchen/FooStation.tsx          ← R3F 3D visuals
src/data/dialogue/foo.ts                       ← Mr. Sausage dialogue for this phase
src/data/challenges/variants.ts                ← Variant config (shared file)
```

The challenge overlay:
1. Shows dialogue intro (DialogueOverlay)
2. Runs the main mechanic (progress bar, timer, touch handlers)
3. Writes to the store (setChallengeProgress, addStrike, etc.)
4. Calls `completeChallenge(score)` when done

The station component:
1. Renders declarative `<mesh>` elements with R3F JSX
2. Reads store state via props (passed from GameWorld)
3. Animates meshes in `useFrame` callbacks
4. Cleanup is automatic (R3F unmounts Three.js objects when component unmounts)

### R3F 3D Scene Rules

1. **Declarative JSX:** Use `<mesh><boxGeometry /><meshStandardMaterial /></mesh>` — no imperative mesh creation.
2. **useFrame for animation:** `useFrame((state, delta) => { ref.current.rotation.y += delta; })` — runs every frame.
3. **useRef for mutable state:** Values read in `useFrame` must be in refs, not React state (avoids stale closures).
4. **Self-lit materials:** `<meshBasicMaterial color="..." />` for non-physical objects (MrSausage3D, ingredients, fluorescent tubes).
5. **PBR materials:** `<meshStandardMaterial map={...} normalMap={...} roughnessMap={...} />` for physical surfaces.
6. **GLB loading:** `useGLTF('/models/kitchen.glb')` from `@react-three/drei`. Mock in tests.
7. **Mesh picking:** `onClick` prop directly on `<mesh>` elements — no action manager needed.
8. **Cleanup is automatic:** R3F disposes Three.js objects when components unmount. No manual disposal arrays needed.

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
   - Declarative R3F JSX (`<mesh>`, `<group>`, etc.)
   - Props: challenge-specific state (progress, etc.)
   - Animation in `useFrame`
   - Export pure functions for testability where appropriate

6. **Add station test** at `src/components/kitchen/__tests__/FooStation.test.tsx`:
   - Use `@react-three/test-renderer`
   - Test mesh presence, prop reactions, exported pure functions

7. **Wire into GameWorld.tsx**:
   - Add camera position to `STATION_CAMERAS`
   - Add visibility flag: `const showFoo = gameStatus === 'playing' && currentChallenge === N`
   - Add station component in JSX

8. **Wire into App.tsx** (GameUI):
   - Add challenge flag: `const isFooChallenge = ...`
   - Add challenge overlay in JSX

9. **Add tests** for any pure logic in `__tests__/`

## Adding Store State

If a new challenge needs new ephemeral state:

1. Add field to `GameState` interface
2. Add default to `INITIAL_GAME_STATE`
3. Add setter action
4. Reset the field in `startNewGame()`, `completeChallenge()`, `returnToMenu()`, and `continueGame()`
5. Add tests in `__tests__/gameStore.test.ts`

## Common Pitfalls

### import.meta in Metro

**Problem:** White screen on load — `Cannot use 'import.meta' outside a module`.
**Solution:** Ensure `unstable_transformImportMeta: true` in `babel.config.js` preset options. Run `npx expo start --web --clear` after changing babel config.

### useGLTF in Jest

**Problem:** `useGLTF` fails in tests — file loading not available in Node.js.
**Solution:** Mock `@react-three/drei` in your test file. See `docs/testing.md` for the mock pattern.

### Stale closure in useFrame

**Problem:** `useFrame` callback captures state from mount time.
**Solution:** Use `useRef` and update `.current` on each render. Read from ref inside `useFrame`.

### Three.js ESM in Jest

**Problem:** `SyntaxError: Unexpected token 'export'` when importing Three.js or R3F in tests.
**Solution:** `jest.config.js` must include `three` and `@react-three` in the `transformIgnorePatterns` allowlist.

### Camera inside mesh

**Problem:** Camera positioned inside or too close to a mesh → black screen.
**Solution:** Check STATION_CAMERAS values. Ensure camera is at least 0.5 units from any solid mesh.

### MrSausage3D overlap

**Problem:** Character's head sphere (radius 1.8, extends ~3.5 units tall) clips into scene geometry.
**Solution:** Verify position in each scene. Check that animated geometry doesn't grow into the character.

## Debugging 3D Scenes

1. **React DevTools** — R3F components appear in the React tree. Inspect props and state.
2. **drei helpers** — Add `<axesHelper />`, `<gridHelper />`, `<Stats />` temporarily for visual debugging.
3. **Color coding** — Set materials to bright red/green/blue to identify which mesh is which.
4. **Toggle visibility** — Set `visible={false}` on mesh to isolate visual artifacts.
5. **Playwright MCP** — Use browser automation to navigate the game and take screenshots programmatically.
6. **Console in useFrame** — Add `console.log` inside `useFrame` (but remove before commit — runs 60fps).

## External Assets

Downloaded but not integrated:
- `Kitchen Sound Effects.zip` (27 MB) — Pre-recorded kitchen SFX
- `KitchenTools.zip` (55 MB) — 3D kitchen tool models
- `cocina.glb` (6.1 MB) — Alternative kitchen model
- `fbxfileskitchenbystyloo.zip` (3.5 MB) — FBX kitchen assets
- `funny sausag.obj` (4.1 MB) — Legacy sausage model

AmbientCG texture sources (not in repo, downloaded separately per material)
