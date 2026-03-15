---
title: "Greenfield Completion PRD — Will It Blow?"
domain: plan
status: active
last-verified: "2026-03-13"
depends-on: [architecture, game-design, state-management]
summary: "Complete PRD for all remaining work: architecture modernization (Koota ECS, expo-sqlite, config extraction), missing UI, engine modules, tests, and deployment"
---

# Greenfield Completion PRD — Will It Blow?

## 1. Product Overview

**Will It Blow?** is a first-person horror sausage-making mini-game (SAW meets cooking show). The player completes 13 sequential phases at kitchen stations under Mr. Sausage's watchful eye.

This PRD covers ALL remaining work to go from the current `feat/poc-exploration` greenfield state to a fully playable, tested, deployable game with clean architecture.

## 2. Architecture Modernization

### 2.1 Data Flow: JSON → Koota → SQLite

The modernized data flow replaces scattered hardcoded values and the monolithic Zustand store:

```
src/config/*.json          (Static game data — Metro import with { type: "json" })
  ↓
src/config/*.ts            (Typed accessors with interfaces)
  ↓
src/ecs/traits.ts          (Koota traits define runtime entity state)
src/ecs/world.ts           (Koota world spawns entities from config)
src/ecs/actions.ts         (createActions for game mutations)
  ↓
src/store/gameStore.ts     (Thin Zustand UI bridge — reads from Koota world)
  ↓
src/db/schema.ts           (Drizzle ORM table definitions)
src/db/client.ts           (expo-sqlite init with WASM fallback)
src/db/queries.ts          (Hydrate/persist between Koota world ↔ SQLite)
```

### 2.2 Module Separation Rules

- **`.ts` files**: Config accessors, game logic, ECS traits/systems/actions, engine modules, DB schema
- **`.tsx` files**: React components (UI overlays) and R3F components (3D stations)
- **`src/config/*.json`**: ALL tunables — no magic numbers in source
- **`src/config/*.ts`**: Typed re-exports with lookup functions
- **`src/ecs/`**: Koota world, traits, queries, actions, systems
- **`src/components/stations/`**: R3F station components (3D + input)
- **`src/components/ui/`**: React Native overlays (display only)
- **`src/engine/`**: Pure logic modules (scoring, matching, dialogue, audio)
- **`src/db/`**: Drizzle schema, migrations, persistence queries
- **`src/store/`**: Thin Zustand bridge between Koota ↔ React Native UI

### 2.3 Config Extraction Targets

Every hardcoded tunable must move to a JSON config file:

| Config File | Contents | Currently Hardcoded In |
|-------------|----------|----------------------|
| `stations.json` | Station positions, camera angles, phase mapping | GameWorld.tsx, CameraRail.tsx |
| `sausage.json` | Spring K/damp, bone count, collider radius, link spacing | Sausage.tsx |
| `grinder.json` | Speed zones, particle count, crank speed, timer | Grinder.tsx |
| `stuffer.json` | Fill rate, pressure decay, burst threshold, timer | Stuffer.tsx |
| `stove.json` | FBO resolution, damping, heat zones, timer | Stove.tsx |
| `chopping.json` | Gesture timing, precision thresholds, chunk params | ChoppingBlock.tsx |
| `blowout.json` | Pressure rate, tie threshold, shake intensity, timer | BlowoutStation.tsx |
| `scoring.json` | Rank thresholds (S/A/B/F), demand bonus weights | DemandScoring.ts |
| `demands.json` | Tag pool, desired/hated counts, cook preferences | gameStore.ts generateDemands() |
| `dialogue.json` | Typewriter speed, advance delay, effect weights | DialogueEngine.ts |
| `ingredients.json` | All 25 ingredients (move from Ingredients.ts) | Ingredients.ts |
| `difficulty.json` | Already exists — validate and extend | DifficultyConfig.ts |
| `camera.json` | Rail positions, intro waypoints, transition duration | CameraRail.tsx, IntroSequence.tsx |
| `audio.json` | Sample paths, synth params, volume defaults | AudioEngine.ts |
| `ui.json` | Strike count, hint count, progress bar params | Future HUD components |
| `rounds.json` | Total rounds per difficulty, combo tracking rules | RoundManager.ts |

### 2.4 Koota ECS Architecture

Replace the flat Zustand fields with a proper Koota world:

