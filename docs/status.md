<!--
title: Project Status & Remaining Work
domain: core
status: current
engine: r3f
last-verified: 2026-03-13
depends-on: [architecture, game-design, testing, deployment]
agent-context: doc-keeper
summary: Current completion status — all 28 PRD tasks complete, 37 suites / 397 tests passing, 0 lint errors, 0 TypeScript errors
-->

# Project Status & Remaining Work

**Last updated:** 2026-03-13

## Completion Status

| Domain | % | Status |
|--------|---|--------|
| Core gameplay loop | 100% | All 7 challenges playable, ECS orchestrators, multi-round gameplay, difficulty system |
| 3D visuals | 100% | Horror kitchen with PBR textures, 21 PSX horror props, R3F stations, Rapier physics, GLB mesh culling, CRT shader (TSL NodeMaterial) |
| Physics/Rapier | 95% | Station proximity sensors (KINEMATIC_FIXED + bitmask), GrabbableSausage, GrabSystem, receiver pattern, splatter particles |
| Audio (web) | 90% | 40+ OGG assets cataloged in audio.json, procedural Web Audio API synthesis in AudioEngine.ts, Tone.js in AudioEngine.web.ts, phase-specific music mapping, spatial sounds |
| Audio (native) | 0% | Complete no-op stub |
| UI/UX | 100% | Menu/loading/overlays, challenge transitions, hover tooltips, intro dialogue, settings, difficulty selector, dual-zone touch controls, GameOverScreen, HintDialogue |
| State management | 100% | Zustand store with AsyncStorage persistence, ECS bridge fields, multi-round, hidden objects, cleanup, blowout, XR fields |
| Cross-platform | 70% | Web works well; native uses same Canvas (react-native-wgpu); dual-zone touch controls; VR/AR foundations; untested on devices |
| Testing | 100% | 37 suites, 397 tests, 0 failures |
| Documentation | 95% | Full overhaul: frontmatter, AGENTS.md hierarchy, memory bank, .claude/ agents+commands, JSDoc, TypeDoc |
| CI/CD | 100% | Parallel jobs: lint, typecheck, test, build |
| Production readiness | 50% | Settings + persistence done; dual-zone touch; no mobile device testing |
| PRD tasks | 100% | 28/28 PRD tasks complete |

## What Works

- Full game loop: menu -> loading -> 7 challenges -> results -> menu
- All 7 challenge mechanics with scoring (ingredients, chopping, grinding, stuffing, cooking, blowout, tasting)
- Two challenge architecture patterns:
  - **ECS orchestrator** (grinding/stuffing/cooking): orchestrator OWNS game logic, thin HUD reads store
  - **Bridge pattern** (ingredients/tasting): 2D overlay owns scoring, 3D station handles visuals
- Horror kitchen environment with PBR textures (GLB + AmbientCG bakes)
- 21 PSX horror prop GLBs via tiered HorrorPropsLoader (tier 1 immediate, tier 2 deferred 2s)
- GLB mesh culling: auto-hides artifact meshes extending past room walls
- Rapier physics sensors for station proximity triggers (KINEMATIC_FIXED + activeCollisionTypes bitmask)
- GrabbableSausage: physics-enabled sausage link at stuffer output (RigidBody + CapsuleCollider)
- GrabSystem: raycasting grab/carry/drop mechanic (click grabbable -> carry with bob -> drop on receiver or release to physics)
- Bowl-based blending: BlendCalculator computes color/roughness/chunkiness/shininess from ingredient stats; BlendMaterial renders the ground meat
- Grinder dual rendering: Rapier rigid bodies on web, manual useFrame on native
- Procedural MrSausage3D character with 9 reaction animations
- CRT television with TSL chromatic aberration + scanlines shader (WebGPU-compatible)
- Fluorescent tube flicker animation
- Butcher shop menu screen
- Loading screen with asset preload and sausage progress bar
- Settings screen with music/SFX volume sliders and mute toggles
- State persistence via AsyncStorage (progress + settings survive sessions)
- FPS free-roam navigation (WASD + pointer-lock mouse-look)
- Camera walk animations between stations (easeInOutQuad)
- Target-based furniture placement (resolveTargets — no hardcoded coordinates)
- Zustand state management with full reset/progression flow
- Web audio synthesis (7 SFX instruments + 2 melodies) — all wired into challenges
- Grab/drop sound effects wired into GrabSystem
- Challenge transition title cards with Mr. Sausage quips
- 3D fridge ingredient picking (click shapes, hover tooltips)
- Fridge bridge pattern (3D click -> store -> 2D processing)
- Intro dialogue sequence wired into first challenge
- Dialogue system with typewriter text and branching choices
- Variant system for replayability (seeded challenge difficulty)
- Code splitting (React.lazy, 17 production chunks, ~1.2 MB menu, ~4.6 MB GameWorld on demand)
- 397 passing tests across 37 suites (pure logic + R3F component + Playwright E2E), 0 failures
- GitHub Pages deployment (auto-deploy on push to main)
- Unified cross-platform GameWorld (single file, no platform split)

### Phase 2 Features (2026-03-02 through 2026-03-04)

