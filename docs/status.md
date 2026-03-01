<!--
title: Project Status & Remaining Work
domain: core
status: stale
engine: r3f
last-verified: 2026-03-01
depends-on: [architecture, game-design, testing, deployment]
agent-context: doc-keeper
summary: Current completion status — needs update for physics/Rapier work
-->

# Project Status & Remaining Work

**Last updated:** 2026-02-28

## Completion Status

| Domain | % | Status |
|--------|---|--------|
| Core gameplay loop | 90% | All 5 challenges playable, 3D fridge interaction, transitions |
| 3D visuals | 75% | Horror kitchen with PBR textures, R3F stations, 3D fridge picking |
| Audio (web) | 70% | All challenges wired: grinder, squelch, pressure, sizzle, burst, picks, rating song, ambient drone |
| Audio (native) | 0% | Complete no-op stub |
| UI/UX | 75% | Menu/loading/overlays, challenge transitions, hover tooltips, intro dialogue |
| Cross-platform | 60% | Web works well; native uses same Canvas (expo-gl), untested on devices |
| Testing | 90% | 259 unit tests (pure logic + R3F component tests) |
| Git hygiene | 30% | Large uncommitted assets |
| CI/CD | 50% | Tests run; no tsc, no lint, no Android build |
| Production readiness | 25% | No save/load, no settings, no mobile testing |

## What Works

- Full game loop: menu → loading → 5 challenges → results → menu
- All 5 challenge mechanics with scoring
- Horror kitchen environment with PBR textures (GLB + AmbientCG bakes)
- Procedural MrSausage3D character with 9 reaction animations
- CRT television with chromatic aberration shader
- Fluorescent tube flicker animation
- Butcher shop menu screen
- Loading screen with asset preload
- Camera walk animations between stations (easeInOutQuad)
- Zustand state management with full reset/progression flow
- Web audio synthesis (7 SFX instruments + 2 melodies) — all wired into challenges
- Challenge transition title cards with Mr. Sausage quips
- 3D fridge ingredient picking (click shapes, hover tooltips)
- Intro dialogue sequence wired into first challenge
- Dialogue system with typewriter text and branching choices
- Variant system for replayability (seeded challenge difficulty)
- 259 passing tests (pure logic + R3F component tests via @react-three/test-renderer)
- GitHub Pages deployment
- Unified cross-platform GameWorld (single file, no platform split)

## Recent Migration: Babylon.js → React Three Fiber

Completed 2026-02-27. Full migration from Babylon.js/reactylon to R3F/Three.js:
- All 3D components rewritten as declarative R3F JSX
- Platform split eliminated (GameWorld.web.tsx + GameWorld.native.tsx → single GameWorld.tsx)
- R3F component tests added via @react-three/test-renderer (93 new tests)
- Babylon.js, reactylon, and related deps fully removed
- `babel-plugin-reactylon` removed, `unstable_transformImportMeta` added for zustand compatibility

## Untracked Assets (not in git)

- `public/models/kitchen.glb` (15.5 MB) — **Required for game to render**. Consider Git LFS.
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

1. **Commit `public/` assets** — The game literally doesn't render without these. Consider Git LFS for kitchen.glb (15.5 MB).
2. **Add `.gitignore` entries** for loose zip files and asset packs.
3. **Fix CI** — Add `npx tsc --noEmit` and lint steps to ci.yml.

### Priority 2: Complete Core Features

4. ~~**Hint system** — Wire HintButton to trigger ingredient glow in FridgeStation.~~ DONE — hints pulse matching ingredients in fridge
5. ~~**Ingredient challenge audio** — No sound on correct/wrong pick.~~ DONE — playCorrectPick/playWrongPick wired

### Priority 3: Polish & Production

6. **BUT FIRST events** — Mid-challenge interruption mechanic (scoring formula accounts for bonus).
7. **Settings menu** — Volume control, mute toggle.
8. **Save/load** — Persist `totalGamesPlayed` and high scores to AsyncStorage/localStorage.
9. **Background music** — Ambient horror drone or dark synth loop.
10. **Ambient SFX** — Fridge hum, dripping water, distant clanking, flickering light buzz.

### Priority 4: Cross-Platform

11. **Native audio engine** — Implement `AudioEngine.ts` using `expo-av` or `react-native-audio-api`.
12. **Mobile testing** — Verify touch interactions, layout scaling, performance on actual devices.
13. **Android APK build** — Set up in CI.

### Priority 5: Nice-to-Have

14. **Leaderboard** — Local or cloud-based high score tracking.
15. **More ingredients** — Expand from 25 to 50+ for variety.
16. **Achievements** — "First S Rank", "Complete without hints", etc.
