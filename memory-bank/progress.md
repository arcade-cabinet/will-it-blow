# Progress — Will It Blow?

**Last updated:** 2026-03-02

## Completion Overview

| Domain | % | Status |
|--------|---|--------|
| Core gameplay loop | 95% | All 5 challenges playable via ECS orchestrator game drivers |
| ECS architecture | 90% | 6 input primitives, 3 machine archetypes, 3 orchestrator game drivers |
| 3D visuals | 85% | Horror kitchen, PBR textures, GLB furniture, ECS-driven machine animations |
| Physics/Rapier | 60% | Station proximity sensors, GrabbableSausage; sausage body physics NOT ported from POC |
| Audio (web) | 70% | All challenges wired: grinder, squelch, pressure, sizzle, burst, picks, countdown beeps, rating song, ambient drone |
| Audio (native) | 0% | Complete no-op stub |
| UI/UX | 85% | Menu/loading/overlays, thin HUDs, challenge transitions, hover tooltips, intro dialogue, settings |
| State management | 95% | Zustand store with orchestrator→HUD bridge fields, AsyncStorage persistence |
| Cross-platform | 60% | Web works well; native untested on devices |
| Testing | 95% | 769 tests across 55 test files (pure logic + R3F component tests) |
| Documentation | 95% | Frontmatter on 26 docs, AGENTS.md hierarchy, memory bank, JSDoc ~90%+, TypeDoc |
| CI/CD | 50% | Tests run on push; no tsc, no lint, no Android build in CI |

## What Works (Phase 1 Complete)

### ECS Architecture (2026-03-02)
- **6 input primitive systems**: toggle, plunger, crank, dial, button, slider
- **InputContract binding**: wires inputs to power sources (e.g., dial segment → powerLevel)
- **InputRenderer**: R3F pointer events → ECS input primitives
- **3 renderers**: MeshRenderer (geometry), LightRenderer (point lights), LatheRenderer (sausage links)
- **3 machine archetypes**: grinder (toggle+plunger), stuffer (crank), stove (dial)
- **Slot-based composition**: universal primitives → category templates → concrete machines

### Orchestrator Game Drivers (2026-03-02)
- **GrinderOrchestrator**: phase machine, ECS crank velocity → speed zones (slow/good/fast), progress tracking, strike on 'fast' zone with cooldown, timer (1.5x when slow), scoring (100 - strikes×15), audio (startGrinder/stopGrinder/playPour), Mr. Sausage reactions
- **StufferOrchestrator**: phase machine, ECS crank angularVelocity → fill/pressure physics, burst detection (pressure > threshold → strike, fill -20), timer with countdown beeps, scoring (100 - bursts×20), sausage link extrusion via skinned mesh, casing inflation with pressure color shift
- **CookingOrchestrator**: phase machine, ECS dial powerLevel → temperature physics (heatRate×power - coolingRate), hold timer in target zone (decays 0.5x outside), overheat detection at targetTemp + tolerance×2, scoring (100 - overheats×15 + noOverheat bonus 10), sausage color progression (raw→cooked→charred→burnt), steam/smoke particles, pan flip animation, burner glow with flicker

### Thin HUD Components (2026-03-02)
- **GrindingHUD**: timer, progress bar, speed zone indicator (color-coded slow/good/fast), splatter flash on strikes, dialogue phase display
- **StuffingHUD**: timer, fill gauge, pressure gauge with danger threshold, burst flash, warning text (pressure>70), pressing/released status, dialogue phase
- **CookingHUD**: timer, temperature readout (cold/perfect/hot), target temp ± tolerance, hold progress gauge, PERFECT badge in zone, heat level (OFF/LOW/MED/HIGH), overheat flash, dialogue phase
- Data flow: orchestrator → Zustand store → HUD reads → displays. ZERO input handling in HUDs.

### Store Bridge Fields (2026-03-02)
- `challengeTimeRemaining`, `challengeSpeedZone`, `challengePhase` + setters
- Reset in `startNewGame()`, `continueGame()`, `completeChallenge()`, `returnToMenu()`
- `addFridgeSelected` correctly writes ingredient name to `playerDecisions.selectedIngredients`

### Core Gameplay (pre-ECS, still working)
- Full game loop: menu → loading → 5 challenges → results → menu
- All 5 challenge mechanics with per-challenge scoring (0-100)
- Final verdict system: 10-phase reveal with demand matching, S/A/B/F rank
- Variant system for replayability (seeded challenge difficulty)
- 5 sequential challenges: ingredients (fridge), grinding, stuffing, cooking, tasting

