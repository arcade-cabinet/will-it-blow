# AGENTS.md — Will It Blow?

Entry point for all AI agents working in this codebase.

## Project Identity

"Will It Blow?" is a first-person horror sausage-making mini-game (SAW meets cooking show). Built with React Native 0.83 + React Three Fiber 9.5 (Three.js 0.183 WebGPU) + Expo SDK 55. Cross-platform: web, iOS, Android. 5 sequential challenges. Single Zustand store. Live at https://arcade-cabinet.github.io/will-it-blow/.

## Information Hierarchy

| Location | What you'll find |
|----------|-----------------|
| `AGENTS.md` (this file) | High-level entry point — project overview, architecture, commands, rules |
| `memory-bank/` | Persistent context — tech stack, patterns, pitfalls, progress (read `memory-bank/AGENTS.md` for order) |
| `docs/AGENTS.md` | Full documentation index with frontmatter schema reference |
| `docs/plans/AGENTS.md` | Plan archive (historical BabylonJS + completed R3F migration) |
| `CLAUDE.md` | **Claude Code only** — tool-specific behavior, slash commands, agent definitions |
| `.github/copilot-instructions.md` | **GitHub Copilot only** — tool-specific behavior |
| `.claude/agents/` | Bespoke agent definitions (scene-architect, challenge-dev, store-warden, asset-pipeline, doc-keeper) |
| `.claude/commands/` | Slash commands (playtest, lint-and-test, update-docs) |

## Quick Start for Agents

1. **Read this file** for project overview and key architecture
2. **Read `memory-bank/activeContext.md`** for current state and recent changes
3. **Read `memory-bank/systemPatterns.md`** for architecture patterns and conventions
4. **Check `docs/AGENTS.md`** frontmatter index for relevant documentation
5. **Check `.claude/agents/`** for your specialized role definition

## Key Architecture

### Two-Layer Rendering

1. **React Three Fiber 3D scene** (`<Canvas>` with `WebGPURenderer`) — Kitchen GLB model + declarative station meshes + lighting
2. **React Native overlay** — All UI (challenges, dialogue, menus, results)

### State Management

Zustand store (`src/store/gameStore.ts`) — single source of truth. No React Context for game state.

### Challenge Pattern

Each challenge = overlay (`challenges/`) + 3D station (`kitchen/`) + dialogue (`data/dialogue/`)
- Overlay writes to store (progress, pressure, strikes)
- Station reads from store via props (passed through GameWorld)
- No direct communication between overlay and station

### Target-Based Placement

`FurnitureLayout.ts` defines named targets computed from room dimensions. All furniture, stations, triggers, and waypoint markers reference targets by name — no hardcoded coordinates. `resolveLayout()` (from `src/engine/layout/`) is the single source of truth.

### Game Flow

```text
menu -> loading -> ingredients -> grinding -> stuffing -> cooking -> tasting -> results
```

Managed by `appPhase` (menu/loading/playing) and `currentChallenge` (0-4) in the store.

### Code Splitting

`App.tsx` uses `React.lazy()` + `Suspense` to split the bundle at phase boundaries. GameWorld (Three.js + R3F) is lazy-loaded and prefetched during the loading phase.

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Root layout — phase routing + code splitting + chunk prefetch |
| `src/store/gameStore.ts` | Zustand store (all game state + actions) |
| `src/engine/ChallengeRegistry.ts` | Challenge configs, variant selection, final verdict |
| `src/engine/SausagePhysics.ts` | 5 pure scoring functions |
| `src/engine/Ingredients.ts` | 25 ingredients with stats |
| `src/engine/FurnitureLayout.ts` | Target-based placement — resolveLayout(), FURNITURE_RULES |
| `src/components/GameWorld.tsx` | R3F Canvas, FPS controller, station triggers, scene orchestrator |
| `src/components/kitchen/*.tsx` | 3D station components (Fridge, Grinder, Stuffer, Stove, CRT TV) |
| `src/components/challenges/*.tsx` | 5 challenge overlays (game mechanics + UI) |
| `src/components/characters/MrSausage3D.tsx` | Procedural 3D character with reaction animations |
| `src/components/effects/CrtShader.ts` | TSL NodeMaterial (chromatic aberration + scanlines) |
| `src/components/ui/*.tsx` | Menu, loading, dialogue, progress, strikes, game over |

## Commands Reference

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

# Documentation
pnpm docs:build               # Generate TypeDoc API docs
```

## Critical Rules

- **pnpm** for package management (not npm/yarn)
- **Biome** for linting and formatting (not ESLint/Prettier)
- **WebGPU** renderer — use TSL `NodeMaterial`, not raw GLSL `ShaderMaterial`
- **Zustand** only for game state (no React Context)
- **Target-based placement** — no hardcoded coordinates; everything derives from `resolveLayout()`
- **useRef** for mutable state in `useFrame` callbacks (avoid stale closures)
- **Feature branches** — branch protection on main; use feat/* branches and PRs
- **Squash merge** — preferred merge strategy

## Common Pitfalls

11 documented pitfalls covering TypeScript, Metro, testing, and 3D geometry. See `memory-bank/techContext.md` § "Known Technical Pitfalls" for the full list.

## CI/CD

See `memory-bank/techContext.md` § "CI/CD" for workflow details. Live site: https://arcade-cabinet.github.io/will-it-blow/
