---
title: Progress
domain: memory-bank
status: current
last-verified: "2026-03-13"
summary: "What works, what doesn't, milestones completed"
---

# Progress — Will It Blow?

**Last updated:** 2026-03-13

## Completion Overview

| Domain | % | Status |
|--------|---|--------|
| Core gameplay loop | 55% | 8 stations exist as procedural components; phase machine drives progression; missing HUDs, results screen, and most challenge scoring |
| 3D visuals | 65% | Greenfield procedural stations + GLB kitchen; camera rail; SurrealText; PhysicsFreezerChest and ProceduralIngredients partial |
| Physics/Rapier | 60% | Bone-chain sausage body ported (spring forces, SkinnedMesh); station colliders; PhysicsFreezerChest partially wired |
| Audio | 40% | Single AudioEngine.ts (Tone.js); OGG samples referenced but no .web.ts split; minimal station wiring |
| Camera system | 85% | CameraRail + IntroSequence + FirstPersonControls; smooth interpolation works |
| Demand scoring | 75% | DemandScoring.ts works; IngredientMatcher.ts works; store wiring exists; no UI to display results |
| Multi-round | 70% | RoundManager with C(12,3) combo tracking works; TrapDoorAnimation exists; no RoundTransition UI |
| State management | 60% | Zustand store (236 lines) with 13-phase GamePhase; dead fields exist; no full game reset; `finalScore` typed as `any` |
| Mobile controls | 40% | PlayerHands, SwipeFPSControls exist; no joystick overlay; untested on devices |
| Testing | 15% | 7 test suites, 62 tests total (52 pass, 10 fail); down from 1529+ tests on main |
| Documentation | 50% | Frontmatter added; content largely describes main branch, not actual greenfield state |
| CI/CD | 80% | Parallel jobs configured; needs update for reduced test suite and removed files |

## What Works (Greenfield POC — feat/poc-exploration)

### Procedural Stations (`src/components/stations/`)

Self-contained R3F components with own geometry, physics, and game logic:
- `Grinder.tsx` — Procedural grinder with crank mechanics
- `Stuffer.tsx` — Casing fill with pressure management
- `Stove.tsx` — Heat control with FBO grease wave simulation
- `ChoppingBlock.tsx` — Knife gesture mechanics
- `ChestFreezer.tsx` — Ingredient selection station (stub — no interactivity)
- `PhysicsFreezerChest.tsx` — Physics-enabled chest freezer (partial — geometry only)
- `BlowoutStation.tsx` — Casing tie-off and blowout
- `TV.tsx` — CRT television with Mr. Sausage
- `Sink.tsx` — Cleanup station between rounds

### Camera System (`src/components/camera/`)
- `CameraRail.tsx` — Smooth camera movement between stations
- `IntroSequence.tsx` — Opening camera tour
- `FirstPersonControls.tsx` — Limited look-around within station views
- `PlayerHands.tsx` — First-person hand rendering

### Sausage Physics (`src/components/sausage/`)
- `Sausage.tsx` — SkinnedMesh with Rapier rigid bodies per bone segment
- `SausageGeometry.ts` — Procedural tube geometry, SausageCurve, SausageLinksCurve
- Spring forces tie physics bodies to visual bones via custom `useFrame` hook

### Engine (`src/engine/`)
- `DemandScoring.ts` — Player decisions vs Mr. Sausage's hidden demands
- `IngredientMatcher.ts` — Tag-based ingredient matching
- `RoundManager.ts` — Multi-round loop with C(12,3) combo tracking
- `DifficultyConfig.ts` — Difficulty tier configuration (reads `difficulty.json`)
- `DialogueEngine.ts` — Dialogue tree walker (effects system untested and likely dead)
- `GameOrchestrator.tsx` — Phase navigation with dev shortcuts (n/p keys)
- `AudioEngine.ts` — Tone.js synthesis (single file, no platform split)
- `Ingredients.ts` — 25 ingredients with stats

### Environment (`src/components/environment/`)
- `Kitchen.tsx` — GLB kitchen scene placeholder (stub)
- `BasementRoom.tsx` — Room enclosure
- `SurrealText.tsx` — Diegetic in-world 3D text meshes
- `ScatterProps.tsx` + `Prop.tsx` — Horror scene dressing

### UI (`src/components/ui/`)
- `TitleScreen.tsx` — Start menu
- `DifficultySelector.tsx` — Difficulty tier selection
- `DialogueOverlay.tsx` — Typewriter text + choices

### Kitchen (`src/components/kitchen/`)
- `KitchenSetPieces.tsx` — Equipment and furniture placement
- `LiquidPourer.tsx` — Liquid pour effects
- `ProceduralIngredients.tsx` — Procedural ingredient meshes (partial)
- `TrapDoorAnimation.tsx` + `TrapDoorMount.tsx` — Escape sequence visuals

