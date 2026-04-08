# AGENTS.md — Will It Blow?

Entry point for all AI agents. Read this first, then follow the pointer chain.

## Project Identity

"Will It Blow?" is a first-person horror sausage-making mini-game (SAW meets cooking show). Built with React 19 + React Three Fiber + Three.js + Rapier + Capacitor 6. Web-first with native deployment via Capacitor (iOS/Android). 7 sequential challenges at kitchen stations. Koota ECS for all state. Total immersion — zero 2D overlays during gameplay. Tailwind CSS + DaisyUI for pre-game UI components.

## Documentation Chain

| Step | Location | What You'll Find |
|------|----------|-----------------|
| 1 | `AGENTS.md` (this file) | Project overview, architecture, commands, rules |
| 2 | `docs/memory-bank/AGENTS.md` | Memory bank protocol — session context, read order |
| 3 | `docs/memory-bank/*.md` | Persistent context: project brief, patterns, tech stack, progress |
| 4 | `CLAUDE.md` | **Claude Code only** — slash commands, tool behavior |
| 5 | `.claude/agents/` | Specialized agent definitions |

## Key Architecture

### Rendering & Platform
- **Vite** dev server and production bundler
- **React Three Fiber Canvas** with Three.js WebGL renderer
- **Capacitor 6** for native iOS/Android deployment (web app wrapped in native shell)
- Web is the primary dev target; Capacitor provides native access (haptics, SQLite, etc.)

### Total Immersion (ZERO 2D HUD)
- ALL gameplay feedback via SurrealText (3D blood-text on kitchen surfaces)
- Mr. Sausage dialogue — blood letters on walls, melt/drip off
- Dialogue choices — tappable 3D text
- Phase instructions, strikes, scores, demands, verdict — all diegetic
- NO overlays during gameplay
- Pre-game only: TitleScreen + DifficultySelector (Tailwind + DaisyUI)

### State Management
- **Koota ECS** — the ONLY runtime state. 16 traits, Zustand-compatible hooks API via `src/ecs/hooks.ts`
- **No Zustand.** Deleted. `src/store/gameStore.ts` does not exist.
- **Persistence:** sql.js (WASM) for web/dev + @nicepkg/capacitor-sqlite for native, unified via drizzle-orm

### Physics
- `@react-three/rapier` — Rapier WASM physics (rigid bodies, colliders, sensors)
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

### Audio
- **Tone.js** for procedural audio synthesis (SFX instruments + melodies)

### Game Flow
```
title → difficulty → intro (blink/wake-up) → walk kitchen → 13 GamePhases → verdict
```
Phases: SELECT_INGREDIENTS → CHOPPING → FILL_GRINDER → GRINDING → MOVE_BOWL → ATTACH_CASING → STUFFING → TIE_CASING → BLOWOUT → MOVE_SAUSAGE → MOVE_PAN → COOKING → DONE

### Testing
- **Vitest** for unit tests
- **Playwright** for E2E tests

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
| `src/engine/AudioEngine.ts` | Audio (Tone.js synthesis) |
| `src/components/environment/SurrealText.tsx` | Diegetic feedback — blood text on surfaces |
| `src/components/stations/*.tsx` | 9 station components (self-contained) |
| `src/components/sausage/Sausage.tsx` | Bone-chain physics sausage |
| `src/player/*.ts(x)` | FPS camera, capsule, mouse look, movement, jump |
| `src/input/*.ts` | InputManager + providers |
| `src/config/*.json` | 16 JSON config files |
| `src/db/` | Dual SQLite + Drizzle persistence (sql.js web / capacitor-sqlite native) |

## Commands

```bash
pnpm dev                    # Vite dev server
pnpm build                  # Production build
pnpm test                   # Vitest unit tests (jsdom — fast)
pnpm test:browser           # Vitest browser tests (real Chromium, all 4 viewports)
pnpm test:browser:unit      # browser-mode unit chunk
pnpm test:browser:micro     # per-component isolation chunk
pnpm test:browser:meso      # phase + flow chunk
pnpm test:browser:macro     # Yuka GOAP playthrough chunk
pnpm test:browser:harness   # harness self-tests
pnpm report:browser         # rebuild test-results/browser/report.html
pnpm typecheck              # tsc --noEmit
pnpm lint                   # biome check
pnpm format                 # biome check --write
pnpm cap:ios                # Capacitor iOS sync + open
pnpm cap:android            # Capacitor Android sync + open
```

> Browser tests use `@vitest/browser` with the Playwright provider.
> See `docs/testing/deep-browser-validation.md` for the full
> harness reference + Yuka GOAP governor architecture. The legacy
> `pnpm test:e2e` Playwright command and `e2e/` directory have
> been removed — Vitest browser mode replaces them.

## Critical Rules

- **pnpm** for package management
- **Biome** for linting/formatting
- **Koota ECS** for all state — no Zustand, no React Context
- **Diegetic only** — zero 2D overlays during gameplay
- **Tailwind CSS + DaisyUI** for pre-game UI components
- **useRef** for mutable state in `useFrame` (avoid stale closures)
- **Feature branches** — branch protection on main
- **No git worktrees** — they base off wrong commits
