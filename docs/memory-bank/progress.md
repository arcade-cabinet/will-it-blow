# Progress — Will It Blow?

**Last updated:** 2026-04-08

## Lost Requirements Restoration (in progress, 2026-04-08)

PRD: `docs/plans/2026-04-08-lost-requirements-restoration.md`
Branch: `feat/deep-hierarchical-validation`

| Task | Status | Notes |
|------|--------|-------|
| T0.A — Mulberry32 seeded RNG per save | done | 11 files migrated, Math.random gate clean, 599/599 tests green |
| T0.B — Composition pillar end-to-end via Stuffer | pending | |
| T0.C — Zoombinis-in-Hell deduction loop | pending | |
| T0.D — Reactive SurrealText slide-down system | pending | |
| T1.A — Will It Blow splatter climax | pending | |
| T1.B — Presentation climax (trapdoor + plate) | pending | |
| T1.C — Style points throughout stations | pending | |
| T2.A — Jigsaw Billy TV upgrade | pending | |
| T2.B — Slaughterhouse dressing (60 GLBs) | pending | |
| T2.C — POC fidelity tuning | pending | |
| T2.D — Dialogue applyEffects + verdict wiring | pending | |

## Completion Overview

| Domain | % | Status |
|--------|---|--------|
| Core gameplay loop | 100% | 7 challenges playable (ingredients, chopping, grinding, stuffing, cooking, blowout, tasting) |
| ECS architecture | 100% | Input primitives, machine archetypes, orchestrator game drivers, enemy/combat ECS |
| 3D visuals | 100% | Horror kitchen, PBR textures, GLB furniture, 21 PSX horror props, CRT shader (TSL NodeMaterial), Kitchen.tsx GLB loading |
| Physics/Rapier | 95% | Station proximity sensors (KINEMATIC_FIXED + bitmask), GrabbableSausage, GrabSystem, receiver pattern, splatter particles |
| Audio (web) | 90% | 40+ OGG assets cataloged in audio.json, procedural Web Audio API synthesis in AudioEngine.ts, Tone.js in AudioEngine.web.ts, phase-specific music mapping, spatial sounds |
| Audio (native) | 0% | Complete no-op stub |
| UI/UX | 100% | Menu/loading/overlays, thin HUDs, challenge transitions, difficulty selector, round manager, hidden object overlay, GameOverScreen, LoadingScreen, HintDialogue |
| State management | 100% | Zustand store with orchestrator→HUD bridge fields, multi-round state, AsyncStorage persistence |
| Cross-platform | 70% | Web works well; native uses same Canvas (react-native-wgpu); dual-zone touch controls; VR/AR foundations; untested on devices |
| Testing | 100% | 50 suites, 599 tests, 0 failures |
| Documentation | 95% | Frontmatter on docs, AGENTS.md hierarchy, memory bank, JSDoc cleaned up, TypeDoc |
| CI/CD | 100% | Parallel jobs: lint, typecheck, test, build — all run on push to main and feat/** |
| PRD tasks | 100% | 28/28 PRD tasks complete |

## What Works (Phase 2 Sprints 1–3 Complete)

### Phase 2 Sprint 3: Multi-Round Loop + Blowout + Cleanup (2026-03-03)
- **Blowout challenge (index 5)**: TieGesture (2D bridge overlay), BlowoutOrchestrator (ECS game driver), CerealBox (CanvasTexture splat layer), inline place setting, BlowoutHUD
- **Multi-round loop**: RoundManager (C(12,3) combo tracking), TrapDoorAnimation (escape sequence), RoundTransition UI
- **Hidden objects**: CabinetDrawer (spring animations), KitchenAssembly (equipment parts/stations), HiddenObjectOverlay
- **Cleanup mechanics**: ProceduralSink (procedural lathe/cylinder), CleanupManager, CleanupHUD
- **Challenge count**: 7 total (TOTAL_CHALLENGES = 7); tasting shifted from index 5 to index 6

### Phase 2 Sprint 2: Enemy Encounters (2026-03-03)
- Enemy config: `src/config/enemies.json` — 5 enemy types, 5 weapons, 4 spawn cabinets
- ECS: EnemySpawnSystem + CombatSystem + CabinetBurst + CombatHUD
- AI state machine: spawning→approaching→attacking→stunned→dying→dead
- Spawn probability scales with difficulty.enemyChance: 0% (Rare) → 50% (Well Done)

### Phase 2 Sprint 1: Difficulty + Horror Dressing (2026-03-02)
- **Difficulty system**: 5 tiers (Rare→Well Done) in `src/config/difficulty.json`, drives hints/strikes/timePressure/enemyChance
- **DifficultySelector UI**: "Choose Your Doneness" screen with permadeath line separator
- **Horror scene dressing**: 21 PSX GLBs via tiered HorrorPropsLoader (tier 1 immediate, tier 2 deferred 2s)
- **InputManager**: Universal input with JSON bindings, keyboard/mouse/gamepad/touch normalization

### Phase 2 Wave 0: POC Feature Ports (2026-03-02)
- Fridge door pull gesture (drag handle, spring-back, snap threshold)
- Ingredient GLB models on shelves (8 shape types, PBR, hover glow, physics pop)
- Chopping station with ChoppingOrchestrator (index 1)
- Hopper tray pour (HopperPour animation)
- Pan flip player trigger (click-to-flip in CookingOrchestrator)
- Continue button on TitleScreen

### Phase 1: ECS Architecture + Orchestrator Promotion (2026-03-02) — COMPLETE
- GrinderOrchestrator, StufferOrchestrator, CookingOrchestrator promoted to full game drivers
- 3 thin HUD components (GrindingHUD, StuffingHUD, CookingHUD) — read-only Zustand subscribers
- 3 old 2D challenge overlays deleted
- Store bridge: challengeTimeRemaining, challengeSpeedZone, challengePhase + setters
- Data flow: 3D input → ECS system → orchestrator → Zustand → HUD display

### Core Gameplay (all working)
- Full 7-challenge loop: menu → loading → 7 challenges → results → menu
- All challenge mechanics with per-challenge scoring (0-100)
- Final verdict system: 10-phase reveal with demand matching, S/A/B/F rank
- Variant system for replayability (seeded challenge difficulty)
- Demand scoring: DemandScoring.ts compares player decisions vs Mr. Sausage's hidden demands
- Strike system: 3 strikes = instant failure

### 3D Scene
- Sealed basement kitchen: locked door (front wall), barred window (right wall, high), steel trap door on ceiling
- 39+ GLB furniture models including 21 PSX horror props
- PBR textures: tile floor/walls, concrete ceiling, grime decals (drips, baseboard mold)
- Multi-source lighting: hemisphere, center point, 3 fluorescent tubes with flicker, red emergency, under-counter glow
- Post-processing (WebGL): bloom, vignette, chromatic aberration, film grain
- CRT television with TSL NodeMaterial shader (chromatic aberration + scanlines, reaction-based distortion)
- Mr. Sausage 3D character: procedural, 9 reaction animations, tracks camera on TV
- TransferBowl: moves fridge→grinder→grinder-output→stuffer→done with blend color from ingredients
- FPS free-roam: WASD + pointer-lock mouse look, Rapier proximity sensors for station triggers

### Audio
- Web audio synthesis (Tone.js): 7 SFX instruments + 2 melodies
- Per-station audio: grinder loop, stuffing squelch, pressure hiss, sizzle loop + hits, burst, countdown beeps
- Ambient horror drone (start/stop based on appPhase)
- Grab/drop SFX, rating song per verdict rank

## Known Issues

- Mobile touch controls untested on real devices
- Native audio is a complete no-op
- Large assets may not be in git (kitchen.glb 15.5 MB, textures ~10 MB)

## Milestones Completed

| Date | Milestone |
|------|-----------|
| 2026-04-08 | T0.A — Mulberry32 seeded RNG per save: 11 files migrated, Math.random gate clean, 599/599 tests green |
| 2026-03-04 | Dual-zone touch controls, Rapier KINEMATIC_FIXED fix, real-playthrough E2E |
| 2026-03-03 | Phase 2 Sprints 1–3 complete: difficulty, horror dressing, enemy encounters, blowout, multi-round, hidden objects, cleanup |
| 2026-03-13 | All 28 PRD tasks complete; 37 suites / 397 tests all passing; 0 lint errors; 0 TypeScript errors |
| 2026-03-04 | Dual-zone touch controls + Rapier KINEMATIC_FIXED fix + E2E tests |
| 2026-03-03 | 1530 tests passing across 94 suites, Biome lint clean, TypeScript clean |
| 2026-03-03 | CI/CD fully hardened: lint + typecheck + test + build in parallel on every push |
| 2026-03-02 | PRs #25, #27, #28, #29 all merged to main |
| 2026-03-02 | Phase 1 complete: ECS orchestrators promoted to game drivers, thin HUDs, old 2D overlays deleted |
| 2026-03-02 | 769 tests passing across 55 suites |
| 2026-03-01 | ECS foundation: 6 input primitives, 3 machine archetypes, InputContract binding |
| 2026-03-01 | Documentation overhaul complete (frontmatter, AGENTS.md, memory bank, JSDoc, TypeDoc) |
| 2026-03-01 | Physics/Rapier integration (sensors, GrabbableSausage, GrabSystem, receiver pattern) |
| 2026-03-01 | Bowl-based blending (BlendCalculator + BlendMaterial) |
| 2026-03-01 | Settings screen + AsyncStorage persistence |
| 2026-02-28 | Code splitting (17 chunks, lazy GameWorld) |
| 2026-02-27 | Babylon.js → R3F migration complete |
| -- | GitHub Pages deployment live |
| -- | All 7 challenges playable end-to-end |