**Traits** (data schemas):
- `StationTrait` — { id, phase, position, cameraTarget, active }
- `SausageTrait` — { boneCount, springK, springDamp, colliderRadius }
- `GrinderTrait` — { speed, zone, crankAngle, particleCount, timer }
- `StufferTrait` — { fillLevel, pressure, burstCount, timer }
- `StoveTrait` — { heatLevel, cookProgress, targetZone, timer }
- `ChopperTrait` — { precision, chunkCount, gesturePhase }
- `BlowoutTrait` — { pressure, tieProgress, shakeIntensity }
- `IngredientTrait` — { id, name, tags, tasteMod, burstRisk, selected }
- `DemandTrait` — { desiredTags, hatedTags, cookPreference }
- `ScoreTrait` — { challengeScores, demandBonus, finalRank }
- `RoundTrait` — { current, total, usedCombos }
- `PlayerTrait` — { posture, idleTime, strikes, hints }
- `PhaseTag` — Tag trait for current active phase

**Zustand remains for**:
- `appPhase` (title/playing/results) — controls React Native top-level routing
- UI-specific transient state (joystick, lookDelta, interactPulse)
- Dialogue overlay state (current line, active flag)

### 2.5 expo-sqlite Persistence

**Tables** (Drizzle ORM schema):
- `game_session` — difficulty, round, total_rounds, created_at
- `round_scores` — round_id, challenge_phase, score, demand_bonus
- `used_combos` — session_id, ingredient_ids (JSON array)
- `player_stats` — games_played, best_rank, total_score
- `settings` — sfx_volume, music_volume, haptics_enabled

**Persistence flow**:
- On game start: create session row, hydrate Koota world from config
- On round complete: persist round scores + used combo
- On game end: update player stats, persist final rank
- On app resume: check for incomplete session, offer continue

## 3. User Stories

### Epic 1: Foundation — Config Extraction & Module Structure

**US-1.1: Config JSON extraction**
As a developer, I want all hardcoded tunables extracted to JSON config files with typed TypeScript accessors, so the game is data-driven and easy to tune.

Acceptance criteria:
- [ ] All 16 config JSON files created in `src/config/`
- [ ] Each JSON has a corresponding `.ts` accessor with typed interface
- [ ] `import config from './config.json' with { type: 'json' }` pattern used
- [ ] Zero hardcoded magic numbers remain in station components
- [ ] Existing tests still pass after extraction
- [ ] New unit tests for each config accessor (validate schema, lookup functions)

**US-1.2: Koota ECS world setup**
As a developer, I want the Koota ECS world initialized with proper traits, so runtime state has clean separation from config and UI.

Acceptance criteria:
- [ ] `src/ecs/world.ts` creates Koota world with `createWorld()`
- [ ] `src/ecs/traits.ts` defines all trait schemas with typed defaults
- [ ] `src/ecs/queries.ts` exports queries for each archetype
- [ ] `src/ecs/actions.ts` exports `createActions` for game mutations
- [ ] `WorldProvider` wraps the R3F Canvas in GameWorld.tsx
- [ ] Unit tests for trait creation, entity spawn, query results
- [ ] Koota `useQuery`/`useTrait` used in at least one station component

**US-1.3: Zustand store migration**
As a developer, I want the Zustand store reduced to a thin UI bridge, with game state living in Koota traits.

Acceptance criteria:
- [ ] Dead fields removed (`dialogueActive`, `currentDialogueLine`)
- [ ] `finalScore` properly typed (not `any`)
- [ ] Station gameplay fields (groundMeatVol, stuffLevel, etc.) moved to Koota traits
- [ ] Zustand retains only: appPhase, UI input state, dialogue transient state
- [ ] `returnToMenu()` action added
- [ ] `startNewGame()` action added (spawns Koota entities from config)
- [ ] All existing store tests updated to match new API
- [ ] New tests for Koota ↔ Zustand bridge

**US-1.4: expo-sqlite persistence layer**
As a player, I want my game progress saved to a local database, so I can resume play sessions and track my stats.

Acceptance criteria:
- [ ] `src/db/schema.ts` defines Drizzle ORM tables (5 tables)
- [ ] `src/db/client.ts` initializes expo-sqlite with WASM fallback on web
- [ ] `src/db/queries.ts` has `hydrateSession()` and `persistSession()` functions
- [ ] COI service worker enables SharedArrayBuffer on GitHub Pages
- [ ] Metro config has WASM asset support + COEP/COOP headers
- [ ] Settings persist across sessions (volume, haptics)
- [ ] Unit tests for schema creation, hydration, persistence round-trip
- [ ] Web fallback gracefully degrades if WASM unavailable

### Epic 2: Missing Engine Modules