### Infrastructure
- Git LFS for binary assets (.ogg, .png, .glb)
- OGG audio samples in `public/audio/`
- Biome 2.4 linting and formatting
- Single config file: `src/config/difficulty.json`

## What Doesn't Work / Known Gaps

### Missing Components (exist on main, absent from this branch)
- **GameOverScreen** — No results/victory/defeat screen; `appPhase: 'results'` renders nothing
- **LoadingScreen** — Suspense fallback is `null`; no asset preload UI
- **ChallengeHeader** — No "CHALLENGE N/7" header
- **StrikeCounter** — No strike/lives display
- **ProgressGauge** — No animated progress bar
- **All HUDs** — GrindingHUD, StuffingHUD, CookingHUD, BlowoutHUD all missing
- **TastingChallenge** — No verdict/score reveal UI
- **IngredientChallenge** — No ingredient picking overlay
- **RoundTransition** — No between-round transition UI
- **CRT shader** — No CrtShader.ts or CrtTelevision.tsx; TV.tsx uses basic materials

### Missing Engine Files (exist on main, absent from this branch)
- **ChallengeRegistry.ts** — No variant selection or challenge configs
- **SausagePhysics.ts** — No pure scoring functions
- **assetUrl.ts** — No dynamic asset URL resolution (`getWebBasePath()`)
- **AudioEngine.web.ts** — No separate web audio engine (single AudioEngine.ts handles both)

### Missing Config Files
- `enemies.json` — No enemy encounter config
- `blowout.json` — No blowout challenge config

### Store Issues
- `dialogueActive` field: setter exists, never read by any component
- `currentDialogueLine` field: setter exists, DialogueOverlay uses internal ref instead
- `finalScore` typed as `any` — needs proper interface
- No `returnToMenu()` or full game reset action
- `nextRound()` resets per-round state but no way to start fresh game

### GameOrchestrator Gaps
- PHASES array has 11 entries, missing `TIE_CASING` and `BLOWOUT` from GamePhase type
- Dev shortcuts (n/p keys) skip those 2 phases entirely
- No production UI for phase navigation (relies on dev shortcuts)

### Test Issues
- 10 failing tests out of 62 (83.9% pass rate)
- SurrealText.spec.tsx fails (R3F test-renderer import issues)
- gameStore.test.ts has failures (tests reference actions that don't exist)
- Console suppression in App.tsx hides `Maximum update depth exceeded` React errors

### Stub/Partial Components
- `Kitchen.tsx` — Returns empty fragment, no GLB loading
- `ChestFreezer.tsx` — Basic geometry, no interactivity
- `PhysicsFreezerChest.tsx` — Physics bodies exist but no picking/selection logic

## Architecture Superseded by POC Pivot

The following systems were deleted from main and are NOT on this branch:

- **ECS (miniplex)**: 75 files — entity-component-system, orchestrators, systems, renderers
- **Layout system**: resolveLayout, FurnitureLayout, gen-anchors, target placement
- **InputManager**: Universal input with JSON bindings
- **FPS free-walk**: FPSController, MobileJoystick, WASD + pointer-lock
- **Enemy encounters**: EnemySpawnSystem, CombatSystem, CabinetBurst
- **Hidden objects**: CabinetDrawer, KitchenAssembly, HiddenObjectOverlay
- **Cleanup mechanics**: CleanupManager, CleanupHUD
- **Horror props loader**: HorrorPropsLoader tiered loading
- **Code splitting**: React.lazy() + Suspense at phase boundaries
- **WebXR**: @react-three/xr integration
- **AsyncStorage persistence**: Settings/progress save/load
- **CRT shader**: TSL NodeMaterial chromatic aberration

These may be selectively re-implemented as the greenfield rebuild matures.

## Milestones

| Date | Milestone |
|------|-----------|
| 2026-03-13 | Gap analysis: comprehensive review of feat/poc-exploration vs main |
| 2026-03-13 | POC value extraction: physics pitfalls, Gemini URL, interaction patterns folded into domain docs |
| 2026-03-13 | Documentation overhaul: memory-bank updates, frontmatter, DRY content |
| 2026-03-12 | Multi-round replayability and missing interactions restored |
| 2026-03-12 | Full production parity: dialogue system, mobile controls |
| 2026-03-11 | Demand scoring and ingredient matching systems restored |
| 2026-03-11 | Advanced POC physics ported (Rapier bone-chain sausage) |
| 2026-03-10 | Greenfield procedural rewrite with hybrid asset injection |
| 2026-03-10 | Git LFS configured for binary assets |
| 2026-03-04 | PR #33 merged to main: dual-zone touch controls, Rapier fix |
| 2026-03-03 | Phase 2 Sprints 1-3 complete on main (superseded by POC pivot) |
| 2026-03-01 | Documentation overhaul v1 (frontmatter, AGENTS.md, memory bank) |
| 2026-02-27 | Babylon.js to R3F migration complete |
