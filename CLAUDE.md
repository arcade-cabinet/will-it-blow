# CLAUDE.md — Will It Blow?

Project-specific instructions for Claude Code when working in this repository.

## What This Is

A first-person horror sausage-making mini-game. SAW meets cooking show. Built with React Native 0.83 + Babylon.js 8.53 (via reactylon 3.5) + Expo SDK 55. Primary target: web. Also targets iOS and Android.

**Full documentation:** See `docs/` directory for detailed guides:
- `docs/architecture.md` — System design, directory structure, data flow
- `docs/game-design.md` — Gameplay mechanics, scoring, challenges, Mr. Sausage
- `docs/3d-rendering.md` — Babylon.js setup, materials, lighting, cameras, stations
- `docs/state-management.md` — Zustand store schema, actions, state flow
- `docs/audio.md` — Tone.js synthesis, sound design, integration points
- `docs/testing.md` — Strategy, coverage, limitations, adding tests
- `docs/deployment.md` — CI/CD, GitHub Pages, build commands
- `docs/development-guide.md` — Conventions, patterns, pitfalls, how to add features
- `docs/status.md` — Current completion status and remaining work

## Commands

```bash
# Development
npx expo start --web          # Web dev server (primary dev target)

# Testing
npm test                      # Run all 172 Jest tests
npm test -- --ci --forceExit  # CI mode

# Type checking
npx tsc --noEmit
```

## Architecture

### Three-Layer Rendering

1. **Babylon.js 3D scene** (reactylon) — Kitchen GLB model + procedural station meshes + lighting
2. **React Native overlay** — All UI (challenges, dialogue, menus, results)
3. **MrSausage3D** — Procedural self-lit character on CRT television

### State Management

Zustand store (`src/store/gameStore.ts`) — single source of truth. No React Context.

### Game Flow

```
menu → loading → ingredients → grinding → stuffing → cooking → tasting → results
```

Managed by `appPhase` (menu/loading/playing) and `currentChallenge` (0–4) in the store.

### Platform Splitting (Metro file extensions)
- `GameWorld.web.tsx` / `GameWorld.native.tsx` — Engine wrapper
- `AudioEngine.web.ts` (Tone.js) / `AudioEngine.ts` (native no-op stub)

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Root layout — SafeAreaView + phase routing (menu/loading/playing) |
| `src/store/gameStore.ts` | Zustand store (all game state + actions) |
| `src/engine/ChallengeRegistry.ts` | Challenge configs, variant selection, final verdict |
| `src/engine/SausagePhysics.ts` | 5 pure scoring functions |
| `src/engine/Ingredients.ts` | 25 ingredients with stats |
| `src/components/GameWorld.web.tsx` | Babylon.js scene orchestrator, camera system |
| `src/components/kitchen/KitchenEnvironment.tsx` | Room enclosure, GLB loading, PBR materials, lighting |
| `src/components/kitchen/FridgeStation.tsx` | 3D fridge with ingredient meshes |
| `src/components/kitchen/CrtTelevision.tsx` | CRT TV with Mr. Sausage + shader |
| `src/components/challenges/*.tsx` | 5 challenge overlays (game mechanics + UI) |
| `src/components/ui/*.tsx` | Menu, loading, dialogue, progress, strikes, game over |

## Patterns and Conventions

### 3D Scenes

- Mesh/material creation in `useEffect([scene, ...])` with full disposal on cleanup
- `useRef` for values read inside `onBeforeRenderObservable` (avoids stale closures)
- Self-lit materials: `disableLighting: true` + `emissiveColor` for non-physical objects
- PBR materials: `albedoTexture` + `bumpTexture` + roughness in metallicTexture green channel
- All PBR materials: `maxSimultaneousLights = 4` (WebGPU uniform buffer limit)
- StandardMaterial `diffuseColor` must be ≤0.20 (6 scene lights totaling ~7× intensity)

### Challenge Component Pattern

Each challenge = overlay (`challenges/`) + 3D station (`kitchen/`) + dialogue (`data/dialogue/`)
- Overlay writes to store (progress, pressure, strikes)
- Station reads from store via props (passed through GameWorld)
- No direct communication between overlay and station

### Testing

- Jest with react-native preset — **pure logic only**
- Cannot import Babylon.js or reactylon in tests (ESM incompatible)
- 172 tests covering: SausagePhysics, Ingredients, ChallengeRegistry, IngredientMatcher, DialogueEngine, gameStore

## CI/CD

- `.github/workflows/ci.yml` — Tests on push (main + feat/**)
- `.github/workflows/cd.yml` — Web export → GitHub Pages deploy (push to main)
- **Live:** https://arcade-cabinet.github.io/will-it-blow/

## Common Pitfalls

- **Babylon.js ESM in Jest**: Can't import Babylon or reactylon in tests. Test pure logic modules only.
- **Stale closure in render loops**: Use `useRef` for values read inside `onBeforeRenderObservable` callbacks.
- **Canvas.width mutation kills WebGPU**: Never set canvas.width directly. Only CSS sizing + `engine.resize()`.
- **PBR black without IBL**: Scene needs `environmentTexture` or PBR surfaces render nearly black.
- **Light accumulation**: With ~7× total intensity, `diffuseColor > 0.20` clips to white.
- **Double geometry**: Station components create procedural meshes that occlude GLB model meshes at the same positions. PBR material overrides on the GLB won't visually affect stations.
- **Camera inside mesh**: Check STATION_CAMERAS values. Camera needs ≥0.5 units clearance from solid meshes.