**US-2.1: ChallengeRegistry module**
As a developer, I want a ChallengeRegistry that maps GamePhase values to challenge configs and handles variant selection, so challenges are data-driven.

Acceptance criteria:
- [ ] `src/engine/ChallengeRegistry.ts` created (pure logic, no React)
- [ ] Maps each of 13 GamePhase values to config entry
- [ ] Seeded variant selection via `(seed * 2654435761) >>> 0 % length`
- [ ] `calculateFinalVerdict(scores, demandBonus)` returns rank (S/A/B/F)
- [ ] Reads from `scoring.json` config
- [ ] Unit tests: variant determinism, rank thresholds, edge cases

**US-2.2: SausagePhysics scoring module**
As a developer, I want pure scoring functions for the sausage pipeline, so each challenge can compute a 0-100 score.

Acceptance criteria:
- [ ] `src/engine/SausagePhysics.ts` created (pure functions, no React)
- [ ] `calculateBlowRuffalos(holdDuration, ingredients)`
- [ ] `checkBurst(ingredients)` — probabilistic burst check
- [ ] `calculateTasteRating(ingredients, burstOccurred)`
- [ ] `calculateFinalScore(taste, blow, burst, bonus)`
- [ ] `getTitleTier(score)` — maps 0-100 to rank name
- [ ] All functions read ingredient stats from `ingredients.json` config
- [ ] Unit tests for all 5 functions + edge cases

**US-2.3: Asset URL resolution module**
As a developer, I want dynamic asset URL resolution that works on both localhost and GitHub Pages, so assets load correctly in all environments.

Acceptance criteria:
- [ ] `src/engine/assetUrl.ts` created
- [ ] `getWebBasePath()` derives base from `<script src>` tags or `experiments.baseUrl`
- [ ] `getAssetUrl(relativePath)` returns full URL
- [ ] All GLB, OGG, and texture references use `getAssetUrl()`
- [ ] Works on localhost (no prefix) and GitHub Pages (`/will-it-blow/` prefix)
- [ ] Unit tests for both environments (mock document.scripts)

**US-2.4: GameOrchestrator phase completeness**
As a player, I want all 13 game phases to be navigable, so TIE_CASING and BLOWOUT are not skipped.

Acceptance criteria:
- [ ] GameOrchestrator PHASES array includes all 13 GamePhase values
- [ ] Phase transitions work for all 13 phases (dev shortcuts + gameplay)
- [ ] Score calculation triggers on DONE phase
- [ ] Demand generation happens on game start
- [ ] Unit tests for phase navigation (forward, backward, all phases)

### Epic 3: Missing UI Components

**US-3.1: GameOverScreen (results)**
As a player, I want to see my final score and rank after completing the game, so I know how well I performed.

Acceptance criteria:
- [ ] `src/components/ui/GameOverScreen.tsx` created
- [ ] Displays rank badge (S/A/B/F) with rank-specific colors and titles
- [ ] Shows per-challenge score breakdown
- [ ] Shows demand bonus details
- [ ] "PLAY AGAIN" button calls `startNewGame()`
- [ ] "MENU" button calls `returnToMenu()`
- [ ] App.tsx renders GameOverScreen when `appPhase === 'results'`
- [ ] Unit test: renders with mock scores, buttons trigger correct actions

**US-3.2: LoadingScreen**
As a player, I want a loading screen while assets preload, so I don't see a blank screen on startup.

Acceptance criteria:
- [ ] `src/components/ui/LoadingScreen.tsx` created
- [ ] Shows progress bar during kitchen.glb and audio preload
- [ ] Transitions to playing when all assets ready
- [ ] App.tsx renders LoadingScreen during asset loading
- [ ] Unit test: progress updates, transition on completion

**US-3.3: Per-station HUD overlays**
As a player, I want visual feedback during each challenge showing timer, progress, and zone indicators.

Acceptance criteria:
- [ ] `src/components/ui/GrindingHUD.tsx` — speed zone indicator, timer, progress bar
- [ ] `src/components/ui/StuffingHUD.tsx` — pressure gauge, fill progress, burst counter
- [ ] `src/components/ui/CookingHUD.tsx` — temperature gauge, time in zone, heat control
- [ ] `src/components/ui/BlowoutHUD.tsx` — pressure gauge, tie progress, score
- [ ] All HUDs are read-only Zustand/Koota subscribers — ZERO input handling
- [ ] HUDs read from Koota traits via `useTrait` hooks
- [ ] Each HUD has unit tests verifying display logic

**US-3.4: Challenge UI components**
As a player, I want challenge header, strike counter, and progress gauge visible during gameplay.

