# AGENTS.md — Will It Blow?

Entry point for all AI agents. Read this first, then follow the pointer chain.

## Project Identity

"Will It Blow?" is a first-person horror sausage-making mini-game (SAW meets cooking show). Built with React Native 0.83 + React Three Fiber 9.5 (Three.js 0.183 WebGPU) + Expo SDK 55. **Native-first** (iOS/Android via react-native-wgpu). 7 sequential challenges at kitchen stations. Koota ECS for all state. Total immersion — zero 2D overlays during gameplay.

## Documentation Chain

| Step | Location | What You'll Find |
|------|----------|-----------------|
| 1 | `AGENTS.md` (this file) | Project overview, architecture, commands, rules |
| 2 | `docs/superpowers/specs/2026-03-13-native-first-pivot-design.md` | **Active design spec** — native-first pivot with full execution plan |
| 3 | `docs/memory-bank/AGENTS.md` | Memory bank protocol — session context, read order |
| 4 | `docs/memory-bank/*.md` | Persistent context: project brief, patterns, tech stack, progress |
| 5 | `CLAUDE.md` | **Claude Code only** — slash commands, tool behavior |
| 6 | `.claude/agents/` | Specialized agent definitions |

## Key Architecture

### Native-First Rendering
- **React Three Fiber Canvas** via `react-native-wgpu` (Metal on iOS, Vulkan on Android)
- **No web target.** Web is abandoned. All browser workarounds deleted.
- Three.js WebGPU renderer — use TSL `NodeMaterial`, not raw GLSL

### Total Immersion (ZERO 2D HUD)
- ALL gameplay feedback via SurrealText (3D blood-text on kitchen surfaces)
- Mr. Sausage dialogue → blood letters on walls, melt/drip off
- Dialogue choices → tappable 3D text
- Phase instructions, strikes, scores, demands, verdict — all diegetic
- NO React Native overlays during gameplay
- Pre-game only: TitleScreen + DifficultySelector (React Native Reusables)

### State Management
- **Koota ECS** — the ONLY runtime state. 16 traits, Zustand-compatible hooks API via `src/ecs/hooks.ts`
- **No Zustand.** Deleted. `src/store/gameStore.ts` does not exist.
- **Persistence:** Dual SQLite — sql.js (WASM) for web/dev + @capacitor-community/sqlite for native, unified via drizzle-orm/sql-js

### Physics
- `@react-three/rapier` — kept, works on native via react-native-wgpu (browser WASM race does not occur on native)
- `Sausage.tsx` must use `useRapier()` context, NOT direct `require('@dimforge/rapier3d-compat')`

### FPS Controls (ported from grovekeeper)
- `src/input/InputManager.ts` — unified polling, merges providers per-frame
- `src/input/KeyboardMouseProvider.ts` — WASD + pointer lock
- `src/input/TouchProvider.ts` — invisible dual-zone touch (left=move, right=look)
- `src/player/FPSCamera.tsx` — eye height, head bob
- `src/player/PlayerCapsule.tsx` — Rapier dynamic body, capsule collider
- `src/player/useMouseLook.ts` — pointer lock, yaw/pitch
- `src/player/usePhysicsMovement.ts` — camera-relative WASD velocity
- Player walks freely. No camera rails.

### Game Flow
```
title → difficulty → intro (blink/wake-up) → walk kitchen → 13 GamePhases → verdict
```
Phases: SELECT_INGREDIENTS → CHOPPING → FILL_GRINDER → GRINDING → MOVE_BOWL → ATTACH_CASING → STUFFING → TIE_CASING → BLOWOUT → MOVE_SAUSAGE → MOVE_PAN → COOKING → DONE

### Testing
- **Maestro** YAML flows for E2E (replaces Playwright)
- **Jest** for unit tests (42 suites, 452 tests)

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Root — phase routing, Canvas, Physics, scene composition |
| `src/ecs/hooks.ts` | Koota-backed game state (replaces Zustand) |
| `src/ecs/traits.ts` | 16 Koota traits (all game state) |
| `src/ecs/kootaWorld.ts` | Singleton world, auto-bootstraps entities |
| `src/ecs/actions.ts` | All game actions (22 mutations) |
| `src/engine/GameOrchestrator.tsx` | Phase navigation + dev shortcuts (n/p keys) |
| `src/engine/ChallengeRegistry.ts` | Challenge configs, variant selection, verdict |
| `src/engine/SausagePhysics.ts` | 5 pure scoring functions |
| `src/engine/AudioEngine.ts` | Audio (needs rewrite for expo-audio) |
| `src/components/environment/SurrealText.tsx` | Diegetic feedback — blood text on surfaces |
| `src/components/stations/*.tsx` | 9 station components (self-contained) |
| `src/components/sausage/Sausage.tsx` | Bone-chain physics sausage |
| `src/player/*.ts(x)` | FPS camera, capsule, mouse look, movement, jump |
| `src/input/*.ts` | InputManager + providers |
| `src/config/*.json` | 16 JSON config files |
| `src/db/` | Dual SQLite + Drizzle persistence (sql.js web / capacitor-sqlite native) |
| `.maestro/` | Maestro E2E test flows |

## Commands

```bash
npx expo run:ios              # Primary dev target
npx expo run:android          # Android dev build
pnpm test                     # Jest unit tests
pnpm lint                     # Biome lint
pnpm format                   # Biome auto-fix
pnpm typecheck                # TypeScript (needs --stack-size=8192)
maestro test .maestro/flows/  # E2E tests
```

## Critical Rules

- **Native-first** — iOS/Android are the targets. No web fixes.
- **pnpm** for package management
- **Biome** for linting/formatting
- **Koota ECS** for all state — no Zustand, no React Context
- **Diegetic only** — zero 2D overlays during gameplay
- **TSL NodeMaterial** for shaders — not raw GLSL
- **useRef** for mutable state in `useFrame` (avoid stale closures)
- **Feature branches** — branch protection on main
- **No git worktrees** — they base off wrong commits
- **No WASM where avoidable** — native bindings preferred