- **Difficulty system**: 5 tiers (Rare -> Well Done) with DifficultySelector UI ("Choose Your Doneness")
- **ECS orchestrators**: GrinderOrchestrator, StufferOrchestrator, CookingOrchestrator (miniplex 2.0)
- **Enemy encounter system**: 5 enemy types, 5 weapons, 4 spawn cabinets, AI state machine (spawning -> approaching -> attacking -> stunned -> dying -> dead)
- **Blowout challenge**: TieGesture, BlowoutOrchestrator, CerealBox splat, PlaceSetting, BlowoutHUD
- **Multi-round gameplay**: RoundManager (C(12,3) combo tracking), TrapDoorAnimation, RoundTransition UI
- **Hidden objects**: CabinetDrawer (spring animations), KitchenAssembly (equipment parts/stations), HiddenObjectOverlay
- **Cleanup mechanics**: ProceduralSink, CleanupManager, CleanupHUD
- **Dual-zone touch controls**: left-thumb movement joystick + right-thumb look zone (with Rapier sensor detection)
- **Playwright E2E tests**: GameGovernor at `window.__gov`, headed system Chrome, real playthrough screenshots
- **InputManager**: Universal input with JSON bindings, keyboard/mouse/gamepad/touch normalization
- **Horror scene dressing**: 21 PSX GLBs via tiered HorrorPropsLoader

### Documentation Infrastructure (2026-03-01)

- Frontmatter on all 32 docs (9 core + 21 plans + 2 AGENTS.md)
- AGENTS.md hierarchy (root, docs/, docs/plans/, memory-bank/) for multi-agent coordination
- Memory bank (7 files): projectbrief, productContext, systemPatterns, techContext, activeContext, progress, AGENTS.md
- `.claude/agents/` (5 agents): scene-architect, challenge-dev, store-warden, asset-pipeline, doc-keeper
- `.claude/commands/` (3 commands): playtest, lint-and-test, update-docs
- JSDoc coverage across ~47 production source files (up from ~21% to ~90%+)
- TypeDoc configuration (`docs/typedoc.json`) for API docs generation
- `.github/copilot-instructions.md` for GitHub Copilot context
- CLAUDE.md refactored to thin wrapper pointing to docs/ for details

## Recent Milestones

| Date | Milestone |
|------|-----------|
| 2026-03-01 | Documentation overhaul complete (frontmatter, AGENTS.md, memory bank, JSDoc, TypeDoc) |
| 2026-03-01 | CLAUDE.md refactored to thin project-entry wrapper |
| 2026-03-01 | Physics/Rapier integration (sensors, GrabbableSausage, GrabSystem, receiver pattern) |
| 2026-03-01 | Bowl-based blending (BlendCalculator + BlendMaterial) |
| 2026-03-01 | Settings screen with volume/mute + AsyncStorage persistence |
| 2026-02-28 | Code splitting implemented (17 chunks, lazy GameWorld) |
| 2026-02-27 | Babylon.js -> R3F migration complete (all 3D components, 93 new tests) |
| -- | GitHub Pages deployment live |
| 2026-03-04 | Dual-zone touch controls + Rapier sensor detection + Playwright E2E |
| 2026-03-03 | Cross-platform systems (XR input, VR locomotion, AR placement, spatial audio, accessibility) |
| 2026-03-02 | Phase 2 Sprint 3 complete (blowout, multi-round, hidden objects, cleanup) |
| 2026-03-02 | Phase 2 Sprint 2 complete (enemy encounters, combat system) |
| 2026-03-02 | Phase 2 Sprint 1 complete (difficulty system, horror props, InputManager) |
| 2026-03-02 | Phase 1 gaps completed (fridge pull, ingredient GLBs, pan flip, hopper, continue button) |
| 2026-03-13 | All 28 PRD tasks complete; 37 suites / 397 tests all passing; 0 lint errors; 0 TypeScript errors |
| -- | Branch main, 30+ commits ahead of origin |
| -- | All 7 challenges playable end-to-end |
| -- | CRT shader migrated to TSL NodeMaterial |

## Babylon.js -> React Three Fiber Migration (Completed 2026-02-27)

Full migration from Babylon.js/reactylon to R3F/Three.js:
- All 3D components rewritten as declarative R3F JSX
- Platform split eliminated (GameWorld.web.tsx + GameWorld.native.tsx -> single GameWorld.tsx)
- R3F component tests added via @react-three/test-renderer (93 new tests)
- Babylon.js, reactylon, and related deps fully removed
- `babel-plugin-reactylon` removed, `unstable_transformImportMeta` added for zustand compatibility

## Untracked Assets (not in git)

- `public/models/kitchen.glb` (15.5 MB) -- **Required for game to render**. Consider Git LFS.
- `public/models/kitchen-original.glb` (970 KB)
- `public/models/sausage.glb` (1 MB)
- `public/textures/` (19 texture files, ~10 MB total)

**Large files to NOT commit:**
- `Kitchen Sound Effects.zip` (27 MB)
- `KitchenTools.zip` (55 MB)
- `cocina.glb` (6.1 MB)
- `fbxfileskitchenbystyloo.zip` (3.5 MB)
- `funny sausag.obj` (4.1 MB)

## Remaining Work (Prioritized)

### Priority 1: Polish & Production

1. **Commit `public/` assets** -- The game literally doesn't render without these. Consider Git LFS for kitchen.glb (15.5 MB).
2. **Loading screen polish** -- Visual improvements to loading state.

### Priority 2: Cross-Platform

5. **Native audio engine** -- Implement `AudioEngine.ts` using `expo-av` or `react-native-audio-api`.
6. **Mobile device testing** -- Verify dual-zone touch controls, layout scaling, performance on actual iOS/Android devices.
7. **Android APK build** -- Set up in CI.

### Priority 3: Nice-to-Have

8. **Leaderboard** -- Local or cloud-based high score tracking.
9. **More ingredients** -- Expand from 25 to 50+ for variety.
10. **Achievements** -- "First S Rank", "Complete without hints", etc.
11. **XR polish** -- VR/AR foundations exist (@react-three/xr); needs device testing and UX refinement.