Acceptance criteria:
- [ ] `src/components/ui/ChallengeHeader.tsx` — "CHALLENGE N/7" with phase name
- [ ] `src/components/ui/StrikeCounter.tsx` — visual red X marks (max from `ui.json`)
- [ ] `src/components/ui/ProgressGauge.tsx` — animated 0-100 progress bar
- [ ] Components read game phase and config from Koota traits
- [ ] Unit tests for each component

**US-3.5: IngredientChallenge overlay**
As a player, I want to pick ingredients from the freezer with visual feedback on correct/wrong picks.

Acceptance criteria:
- [ ] `src/components/ui/IngredientChallenge.tsx` — ingredient selection overlay (bridge pattern)
- [ ] Shows available ingredients from Koota query
- [ ] Correct pick: slide forward animation, score update
- [ ] Wrong pick: strike, red flash
- [ ] Score calculated as (correct / required) × 100 minus strike penalty
- [ ] Writes results to Koota ScoreTrait
- [ ] Unit tests for scoring logic, pick validation

**US-3.6: TastingChallenge overlay**
As a player, I want a dramatic score reveal from Mr. Sausage with per-challenge breakdowns.

Acceptance criteria:
- [ ] `src/components/ui/TastingChallenge.tsx` — verdict reveal overlay
- [ ] Reveal phases: form → ingredients → cook → scores with demand breakdown
- [ ] Rank-specific dialogue from Mr. Sausage
- [ ] Rank badge animation (S/A/B/F)
- [ ] On completion, sets `appPhase` to `'results'`
- [ ] Unit tests for reveal sequence, rank display

**US-3.7: RoundTransition UI**
As a player, I want a visual transition between rounds showing my round score and upcoming round number.

Acceptance criteria:
- [ ] `src/components/ui/RoundTransition.tsx` — between-round screen
- [ ] Shows round score summary
- [ ] "NEXT ROUND" button advances to next round
- [ ] Reads round state from Koota RoundTrait
- [ ] Unit test: renders round info, button triggers nextRound

### Epic 4: Station Component Completion

**US-4.1: ChestFreezer interactivity**
As a player, I want to tap/click ingredients in the freezer to select them for my sausage.

Acceptance criteria:
- [ ] `ChestFreezer.tsx` has interactive ingredient meshes with `onClick` handlers
- [ ] Ingredient meshes rendered from `ingredients.json` config
- [ ] Selected ingredients highlight (emissive pulse, slide forward)
- [ ] Writes selected IDs to Koota IngredientTrait entities
- [ ] 3 ingredients required (configurable in `ui.json`)
- [ ] Physics lid animation (open/close)
- [ ] Unit tests for selection logic

**US-4.2: Kitchen.tsx GLB loading**
As a developer, I want Kitchen.tsx to load and render the kitchen GLB model with PBR materials.

Acceptance criteria:
- [ ] `Kitchen.tsx` loads `kitchen.glb` via `useGLTF` with `getAssetUrl()`
- [ ] PBR materials from texture sets applied
- [ ] Lighting setup (ambient, hemisphere, point lights with flicker)
- [ ] No longer returns empty fragment
- [ ] Integration test: GLB mock loads, scene graph populated

**US-4.3: CRT shader for TV**
As a player, I want the CRT television to have chromatic aberration and scanline effects for atmosphere.

Acceptance criteria:
- [ ] `src/components/effects/CrtShader.ts` created (TSL NodeMaterial)
- [ ] Effects: barrel distortion, scanlines, chromatic aberration, flicker, vignette
- [ ] `createCrtMaterial(name)` factory function
- [ ] Uniforms: time, flickerIntensity, staticIntensity, reactionIntensity
- [ ] TV.tsx uses CRT material on screen mesh
- [ ] Unit tests for material creation, uniform presence

### Epic 5: Audio System

**US-5.1: Audio platform split**
As a developer, I want separate web and native audio implementations so audio works cross-platform.

Acceptance criteria:
- [ ] `src/engine/AudioEngine.web.ts` — Tone.js synthesis + OGG playback
- [ ] `src/engine/AudioEngine.ts` — Native stub (expo-audio)
- [ ] Audio config from `audio.json` (sample paths, volumes, synth params)
- [ ] Station-specific SFX wired: chop, grind, squelch, sizzle, pressure, burst
- [ ] Ambient horror drone plays during gameplay
- [ ] Volume controllable from settings (persisted in SQLite)
- [ ] Unit tests for audio interface (mock Tone.js)

### Epic 6: Testing & Quality

