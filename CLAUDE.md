# CLAUDE.md — Will It Blow?

Project-specific instructions for Claude Code when working in this repository.

## What This Is

A first-person horror sausage-making mini-game. SAW meets cooking show. Built with React Native 0.83 + React Three Fiber 9.5 (Three.js 0.183 WebGPU) + Expo SDK 55. WebGPU rendering via `react-native-wgpu` (Dawn-based on native, browser WebGPU on web). Cross-platform: web, iOS, Android.

**Full documentation:** See `docs/` directory for detailed guides:
- `docs/architecture.md` — System design, directory structure, data flow
- `docs/game-design.md` — Gameplay mechanics, scoring, challenges, Mr. Sausage
- `docs/3d-rendering.md` — R3F setup, materials, lighting, cameras, stations
- `docs/state-management.md` — Zustand store schema, actions, state flow
- `docs/audio.md` — Tone.js synthesis, sound design, integration points
- `docs/testing.md` — Strategy, coverage, R3F component testing, adding tests
- `docs/deployment.md` — CI/CD, GitHub Pages, build commands
- `docs/development-guide.md` — Conventions, patterns, pitfalls, how to add features
- `docs/status.md` — Current completion status and remaining work

## Commands

```bash
# Development
npx expo start --web          # Web dev server (primary dev target)

# Testing
pnpm test                     # Run all Jest tests
pnpm test:ci                  # CI mode (--ci --forceExit)

# Linting & formatting (Biome)
pnpm lint                     # Check lint + format errors
pnpm format                   # Auto-fix lint + format errors

# Type checking (needs increased stack for Three.js recursive types)
pnpm typecheck
```

## Architecture

### Two-Layer Rendering

1. **React Three Fiber 3D scene** (`<Canvas>` with `WebGPURenderer`) — Kitchen GLB model + declarative station meshes + lighting. WebXR support via `@react-three/xr`.
2. **React Native overlay** — All UI (challenges, dialogue, menus, results)

### State Management

Zustand store (`src/store/gameStore.ts`) — single source of truth. No React Context.

### Game Flow

```text
menu → loading → ingredients → grinding → stuffing → cooking → tasting → results
```

Managed by `appPhase` (menu/loading/playing) and `currentChallenge` (0–4) in the store.

### Unified Cross-Platform

Single `GameWorld.tsx` uses `@react-three/fiber` Canvas with `WebGPURenderer` — works on both web and native via `react-native-wgpu`. No platform-specific file splitting for the 3D layer.

- Metro config has a WebGPU resolver that maps bare `'three'` imports to `'three/webgpu'` on native platforms
- `AudioEngine.web.ts` (Tone.js) / `AudioEngine.ts` (native no-op stub) — only remaining platform split

### Code Splitting (Dynamic Imports)

`App.tsx` uses `React.lazy()` + `Suspense` to split the bundle at phase boundaries:

- **Static imports** (in initial bundle): `TitleScreen`, `LoadingScreen`, small UI chrome
- **Lazy-loaded**: `GameWorld` (Three.js + R3F + all stations — biggest chunk), all 5 challenge components, `GameOverScreen`
- **Prefetching**: During the loading phase, `import('./src/components/GameWorld')` and first challenge are prefetched so the JS chunk is cached before the phase transitions to `playing`
- **Production chunks**: Metro splits into 17 separate JS files. Menu loads ~1.2MB; GameWorld chunk (~4.6MB with Three.js) only loads when game starts

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Root layout — phase routing + React.lazy code splitting + chunk prefetch |
| `src/store/gameStore.ts` | Zustand store (all game state + actions) |
| `src/engine/ChallengeRegistry.ts` | Challenge configs, variant selection, final verdict |
| `src/engine/SausagePhysics.ts` | 5 pure scoring functions |
| `src/engine/Ingredients.ts` | 25 ingredients with stats |
| `src/engine/FurnitureLayout.ts` | Target-based placement system — resolveTargets(), FURNITURE_RULES |
| `src/components/GameWorld.tsx` | R3F Canvas, FPS controller, target-derived station triggers, scene orchestrator |
| `src/components/kitchen/KitchenEnvironment.tsx` | Room enclosure (walls/floor/ceiling PBR), lighting, FurnitureLoader |
| `src/components/kitchen/FurnitureLoader.tsx` | Loads GLB furniture segments, positions at targets, handles animations |
| `src/components/kitchen/FridgeStation.tsx` | 3D fridge with ingredient meshes (onClick picking) |
| `src/components/kitchen/GrinderStation.tsx` | 3D grinder with crank animation |
| `src/components/kitchen/StufferStation.tsx` | 3D stuffer with pressure visualization |
| `src/components/kitchen/StoveStation.tsx` | 3D stove with temperature glow |
| `src/components/kitchen/CrtTelevision.tsx` | CRT TV with Mr. Sausage + shader |
| `src/components/characters/MrSausage3D.tsx` | Procedural 3D character with reaction animations |
| `src/components/effects/CrtShader.ts` | TSL NodeMaterial (chromatic aberration + scanlines, compiles to WGSL/GLSL) |
| `src/components/ingredients/Ingredient3D.tsx` | Shape-based ingredient meshes (8 shape types) |
| `src/components/challenges/*.tsx` | 5 challenge overlays (game mechanics + UI) |
| `src/components/ui/*.tsx` | Menu, loading, dialogue, progress, strikes, game over |

