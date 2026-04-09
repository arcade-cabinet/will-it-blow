# AGENTS.md — Will It Blow?

Entry point for all AI agents. Read this first, then follow the pointer chain.

## Project Identity

**"Will It Blow?" is a horror deduction game disguised as a cooking show.** A loving (and deeply unhinged) tribute to the YouTube channel *Ordinary Sausage*, taken to its logical extreme: what if the absurdity of "I put X in a sausage" escalated until X = you?

**The fiction**: the player wakes up in a basement, having been dropped through a ceiling trapdoor by Mr. Sausage (a Jigsaw-Billy-style puppet broadcasting from a CRT TV that swivels to track the player). The goal is to satisfy Mr. Sausage's hunger by reading his surreal trait-based clues ("My tummy rumbles for something squishy and pointy"), selecting matching ingredients from a fridge of normal + cursed options, processing them through a grind-stuff-blow-cook-present pipeline, and serving the result. Each successful match consumes those ingredients from the fridge permanently. **Win** = fridge empty → you walk out. **Lose** = disgust meter maxed → you become the next ingredient.

**Design pillars** (violate these and you've drifted from the vision):

1. **Zoombinis-in-Hell deduction loop** — every ingredient has a rich, overlapping trait set. Clues are trait queries. Multiple ingredients can satisfy any clue. Memorization is impossible because the PRNG is seeded per-save. See `src/engine/IngredientComposition.ts` for the trait vocabulary and `traits + composition` on every ingredient in `ingredients.json`.

2. **Visceral ingredient transformation as gameplay feedback** — the translucent casing, water bowl, grinder particles, and frying pan behaviour aren't decoration. They're **diagnostic surfaces** the player reads to understand their current mix. Every ingredient has a `composition` profile (decomposition type, colour, shine, moisture, fat, density, particle scale) that flows through the grinder → stuffer → sausage → stove → blowout pipeline. If the player can't see the mix changing, the loop is broken.

3. **Will It Blow = midpoint, not climax** — after stuffing, the player aims the stuffing tube + casing at a cereal box with a surreal drawing, blows, and the spray lands as a persistent composite-colour splatter on the box's dynamic canvas texture. Mr. Sausage watches and scores. This is the first HARD-COMMIT moment — before blowing, the player can fix mistakes; after, they can't.

4. **Presentation is the actual climax** — at round end, the ceiling trapdoor (same trapdoor Mr. Sausage dropped the player through) opens and a plate on a rope lowers. The player places the finished sausage on the plate. The plate ascends. A beat of silence while Mr. Sausage tastes. Then the verdict.

5. **Style points accumulate throughout** — every station interaction generates style points based on quality. Mr. Sausage watches the entire session from his TV and grades the cumulative performance on top of the sausage itself. Cramming 6-8 ingredients into one sausage is a legal speedrun option but Mr. Sausage's mood (PRNG-seeded) decides whether cleverness is rewarded or punished — he actively enjoys torturing speedrunners.

6. **Horror tone = SAW / Texas Chainsaw** — **not** cosy cooking show. Hospital fluorescent lighting (cold green-white, flickering ballasts), stainless-steel operating-theatre framing on stations, Jigsaw Billy TV presentation, wall-mounted chainsaw with dried blood, bear trap by the mattress, cage in the far corner with the previous contestant. **But**: horror by implication, not gore. The camera never shows the bodies — only the BEFORE (dropped in, clues on walls) and the AFTER (TV cuts to static).

7. **Fully diegetic UI** — zero 2D overlays during gameplay. Clues, scores, hunger, disgust, dialogue, verdicts — all rendered as SurrealText on in-world surfaces or via the Jigsaw TV. Pre-game screens (title + difficulty) may use Tailwind + DaisyUI; gameplay may not.

**Stack**: React 19 + React Three Fiber + Three.js + Rapier + Capacitor 6. Web-first, native wrapped via Capacitor (iOS/Android). Koota ECS for all runtime state. Tone.js for audio synthesis. Vitest + Playwright-provider browser tests for visual behavior.

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
- **Vitest** for jsdom unit tests (`pnpm test`)
- **Vitest browser mode** with Playwright provider for 4-tier browser validation (`pnpm test:browser`)
  - See `docs/testing/deep-browser-validation.md` for the full harness reference
  - Tiers: unit → micro → meso → macro (Yuka GOAP playthroughs)
  - 4 viewports: desktop-1280, mobile-390, tablet-768, uhd-3840
- `pnpm test:browser:src` for colocated browser tests under `src/`

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
pnpm test:browser:src       # colocated browser tests under src/
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

## Build Principles (quality bar)

These are enforced on new code and retrofitted to old code when touched:

1. **JSON as single source of truth** — every data-driven value (ingredients, tunables, scoring weights, round config, station positions, dialogue, Mr. Sausage reactions) lives in `src/config/*.json` and is read via a typed accessor in `src/config/*.ts`. **No hardcoded duplicates in engine/ or components/.** Example: the old hand-maintained `INGREDIENT_MODELS` array in `Ingredients.ts` was collapsed into a thin re-export layer over `config/ingredients.json` + `engine/IngredientComposition.ts`. Replicate that pattern for any hardcoded data.

2. **Test-driven** — new modules ship with a contract test file that pins behavior BEFORE consumers are written. Example: `src/engine/__tests__/IngredientComposition.test.ts` pins the schema + helpers before the Stuffer/Grinder/Stove/BlowoutStation consume them. When adding a feature, the test file is the first edit in the slice.

3. **Doc-driven** — every non-trivial module leads with a module-level JSDoc that explains the WHY, not the WHAT. The code shows what; the doc header should let a fresh reader understand the design intent before they see the types. Example header: `src/engine/IngredientComposition.ts` opens with a narrative paragraph about the Zoombinis pillar and the composition pipeline role.

4. **LOC discipline** — keep files focused on one concern. When a file grows past ~400 LOC, split along seams (data / helpers / components / tests). Flagged for splitting later: `App.tsx`, `Grinder.tsx`, `Stove.tsx`, `BlowoutStation.tsx`.

5. **No dead code** — delete, don't comment out. `git log` is the history. Removed this session: `cameraConfig.skins`, hardcoded `INGREDIENT_MODELS`, `hands.glb` (old placeholder), unused dead GLBs, `public/textures/hands/` source-asset junk.

6. **Explicit types at module boundaries** — exported functions and interfaces must have explicit parameter + return types. `any` is a code smell, not a shortcut.

7. **No React re-renders for per-frame state** — per-frame animation signals live in refs or module-level singletons, not Koota or React state. Pattern: `handGestureStore.ts`, `playerPosition.ts`, `useMouseLook.ts`.

8. **Browser tests for visual behavior** — unit tests (`src/**/__tests__/*.test.ts`) for pure logic; browser tests (`tests/micro/*.browser.test.tsx`) for anything touching R3F geometry / materials / animation / visibility. Example: `tests/micro/PlayerHands.browser.test.tsx` verifies posture-gated visibility in a real Canvas.

9. **Seeded deterministic RNG per save** — no `Math.random()` in gameplay code. All randomization routes through a save-seeded RNG that's saved to the db and never exposed to the player. See task #45.

10. **Commit in coherent slices** — data layer → consumer layer → visuals → tests. Each commit leaves the codebase in a working state (typecheck + tests green).

11. **Named exports, not default** — easier to grep, easier to refactor, easier for agents to find.

12. **Zero 2D overlays during gameplay** — rendered via SurrealText on in-world surfaces or the Jigsaw TV. See diegetic pillar in Project Identity above.

## Critical Rules

- **pnpm** for package management (not npm/yarn)
- **Biome** for linting/formatting (not ESLint/Prettier)
- **Koota ECS** for all state — no Zustand, no React Context
- **Diegetic only** — zero 2D overlays during gameplay
- **Tailwind CSS + DaisyUI** for pre-game UI components only
- **useRef** for mutable state in `useFrame` (avoid stale closures)
- **Feature branches** — branch protection on main
- **No git worktrees** — they base off wrong commits every time