**US-6.1: Fix existing failing tests**
As a developer, I want all existing tests to pass so CI is green.

Acceptance criteria:
- [ ] `gameStore.test.ts` rewritten to match actual store API
- [ ] `SurrealText.spec.tsx` Babel import issue fixed
- [ ] 62/62 tests pass (100% pass rate)
- [ ] No `console.error` suppression of real React errors

**US-6.2: Station component tests**
As a developer, I want R3F tests for all 9 station components.

Acceptance criteria:
- [ ] Tests for: Grinder, Stuffer, Stove, ChoppingBlock, BlowoutStation, TV, Sink, ChestFreezer, PhysicsFreezerChest
- [ ] Each test verifies: mesh presence, trait reading, user interaction response
- [ ] `useGLTF` mocked where needed
- [ ] Uses @react-three/test-renderer

**US-6.3: Engine module tests**
As a developer, I want unit tests for all engine modules.

Acceptance criteria:
- [ ] Tests for: ChallengeRegistry, SausagePhysics, assetUrl, DialogueEngine effects
- [ ] Tests for: Koota trait creation, entity spawn/destroy, query results
- [ ] Tests for: Drizzle schema creation, hydration, persistence round-trip
- [ ] Tests for: Config accessor typed lookups, schema validation
- [ ] Each test file tests a single module (no cross-module testing)

**US-6.4: E2E playthrough test**
As a developer, I want a Playwright E2E test that plays through the full game loop.

Acceptance criteria:
- [ ] `e2e/playthrough.spec.ts` exercises: title → playing → all phases → results → menu
- [ ] Uses GameGovernor (`window.__gov`) for phase advancement
- [ ] Verifies score display, rank badge, and menu return
- [ ] Runs headed with system Chrome (WebGL support)
- [ ] CI integration (runs on push to feat/** branches)

### Epic 7: Deployment & CI

**US-7.1: GitHub Pages deployment fix**
As a developer, I want the game to deploy correctly to GitHub Pages with proper asset URLs.

Acceptance criteria:
- [ ] `assetUrl.ts` handles `/will-it-blow/` base path
- [ ] COI service worker enables SharedArrayBuffer
- [ ] All binary assets load correctly on GitHub Pages
- [ ] expo-sqlite WASM works in deployed environment
- [ ] CD workflow builds and deploys successfully
- [ ] Manual verification: play full game loop on deployed URL

**US-7.2: CI pipeline update**
As a developer, I want CI to run all tests including the new suites.

Acceptance criteria:
- [ ] CI runs: lint, typecheck, unit tests, E2E tests
- [ ] All jobs pass with green status
- [ ] Test count > 150 (from current 62)
- [ ] Biome lint has zero warnings
- [ ] TypeScript has zero errors

### Epic 8: Game Polish

**US-8.1: Console suppression cleanup**
As a developer, I want the console suppression removed so real React errors are visible.

Acceptance criteria:
- [ ] App.tsx `console.error` override removed
- [ ] Root cause of `Maximum update depth exceeded` identified and fixed
- [ ] No React warnings in console during normal gameplay
- [ ] If warnings are unfixable (Three.js noise), use targeted filter (not blanket suppression)

**US-8.2: DialogueEngine effects system**
As a developer, I want the DialogueEngine effects system to actually work and be tested.

Acceptance criteria:
- [ ] Effects (`hint`, `taunt`, `stall`, `anger`) produce observable state changes
- [ ] Effect state readable from Koota trait
- [ ] Station components react to active effects (e.g., hint glow)
- [ ] Unit tests for all 4 effect types

**US-8.3: Settings screen**
As a player, I want a settings screen to control audio volume and haptics.

Acceptance criteria:
- [ ] `src/components/ui/SettingsScreen.tsx` created
- [ ] SFX volume slider, music volume slider, haptics toggle
- [ ] Settings persisted to SQLite settings table
- [ ] Accessible from title screen and in-game pause
- [ ] Unit tests for settings read/write

## 4. Non-Functional Requirements

- **Test-driven**: Every user story requires tests written BEFORE implementation
- **Document-backed**: Each epic updates relevant docs (architecture, game-design, state-management, testing)
- **Config-driven**: Zero hardcoded tunables — all values in JSON configs
- **Type-safe**: All JSON configs have TypeScript interfaces; no `any` types
- **Modular**: Logic in `.ts`, components in `.tsx`, configs in `.json`
- **Cross-platform**: Web primary, iOS/Android via Expo (expo-sqlite WASM on web)
- **Performance**: 60 FPS target on mobile; Koota batched queries for ECS updates
