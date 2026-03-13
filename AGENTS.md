# AGENTS.md — Will It Blow?

Entry point for all AI agents. Read this first, then follow the pointer chain.

## Project Identity

"Will It Blow?" is a first-person horror sausage-making mini-game (SAW meets cooking show). Built with React Native 0.83 + React Three Fiber 9.5 (Three.js 0.183) + Expo SDK 55. Web-first, cross-platform (iOS, Android). 7 sequential challenges at kitchen stations. Camera rail navigation between stations. Single Zustand store. Live at https://arcade-cabinet.github.io/will-it-blow/.

## Documentation Chain

| Step | Location | What You'll Find |
|------|----------|-----------------|
| 1 | `AGENTS.md` (this file) | Project overview, architecture, commands, rules |
| 2 | `docs/AGENTS.md` | Full documentation index, frontmatter schema, agent routing |
| 3 | `docs/memory-bank/AGENTS.md` | Memory bank protocol — session context, read order, update rules |
| 4 | `docs/memory-bank/*.md` | Persistent context: project brief, patterns, tech stack, progress |
| 5 | `docs/*.md` | Domain deep dives: architecture, game design, rendering, audio, etc. |
| 6 | `CLAUDE.md` | **Claude Code only** — slash commands, tool behavior |
| 7 | `.claude/agents/` | Specialized agent definitions (scene-architect, challenge-dev, etc.) |

## Quick Start for Agents

1. Read this file for project overview
2. Read `docs/memory-bank/activeContext.md` for current session state
3. Read `docs/memory-bank/systemPatterns.md` for architecture patterns
4. Check `docs/AGENTS.md` frontmatter index for domain-specific docs
5. Check `.claude/agents/` for your specialized role definition

## Key Architecture

### Two-Layer Rendering
1. **React Three Fiber Canvas** (`WebGPURenderer`) — Kitchen environment, station meshes, lighting, Mr. Sausage on CRT TV
2. **React Native Overlay** — All UI (challenges, dialogue, menus, results) with `pointerEvents="box-none"`

Both layers subscribe independently to Zustand store — no direct communication.

### Camera Rail System
Fixed camera positions per station. Smooth interpolation between stations on challenge transitions (~2.5s ease-in-out). No free-roam FPS walk — camera is on rails.

### State Management
Single Zustand store (`src/store/gameStore.ts`). No React Context for game state. `appPhase` (menu/loading/playing) controls top-level rendering. `currentChallenge` (0-6) tracks progression.

### Challenge Pattern

**Procedural Station** (all stations):
- Each station is a self-contained R3F component in `src/components/stations/`
- Station owns its own geometry, physics, game logic, and input handling
- Writes results to Zustand store (gamePhase, groundMeatVol, stuffLevel, etc.)
- UI overlays (when implemented) read store for display only

**Note:** The old main branch used ECS orchestrators + bridge patterns. Those are deleted. All stations are now procedural components.

### Game Flow (13 GamePhase values)
```
SELECT_INGREDIENTS → CHOPPING → FILL_GRINDER → GRINDING → MOVE_BOWL →
ATTACH_CASING → STUFFING → TIE_CASING → BLOWOUT → MOVE_SAUSAGE →
MOVE_PAN → COOKING → DONE
```

## Key Files

| File | Purpose |
|------|---------|
| `App.tsx` | Root layout — phase routing (title/playing) |
| `src/store/gameStore.ts` | Zustand store (236 lines, all game state + actions) |
| `src/engine/GameOrchestrator.tsx` | Phase navigation + dev shortcuts (n/p keys) |
| `src/engine/DemandScoring.ts` | Demand scoring — player vs Mr. Sausage's hidden demands |
| `src/engine/RoundManager.ts` | Multi-round loop, C(12,3) combo tracking |
| `src/engine/IngredientMatcher.ts` | Tag/criteria matching for ingredient selection |
| `src/engine/DifficultyConfig.ts` | Difficulty tier configuration |
| `src/engine/DialogueEngine.ts` | Dialogue tree walker |
| `src/engine/AudioEngine.ts` | Tone.js synthesis (single file) |
| `src/engine/Ingredients.ts` | 25 ingredients with stats |
| `src/components/GameWorld.tsx` | R3F Canvas, camera rail, station triggers |
| `src/components/stations/*.tsx` | Procedural station components (9 stations) |
| `src/components/sausage/Sausage.tsx` | SkinnedMesh + Rapier bone-chain physics |
| `src/components/camera/CameraRail.tsx` | Camera rail interpolation between stations |
| `src/components/environment/SurrealText.tsx` | Diegetic in-world UI text |
| `src/components/ui/DialogueOverlay.tsx` | Typewriter text + choices |
| `src/config/difficulty.json` | 5 difficulty tiers (only config file) |

## Commands

```bash
pnpm test                     # Jest tests
pnpm lint                     # Biome lint + format check
pnpm format                   # Biome auto-fix
pnpm typecheck                # TypeScript (node --stack-size=8192)
npx expo start --web          # Dev server
pnpm docs:build               # TypeDoc API docs
```

## Critical Rules

- **pnpm** for package management (not npm/yarn)
- **Biome 2.4** for linting and formatting (not ESLint/Prettier)
- **Zustand** only for game state (no React Context)
- **useRef** for mutable state in `useFrame` callbacks (avoid stale closures)
- **Feature branches** — branch protection on main; use feat/* branches + PRs
- **Squash merge** — preferred merge strategy
- **TSL NodeMaterial** for custom shaders (not raw GLSL ShaderMaterial)
- **`pnpm typecheck`** not `npx tsc --noEmit` (stack overflow with Three.js types)
- **Mock `useGLTF`** in tests (file loading unavailable in Node.js)

## Agent Roster

| Agent | Scope | Key Docs |
|-------|-------|----------|
| `scene-architect` | 3D scene, R3F, lighting, materials, cameras | `docs/3d-rendering.md`, `docs/architecture.md` |
| `challenge-dev` | Challenge overlays, scoring, game flow | `docs/game-design.md`, `docs/state-management.md` |
| `store-warden` | Zustand store, state transitions | `docs/state-management.md`, `docs/architecture.md` |
| `asset-pipeline` | GLB models, textures, CI/CD, deployment | `docs/deployment.md`, `docs/3d-rendering.md` |
| `doc-keeper` | Documentation, JSDoc, frontmatter, TypeDoc | `docs/AGENTS.md`, all docs/ files |

## Parallel Work Boundaries

| Domain A | Domain B | Can Work In Parallel? | Notes |
|----------|----------|----------------------|-------|
| scene-architect | challenge-dev | Yes | Different file sets |
| scene-architect | store-warden | Caution | Both may touch gameStore.ts |
| challenge-dev | store-warden | Caution | Both may touch gameStore.ts |
| asset-pipeline | any | Yes | Different file sets |
| doc-keeper | any | Yes | Docs only |

## Common Pitfalls

See `docs/memory-bank/techContext.md` section "Known Technical Pitfalls" for the full list (12 documented pitfalls).