### 3D Scene
- Sealed basement kitchen: locked door (front wall), barred window (right wall, high), steel trap door on ceiling (decorative)
- 39 GLB furniture models including 9 horror props (bear trap, worm, fly swatter, bandages, etc.)
- PBR textures: tile floor/walls, concrete ceiling, grime decals (drips, baseboard mold)
- Multi-source lighting: hemisphere, center point, 3 fluorescent tubes with flicker, red emergency, under-counter glow
- Post-processing (WebGL): bloom, vignette, chromatic aberration, film grain
- CRT television with TSL shader (chromatic aberration + scanlines, reaction-based distortion)
- Mr. Sausage 3D character: procedural, 9 reaction animations, tracks camera on TV (creepy)
- TransferBowl: moves fridge→grinder→grinder-output→stuffer→done with blend color from ingredients
- Fridge door animation via useAnimations from drei (auto-opens on challenge trigger)
- FPS free-roam: WASD + pointer-lock mouse look, Rapier proximity sensors for station triggers

### UI & State
- Title screen with NEW GAME / CONTINUE
- Loading screen with procedural sausage links progress bar
- Challenge transition title cards (3-sec, Mr. Sausage quips per station)
- Intro dialogue sequence with typewriter text and branching choices
- Strike counter overlay
- Challenge header overlay
- Game over screen with rank badge, per-challenge score breakdown, rating audio
- Settings screen with volume sliders + mute toggles
- AsyncStorage persistence (progress + settings)
- Code splitting: lazy GameWorld + per-challenge chunks

### Audio
- Web audio synthesis (Tone.js): 7 SFX instruments + 2 melodies
- Per-station audio: grinder loop, stuffing squelch, pressure hiss, sizzle loop + hits, burst, countdown beeps
- Ambient horror drone (start/stop based on appPhase)
- Grab/drop SFX
- Rating song per verdict rank

## Phase 1 Gaps (Deferred to Phase 2 Wave 0)

These features exist in the POC (`sausage_factory.html`) but were NOT ported during Phase 1:

| Gap | POC Reference | Phase 2 Task |
|-----|---------------|--------------|
| Fridge door pull gesture | POC has proximity auto-open; design calls for drag gesture | Task 0a |
| Ingredient GLB models on shelves | POC uses procedural; design calls for prop GLBs | Task 0b |
| Cutting board / chopping station | Not in POC; design spec lists as intermediate station | Task 0c |
| Grinder hopper tray interaction | POC has visual hopper; current code uses invisible TransferBowl | Task 0d |
| Sausage body Rapier physics | POC lines 253-305: rigid body per bone, ball colliders, spring anchors | Task 0e |
| Pan flip player trigger | POC has click-to-flip; current flip animation exists but untriggered | Task 0f |

## What Doesn't Work / Needs Fix

- Loading screen visual polish needed
- Title screen Continue button is a stub (no save-game resume yet)
- Mobile touch controls untested on real devices
- Native audio is a complete no-op
- Large assets may not be in git (kitchen.glb 15.5 MB, textures ~10 MB)
- Memory bank docs reference `CameraWalker.tsx` which does NOT exist (pure FPS controller)

## Milestones Completed

| Date | Milestone |
|------|-----------|
| 2026-03-02 | Phase 1 complete: ECS orchestrators promoted to game drivers, thin HUDs, old 2D overlays deleted |
| 2026-03-02 | 769 tests passing across 55 suites, Biome lint clean, TypeScript clean |
| 2026-03-01 | ECS foundation: 6 input primitives, 3 machine archetypes, InputContract binding |
| 2026-03-01 | Documentation overhaul complete (frontmatter, AGENTS.md, memory bank, JSDoc, TypeDoc) |
| 2026-03-01 | Physics/Rapier integration (sensors, GrabbableSausage, GrabSystem, receiver pattern) |
| 2026-03-01 | Bowl-based blending (BlendCalculator + BlendMaterial) |
| 2026-03-01 | Settings screen + AsyncStorage persistence |
| 2026-02-28 | Code splitting (17 chunks, lazy GameWorld) |
| 2026-02-27 | Babylon.js → R3F migration complete |
| -- | GitHub Pages deployment live |
| -- | All 5 challenges playable end-to-end |