## Patterns and Conventions

### R3F 3D Components

- Declarative JSX: `<mesh><boxGeometry /><meshStandardMaterial /></mesh>`
- Per-frame animation via `useFrame((state, delta) => { ... })` — replaces imperative render loops
- Camera/scene access via `useThree()` hook
- Refs for mutable state read in `useFrame`: `const ref = useRef<THREE.Mesh>(null)`
- Self-lit materials: `<meshBasicMaterial color="..." />` (unlit, always visible)
- PBR materials: `<meshStandardMaterial map={...} normalMap={...} roughnessMap={...} />`
- GLB loading: `useGLTF('/models/<segment>.glb')` from `@react-three/drei` — discrete furniture GLBs, not one monolith
- Mesh picking: `onClick` prop directly on `<mesh>` elements

### Target-Based Placement

`FurnitureLayout.ts` defines named targets computed from room dimensions. All furniture, stations, triggers, and waypoint markers reference targets by name — no hardcoded coordinates in any consumer. `resolveTargets(room)` is the single source of truth. If room dimensions change, everything follows.

### FPS Controller

`FPSController.tsx` in `src/components/controls/`. WASD/arrow keys + pointer-lock mouse look for free-roam navigation. `MobileJoystick.tsx` for touch controls. `ProximityTrigger` in GameWorld checks player distance to station targets.

### Challenge Component Pattern

Each challenge = overlay (`challenges/`) + 3D station (`kitchen/`) + dialogue (`data/dialogue/`)
- Overlay writes to store (progress, pressure, strikes)
- Station reads from store via props (passed through GameWorld)
- No direct communication between overlay and station

### Testing

- Jest with react-native preset — **both pure logic AND R3F component tests**
- R3F components tested via `@react-three/test-renderer` (renders Three.js scene graph in Node.js)
- 256+ tests across ~24 test files
- Pure logic: SausagePhysics, Ingredients, ChallengeRegistry, IngredientMatcher, DialogueEngine, gameStore
- Component tests: MrSausage3D, CrtTelevision, KitchenEnvironment, FridgeStation, GrinderStation, StufferStation, StoveStation, Ingredient3D, GameWorld, CrtShader

## CI/CD

- `.github/workflows/ci.yml` — Tests on push (main + feat/**)
- `.github/workflows/cd.yml` — Web export → GitHub Pages deploy (push to main)
- **Live:** https://arcade-cabinet.github.io/will-it-blow/

## Common Pitfalls

- **import.meta in Metro**: Zustand ESM uses `import.meta.env.MODE`. Must have `unstable_transformImportMeta: true` in babel.config.js or you get a white screen.
- **useGLTF mocking in tests**: `@react-three/drei`'s `useGLTF` must be mocked in Jest — it depends on file loading that doesn't work in Node.js.
- **Stale closure in useFrame**: Use `useRef` for values read inside `useFrame` callbacks. React state captured at mount time would be stale.
- **sphereGeometry takes radius, not diameter**: Babylon.js used `diameter: 3.6` → R3F uses `args={[1.8, 24, 24]}` (radius, widthSegments, heightSegments).
- **Camera inside mesh**: Check STATION_CAMERAS values. Camera needs ≥0.5 units clearance from solid meshes.
- **MrSausage3D overlap**: The character is ~3.5 units tall at scale 1.0. Verify position in each scene doesn't clip animated geometry.
- **Three.js transform allowlist**: `jest.config.js` must include `three` and `@react-three` in `transformIgnorePatterns` or tests fail with ESM syntax errors.
- **TSL vs GLSL**: WebGPU renderer does not support raw GLSL `ShaderMaterial`. Use TSL (Three Shading Language) `NodeMaterial` instead — it compiles to WGSL for WebGPU or GLSL for WebGL2 fallback. Import node functions from `'three/tsl'`.
- **Metro WebGPU resolver**: On native, bare `'three'` imports are remapped to `'three/webgpu'` by `metro.config.js`. On web, the browser build already uses WebGPU. Direct `'three/webgpu'` imports work on all platforms.
- **TypeScript stack overflow**: `npx tsc --noEmit` crashes with Three.js recursive types. Use `pnpm typecheck` which runs with `node --stack-size=8192`. `skipLibCheck: true` is set in tsconfig but doesn't prevent the overflow alone (the recursion happens in our source code referencing Three.js types, not in `.d.ts` files).
- **`let` + closure = `never` type**: TypeScript can't track mutations inside callbacks (e.g., `scene.traverse()`). If a `let` variable is assigned inside a callback then narrowed after, TS may infer `never`. Fix by assigning to a `const` after the null guard.
