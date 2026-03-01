# Progress — Will It Blow?

**Last updated:** 2026-03-01

## Completion Overview

| Domain | % | Status |
|--------|---|--------|
| Core gameplay loop | 90% | All 5 challenges playable, 3D fridge interaction, transitions |
| 3D visuals | 75% | Horror kitchen with PBR textures, R3F stations, 3D fridge picking |
| Audio (web) | 70% | All challenges wired: grinder, squelch, pressure, sizzle, burst, picks, rating song, ambient drone |
| Audio (native) | 0% | Complete no-op stub |
| UI/UX | 75% | Menu/loading/overlays, challenge transitions, hover tooltips, intro dialogue |
| Cross-platform | 60% | Web works well; native untested on devices |
| Testing | 90% | 256+ tests (pure logic + R3F component tests) |
| CI/CD | 50% | Tests run on push; no tsc, no lint, no Android build in CI |
| Documentation | 80% | All docs have frontmatter, memory bank created, AGENTS.md hierarchy |
| Production readiness | 25% | No save/load, no settings, no mobile testing |

## What Works

- Full game loop: menu -> loading -> 5 challenges -> results -> menu
- All 5 challenge mechanics with per-challenge scoring (0-100)
- Final verdict system (S/A/B/F rank based on average score)
- Horror kitchen environment with PBR textures (tile floor/walls, concrete ceiling, grime decals)
- GLB furniture loading (fridge, grinder, stuffer, stove) via useGLTF
- Procedural MrSausage3D character with 9 reaction animations
- CRT television with TSL chromatic aberration + scanlines shader
- Fluorescent tube flicker animation
- Butcher shop menu screen
- Loading screen with asset preload and sausage progress bar
- FPS free-roam navigation (WASD + pointer-lock mouse-look)
- Camera walk animations between stations (easeInOutQuad, ~2.5s)
- Target-based furniture placement (resolveTargets)
- Rapier physics sensors for station proximity triggers
- 3D fridge ingredient picking (click shapes, hover tooltips)
- Fridge bridge pattern (3D click -> store -> 2D processing)
- Intro dialogue sequence with typewriter text and branching choices
- Variant system for replayability (seeded challenge difficulty)
- Web audio synthesis (7 SFX instruments + 2 melodies)
- Code splitting (17 chunks, ~1.2 MB menu, ~4.6 MB GameWorld on demand)
- 256+ passing tests (pure logic + R3F component tests via @react-three/test-renderer)
- GitHub Pages deployment (auto-deploy on push to main)
- Unified cross-platform GameWorld (single file, no platform split)

## What Doesn't Work / Needs Fix

- Loading screen visual polish needed
- Title screen Settings and Continue buttons are stubs (no implementation behind them)
- `docs/status.md` is stale — doesn't reflect physics/Rapier or latest work
- Some dialogue reactivity edge cases
- Mobile touch controls untested on real devices
- Native audio is a complete no-op
- Hint glow — HintButton exists but only shows when NO challenge is active (likely a bug)
- Large assets may not be in git (kitchen.glb 15.5 MB, textures ~10 MB)

## What's Next

### Near Term
- Sausage model integration (funny_sausage.glb)
- Dialogue resilience improvements
- Sound design implementation (integrate Kitchen Sound Effects pack)
- Status.md update for physics/Rapier work

### Medium Term
- BUT FIRST events (mid-challenge interruptions, bonus scoring)
- Settings menu (volume control, mute toggle)
- Save/load system (AsyncStorage/localStorage for high scores)
- Background music (ambient horror drone)
- Ambient SFX (fridge hum, dripping water, light buzz)

### Long Term
- Native audio engine (expo-av or react-native-audio-api)
- Mobile testing and polish on real devices
- Android APK build in CI
- XR mode exploration
- Leaderboard
- More ingredients (expand from 25 to 50+)
- Achievements system

## Milestones Completed

| Date | Milestone |
|------|-----------|
| 2026-02-27 | Babylon.js -> R3F migration complete (all 3D components, 93 new tests) |
| 2026-02-28 | Code splitting implemented (17 chunks, lazy GameWorld) |
| 2026-03-01 | Documentation overhaul (frontmatter, AGENTS.md, memory bank) |
| — | GitHub Pages deployment live |
| — | 256+ tests passing |
| — | All 5 challenges playable end-to-end |
| — | CRT shader migrated to TSL NodeMaterial |
| — | Physics/Rapier sensors for station proximity |
