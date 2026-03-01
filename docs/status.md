<!--
title: Project Status & Remaining Work
domain: core
status: current
engine: r3f
last-verified: 2026-03-01
depends-on: [architecture, game-design, testing, deployment]
agent-context: doc-keeper
summary: Current completion status reflecting physics/Rapier, grab system, bowl blending, settings, persistence, and documentation overhaul
-->

# Project Status & Remaining Work

**Last updated:** 2026-03-01

## Completion Status

| Domain | % | Status |
|--------|---|--------|
| Core gameplay loop | 95% | All 5 challenges playable, 3D fridge interaction, grab system, bowl blending, transitions |
| 3D visuals | 80% | Horror kitchen with PBR textures, R3F stations, 3D fridge picking, Rapier physics |
| Physics/Rapier | 90% | Station proximity sensors, GrabbableSausage, GrabSystem, receiver pattern, splatter particles |
| Audio (web) | 70% | All challenges wired: grinder, squelch, pressure, sizzle, burst, picks, rating song, ambient drone, grab/drop SFX |
| Audio (native) | 0% | Complete no-op stub |
| UI/UX | 80% | Menu/loading/overlays, challenge transitions, hover tooltips, intro dialogue, settings screen with volume/mute |
| State management | 95% | Zustand store with AsyncStorage persistence (progress + settings), grab state, bowl/blend tracking |
| Cross-platform | 60% | Web works well; native uses same Canvas (react-native-wgpu), untested on devices |
| Testing | 90% | 253 unit tests across 23 test files (pure logic + R3F component tests) |
| Documentation | 95% | Full overhaul: frontmatter, AGENTS.md hierarchy, memory bank, .claude/ agents+commands, JSDoc, TypeDoc |
| CI/CD | 50% | Tests run; no tsc, no lint, no Android build |
| Production readiness | 35% | Settings + persistence done; no mobile testing |

## What Works

- Full game loop: menu -> loading -> 5 challenges -> results -> menu
- All 5 challenge mechanics with scoring
- Horror kitchen environment with PBR textures (GLB + AmbientCG bakes)
- Rapier physics sensors for station proximity triggers (replace distance-based checks)
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
- 253 passing tests across 23 test files (pure logic + R3F component tests via @react-three/test-renderer)
- GitHub Pages deployment (auto-deploy on push to main)
- Unified cross-platform GameWorld (single file, no platform split)

### Documentation Infrastructure (2026-03-01)

- Frontmatter on all 26 docs (9 core + 15 plans + 2 AGENTS.md)
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
| -- | 253 tests passing |
| -- | All 5 challenges playable end-to-end |
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

### Priority 1: Ship What Exists

1. **Commit `public/` assets** -- The game literally doesn't render without these. Consider Git LFS for kitchen.glb (15.5 MB).
2. **Add `.gitignore` entries** for loose zip files and asset packs.
3. **Fix CI** -- Add `npx tsc --noEmit` and lint steps to ci.yml.

### Priority 2: Polish & Production

4. **BUT FIRST events** -- Mid-challenge interruption mechanic (scoring formula accounts for bonus).
5. **Background music** -- Ambient horror drone or dark synth loop.
6. **Ambient SFX** -- Fridge hum, dripping water, distant clanking, flickering light buzz.
7. **Loading screen polish** -- Visual improvements to loading state.

### Priority 3: Cross-Platform

8. **Native audio engine** -- Implement `AudioEngine.ts` using `expo-av` or `react-native-audio-api`.
9. **Mobile testing** -- Verify touch interactions, layout scaling, performance on actual devices.
10. **Android APK build** -- Set up in CI.

### Priority 4: Nice-to-Have

11. **Leaderboard** -- Local or cloud-based high score tracking.
12. **More ingredients** -- Expand from 25 to 50+ for variety.
13. **Achievements** -- "First S Rank", "Complete without hints", etc.
14. **XR mode** -- Explore @react-three/xr integration for immersive play.
