# System Patterns — Will It Blow?

## Two-Layer Rendering

The app has two rendering layers that never directly communicate:

```
Layer 2: React Native UI Overlays    <- Buttons, progress bars, dialogue, challenges
Layer 1: React Three Fiber Canvas    <- Kitchen GLB, stations, lighting, Mr. Sausage
Root:    SafeAreaView (React Native)  <- Container, background (#0a0a0a)
```

- Layer 1 is the R3F `<Canvas>` with `WebGPURenderer` — renders 3D kitchen, station meshes, CRT TV
- Layer 2 is React Native views with `pointerEvents="box-none"` floating above the 3D scene
- Both layers subscribe independently to the Zustand store — no direct communication between them

## Challenge Component Pattern

Every challenge follows the same three-part structure:

```
challenge = overlay (challenges/) + 3D station (kitchen/) + dialogue (data/dialogue/)
```

- **Overlay** (React Native) writes to the Zustand store: progress, pressure, strikes, scores
- **3D Station** (R3F) reads from the store via props passed through GameWorld
- **Dialogue** data feeds into DialogueOverlay at challenge start
- There is **no direct communication** between overlay and station — they coordinate through the store

Files: `src/components/challenges/*.tsx` + `src/components/kitchen/*Station.tsx` + `src/data/dialogue/*.ts`

## Fridge Bridge Pattern

Special case for the ingredient challenge where 3D mesh clicks must reach the 2D overlay:

1. Player clicks ingredient mesh in 3D FridgeStation
2. FridgeStation calls `triggerFridgeClick(index)` on the store
3. IngredientChallenge overlay watches `pendingFridgeClick` via `useEffect`
4. Overlay processes scoring logic, then calls `clearFridgeClick()`

This avoids direct 3D-to-2D communication while keeping click handling responsive.

Store fields: `pendingFridgeClick`, `triggerFridgeClick(index)`, `clearFridgeClick()`

## State Machine

Two separate state fields manage lifecycle:

- `appPhase`: `'menu'` | `'loading'` | `'playing'` — controls which top-level component renders
- `gameStatus`: `'menu'` | `'playing'` | `'victory'` | `'defeat'` — in-game state

```
menu → loading → playing (challenge 0→1→2→3→4) → victory/defeat → menu
```

`currentChallenge` (0-4) tracks progression through the 5 challenges. See `src/store/gameStore.ts`.

## Target-Based Placement

All furniture, stations, triggers, and waypoints reference named targets — never hardcoded coordinates.

- `FurnitureLayout.ts` defines `resolveTargets(room)` — computes positions from room dimensions
- `FURNITURE_RULES` maps furniture pieces to target names
- If room dimensions change, everything follows automatically

Source: `src/engine/FurnitureLayout.ts`

## FPS Controller

- `FPSController.tsx` — WASD/arrow keys + pointer-lock mouse look for desktop
- `MobileJoystick.tsx` — Touch controls for mobile
- `ProximityTrigger` in GameWorld checks player distance to station targets
- Camera at y=1.6 (standing eye height), fov=70, near=0.1

Source: `src/components/controls/`

## Code Splitting

`App.tsx` uses `React.lazy()` + `Suspense` at phase boundaries:

| Category | Loading | Size |
|----------|---------|------|
| **Static** (initial bundle) | TitleScreen, LoadingScreen | ~1.2 MB |
| **Lazy** (on demand) | GameWorld, 5 challenges, GameOverScreen | ~4.6 MB (GameWorld chunk) |
| **Prefetched** | GameWorld + first challenge during loading phase | Cached before transition |

Metro splits production build into 17 separate JS files.

## R3F Component Conventions

- Declarative JSX: `<mesh><boxGeometry /><meshStandardMaterial /></mesh>`
- Per-frame animation: `useFrame((state, delta) => { ... })` — NOT imperative render loops
- Camera/scene access: `useThree()` hook
- Mutable state in render loops: `useRef<THREE.Mesh>(null)` (avoids stale closures)
- Self-lit materials: `<meshBasicMaterial color="..." />` (unlit, always visible)
- PBR materials: `<meshStandardMaterial map={...} normalMap={...} roughnessMap={...} />`
- GLB loading: `useGLTF('/models/<segment>.glb')` from `@react-three/drei`
- Mesh picking: `onClick` prop directly on `<mesh>` elements

## Asset URL Resolution

Dynamic asset URLs (GLB, textures) use `getWebBasePath()` from `src/engine/assetUrl.ts`. This derives the base path from `<script src>` tags at runtime, handling the GitHub Pages `/will-it-blow/` prefix correctly. Expo's `experiments.baseUrl` prefixes JS/CSS but does NOT inject a `<base>` tag.

## Variant System

Each playthrough generates a `variantSeed` (Date.now()) that deterministically selects challenge parameters:

- 6 ingredient variants (different tag criteria)
- 3 grinding variants (speed tolerances, timer lengths)
- 3 stuffing variants (fill/pressure rates)
- 3 cooking variants (target temperatures, tolerances)

Selection: `(seed * 2654435761) >>> 0 % arrayLength`

Source: `src/engine/ChallengeRegistry.ts`, `src/data/challenges/variants.ts`

## Input Abstraction

Engine-agnostic input through:
- `InputActions.ts` — Unified input action system
- `HapticService.ts` — Haptic feedback abstraction

These decouple game logic from specific input implementations.
