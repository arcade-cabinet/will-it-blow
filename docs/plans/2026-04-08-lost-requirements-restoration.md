# Feature: Lost Requirements Restoration — Will It Blow?

**Created**: 2026-04-08
**Version**: 2.88
**Timeframe**: Sprint (2 weeks)
**Project**: Will It Blow?
**Branch**: `feat/deep-hierarchical-validation`
**Authoritative reading**: `/Users/jbogaty/src/arcade-cabinet/will-it-blow/AGENTS.md` (7 design pillars + 12 build principles)
**Companion task list**: `.claude/plans/2026-04-08-lost-requirements-restoration.tasks.md`
**Companion JSON**: `.claude/plans/2026-04-08-lost-requirements-restoration.json`

## Priority: P0 — Restore the game's actual skeleton

## Overview

The post-greenfield audit identified a series of **lost requirements** — design pillars from the original POC and design docs that were lost during the Filament → Capacitor pivot and the asset reorganization. The game currently has all the *cosmetics* (lighting, set dressing, hands, animations) but is missing the **deduction loop, the composition feedback surface, the climactic blow-through, the presentation ritual, and the deterministic substrate** that makes "Will It Blow?" a *game* rather than a horror diorama.

This restoration work is organized into **three tiers** with strict dependency ordering:

- **Tier 0** — Foundational substrate (seeded RNG, composition pillar, deduction loop, surreal text). **Sequential**, each task unblocks the next.
- **Tier 1** — Core mechanics (blowout climax, presentation ritual, style points). Can run in parallel after Tier 0 lands.
- **Tier 2** — Polish + atmosphere (TV upgrade, set dressing, fidelity tuning, audit fixes). Can run in parallel after Tier 1 lands.

### Project identity reminder (from AGENTS.md)

Will It Blow? is a horror deduction game disguised as a cooking show. Loving tribute to the **Ordinary Sausage** YouTube channel taken to its logical extreme: Mr. Sausage will eventually make a sausage out of the player if they don't satisfy his hunger. Every task in this PRD must comply with the 7 design pillars (composition feedback, Zoombinis-in-Hell deduction, diegetic-only, seeded determinism, etc.) and the 12 build principles (test-first, doc-first, LOC discipline, no dead code, named exports, etc.).

---

## Tier 0 — Foundational substrate (sequential)

### T0.A — Seeded deterministic RNG per save

**Story**: As a player, I want each new run to be unpredictable but each save-scummed reload to be deterministic, so I can learn the game without RNG punishing identical decisions.

**Why**: The "no `Math.random()` in gameplay code" rule from `CLAUDE.md` is currently violated in 30+ call sites across `src/ecs/actions.ts`, `src/ecs/hooks.ts`, every station, every particle effect, and the sausage geometry generator. Until this is fixed, no other Tier 0 work is reliably testable.

**Scope**:
- New module: `src/engine/RunSeed.ts` exporting `createSeededRng(seed: string): () => number`, `getRunSeed(): string | null`, `setRunSeed(seed: string): void`
- Algorithm: **Mulberry32** (32-bit, ~6 LOC, no deps) — chosen for smallest bundle impact and adequate quality for game-state RNG
- New Koota trait (or store field on `useGameStore`): `runSeed: string | null` populated when a new game starts; set to `null` on TitleScreen
- Migrate every gameplay `Math.random()` to use the per-run RNG threaded via Koota or via a hook (`useRunRng()`)
- Audit-defined migration scope (must all be ZERO `Math.random` after this task):
  - `src/ecs/actions.ts` (ingredient generation, cook prefs)
  - `src/ecs/hooks.ts` (ingredient generation duplicate)
  - `src/components/stations/PhysicsFreezerChest.tsx` (ingredient drop positions/rotations)
  - `src/components/stations/Grinder.tsx` (particle jitter)
  - `src/components/stations/Stove.tsx` (splat positions/scales)
  - `src/components/stations/Sink.tsx` (water scale jitter)
  - `src/components/stations/BlowoutStation.tsx` (`rand` helper)
  - `src/components/sausage/Sausage.tsx` (impulse jitter)
  - `src/components/sausage/SausageGeometry.ts` (procedural texture noise)
  - `src/components/environment/SurrealText.tsx` (line picker)
- Out of scope (allowed exceptions): `FlickeringFluorescent.tsx` ambient flicker (purely cosmetic, not gameplay-affecting), test fixtures, dev tools

**Acceptance**:
- `grep -rE "Math\\.random" src/engine src/components/stations src/components/sausage src/ecs` returns zero hits
- Unit test `src/engine/__tests__/RunSeed.test.ts` pins determinism: same seed → identical sequence of 1000 draws
- Browser test: load same save twice, run identical input sequence, assert identical Koota state snapshot
- `pnpm typecheck` clean, `pnpm test` green

**Files**: `src/engine/RunSeed.ts`, `src/engine/__tests__/RunSeed.test.ts`, plus migrations in the 10 files listed above

---

### T0.B — Prove composition pillar end-to-end via Stuffer casing

**Story**: As a player, I want to *see* the ingredients I selected as a colour and texture inside the translucent casing, so the act of stuffing is the moment the recipe becomes visible — the diegetic feedback surface for the composition pillar.

**Why**: `compositeMix()` is fully implemented in `src/engine/IngredientComposition.ts` with unit-test coverage but is **never called from any consumer**. The Stuffer already has the rendering primitives (translucent MeshPhysicalMaterial casing, BunchedCasingGeo, water bowl) — they just aren't reading the selection. Wiring this up is the smallest possible end-to-end proof that the composition pillar is alive.

**Scope**:
- Extend `useGameStore` (or add Koota trait) with `currentRoundSelection: IngredientDef[]` plus actions `addToSelection(def)`, `removeFromSelection(id)`, `clearSelection()`
- `PhysicsFreezerChest` interaction: tapping/grabbing an ingredient calls `addToSelection`
- `Stuffer.tsx`: subscribe to `currentRoundSelection`, call `compositeMix()`, drive material uniforms:
  - Casing inner colour ← `mix.dominantColor` (or weighted mean)
  - `transmission` ← `lerp(0.95, 0.4, mix.density)` (denser fillings are more opaque)
  - `roughness` ← `lerp(0.1, 0.6, 1 - mix.shine)`
  - Optional: `clearcoat` modulated by `mix.moisture`
- BunchedCasingGeo particle density ← `mix.density * baseParticleCount`
- Browser test (`tests/micro/Stuffer.browser.test.tsx`): mount Stuffer, dispatch `addToSelection(steak)` then `addToSelection(banana)`, advance 2 RAF, capture material uniforms, assert colour matches expected weighted mean

**Acceptance**:
- Casing visibly tints when a selection changes (browser test asserts pixel colour delta)
- `compositeMix` is called from at least one production consumer (grep)
- Unit test asserts the colour math (mock store + spy on material uniforms)
- Existing `src/engine/__tests__/IngredientComposition.test.ts` still green

**Files**: `src/ecs/hooks.ts` (or new trait file), `src/components/stations/Stuffer.tsx`, `src/components/stations/PhysicsFreezerChest.tsx`, `tests/micro/Stuffer.browser.test.tsx`

**Dependencies**: T0.A (selection should be deterministic across reloads)

---

### T0.C — Zoombinis-in-Hell deduction loop

**Story**: As a player, I want Mr. Sausage to give me cryptic clues about what he's hungry for, and I want to assemble ingredients from the fridge that satisfy those clues, with rounds escalating in complexity until the fridge is empty or my disgust meter overflows.

**Why**: This is the actual game. Without it, the player has stations to interact with but no objective beyond busywork. The composition pillar (T0.B) is only meaningful if the *selection* is goal-directed.

**Scope**:
- New module: `src/engine/ClueGenerator.ts` exporting:
  - `type Clue = { text: string; requiredTraits: IngredientTag[]; ingredientCountHint?: number; type: 'literal' | 'misdirection' | 'shock-me'; underlyingTraits: IngredientTag[] }`
  - `generateClue(round: number, available: IngredientDef[], rng: () => number): Clue`
  - `matchSelection(selection: IngredientDef[], clue: Clue): { isMatch: boolean; missingTraits: IngredientTag[]; bonusCoherence: number }`
- New Koota trait `HungerState` (or fields on `useGameStore`): `currentClue: Clue | null`, `disgustMeter: number` (0-100), `disgustThreshold: number` (default 100), `fridgeInventory: IngredientDef[]`, `matchHistory: MatchResult[]`, `roundIndex: number`
- Three clue templates:
  1. **Literal**: `"My tummy rumbles for something <traitA> and <traitB>"` — `requiredTraits` = `[traitA, traitB]`, `ingredientCountHint = traitCount`
  2. **Misdirection**: `"I really want walrus marinated in sprite but I'm a reasonable man..."` — fantasy-spec text with extracted underlying traits `[meat, fatty, sweet, sour]`
  3. **Shock-me**: `"Shock me!"` — no count hint, scored on creativity (selection size + tag diversity) + thematic coherence
- Match logic: superset-legal; for each clue trait, at least one selected ingredient must carry it
- Cramming bonus: extra ingredients beyond minimum → flair points IF `bonusCoherence > 0.5`; mood-variance penalty otherwise (mood RNG seeded from T0.A)
- Disgust accumulation: each mismatched trait → +disgustPerMiss; threshold-breach → game over via existing GameOverScreen
- Win condition: `fridgeInventory.length === 0` → walk-out victory
- New action: `submitSelection()` runs match, updates disgust/flair, depletes fridge, triggers next round
- Diegetic clue rendering via existing SurrealText (T0.D will add slide-down behaviour later, but the clue can mount to the first surface for now)
- Refactor RoundManager to delegate clue + win/loss state to the new module (or wrap it)

**Acceptance**:
- Unit tests `src/engine/__tests__/ClueGenerator.test.ts` cover:
  - Determinism (same seed → same clue sequence)
  - Match predicate edge cases (empty selection, exact match, superset, missing trait)
  - Cramming semantics (coherent superset → bonus, incoherent → penalty)
  - Disgust accumulation across multiple mismatches
  - Win condition (empty fridge)
- Browser test: complete a 3-round run via test harness using the seeded governor; assert fridge depletes; assert verdict screen shows
- `pnpm typecheck` clean, `pnpm test` green

**Files**: `src/engine/ClueGenerator.ts`, `src/engine/__tests__/ClueGenerator.test.ts`, `src/ecs/traits.ts` (HungerState), `src/ecs/hooks.ts` (actions), `src/engine/RoundManager.ts` (refactor)

**Dependencies**: T0.A (seeded), T0.B (selection plumbing must exist)

---

### T0.D — Reactive SurrealText slide-down system

**Story**: As a player, I want messages from Mr. Sausage to appear on a wall I'm looking at, give me time to read them, then slide down out of view when acknowledged, so the diegetic UI breathes with my attention.

**Why**: Current SurrealText is static fade — it appears and disappears on a timer regardless of whether I was looking at it. The design intent is **camera-aware, attention-modulated** text that earns its place by being readable.

**Scope**:
- State machine per message: `MOUNTED → SEEN → READING → DROPPING → REMOVED`
  - `MOUNTED`: text appears on assigned surface, alpha 0
  - `SEEN`: camera frustum intersects message AABB → start dwell timer
  - `READING`: dwell timer elapses (configurable per message, default `text.length * 80ms`)
  - `DROPPING`: position lerps downward (or shader UV scrolls), alpha fades
  - `REMOVED`: cleanup
- Koota queue: `surrealTextQueue: SurrealMessage[]` with `{ id, text, surface: 'wall-N' | 'wall-S' | 'ceiling' | 'floor' | Vector3, readDurationMs, priority, mountedAt }`
- Camera-aware mount: when `surface` is unspecified, pick the surface the player is currently facing using a frustum + raycast helper
- Action: `enqueueSurrealMessage(msg)` from anywhere (clue rendering, flair events, etc.)
- New utility: `src/components/environment/surrealText/cameraSurface.ts` for "which wall is the player looking at"
- Browser test: governor camera stares at wall-N, enqueue a 60-char message, advance frames, assert it mounts on wall-N, dwells, then drops; assert it does NOT remove until dwell completes

**Acceptance**:
- State machine fully unit-tested (state transitions, dwell timer, camera intersection)
- Browser test confirms read-then-drop loop
- Existing static SurrealText callers migrate to enqueue API (backward-compat shim allowed during transition)
- Zero 2D HUD elements added (rule check)

**Files**: `src/components/environment/SurrealText.tsx` (refactor), `src/components/environment/surrealText/cameraSurface.ts`, `src/components/environment/surrealText/messageQueue.ts`, `src/ecs/hooks.ts` (queue + actions), `src/components/environment/__tests__/SurrealText.test.tsx`, `tests/micro/SurrealText.browser.test.tsx`

**Dependencies**: T0.A (deterministic line selection), T0.C (clue rendering uses this)

---

## Tier 1 — Core mechanics (parallel after Tier 0)

### T1.A — "Will It Blow" splatter climax (the midpoint)

**Story**: As a player, after stuffing my casing, I want to pick up the stuffing tube, walk to the cereal box, aim, and **blow** — and I want the splatter to land permanently on the box and have Mr. Sausage score what I made.

**Why**: This is the game's namesake moment. It's also the **first hard-commit** in the round — before blowing, I can fix mistakes; after, I cannot. It's the diagnostic surface that proves my recipe was real.

**Scope**:
- New scene prop: `<CerealBoxTarget>` — procedural plane (or `cereal_box.glb` if available in PSX pack) with an animated surreal-drawing texture as the base layer (`useFrame` UV pulse or shader)
- New utility: `<CanvasTextureSplatter>` — wraps a `THREE.CanvasTexture` exposing `paintSplat(uv, ingredientDef, sprayParticleSize)` that draws into a 1024² 2D canvas:
  - Splat shape per `decomposition`: chunks → big lumps, paste → smears, powder → diffuse halos, shards → sharp punctures, liquid → drip runs
  - Colour: `ingredientDef.composition.color`
  - Persisted across rounds via export to localStorage / Capacitor SQLite (so the box tells the story of the run)
- New mechanic in `BlowoutStation.tsx`:
  - State `tubeHeld: boolean` — pick up stuffing tube from Stuffer
  - State `aimingAtBox: boolean` — raycast from FPS camera detects CerealBoxTarget
  - Trigger: hold-to-build pressure, release to blow
  - Particle stream from tube toward aim direction, each particle carries `{ uvHit, ingredientId }`
  - On particle-box collision: call `paintSplat(uv, ingredient, scale)`
- Composite tier scoring (record via `recordFlairPoint`):
  - **Massive**: coverage > 80% AND tonal coherence > 0.6 → +25 flair, Mr. Sausage reaction `delighted`
  - **Clean**: coverage > 50% → +15 flair, reaction `satisfied`
  - **Weak**: coverage > 20% → +5 flair, reaction `meh`
  - **Dud**: coverage < 20% → +0 flair, reaction `disgusted`
- Mr. Sausage reaction via existing 9-reaction system + queue a SurrealText line via T0.D
- Scoring uses seeded RNG (T0.A) for variance band

**Acceptance**:
- Browser test (`tests/micro/BlowoutStation.browser.test.tsx`): synthesize a spray, assert CanvasTexture got non-zero pixels at expected UVs, assert score tier recorded in `useGameStore.flairPoints`
- Unit test: tier function (`getCompositeTier(coverage, coherence) → tier`) covers all 4 boundaries
- `recordFlairPoint` called with non-zero points
- Splatter persists across round transitions (test: blow round 1, transition to round 2, assert canvas pixels still set)

**Files**: `src/components/stations/BlowoutStation.tsx`, `src/components/stations/blowout/CerealBoxTarget.tsx`, `src/components/stations/blowout/CanvasTextureSplatter.ts`, `src/components/stations/blowout/compositeTier.ts`, plus tests

**Dependencies**: T0.A, T0.B, T0.D

---

### T1.B — Presentation climax: ceiling trapdoor + plate on rope

**Story**: As a player, after I've cooked and tied my creation, I want to place it on a plate, watch the plate ascend through the ceiling trapdoor on a rope, hear silence, then receive Mr. Sausage's verdict from above. The trapdoor also explains how I got down here in the first place.

**Why**: This is the **true climax** of each round. The blowout (T1.A) is the *midpoint commit*; the presentation is the *judgment*. Currently `TrapDoorAnimation` is mounted in `App.tsx:137` but only the hinge-rotate stub exists — no rope, no plate, no presentation flow.

**Scope**:
- Audit existing `TrapDoorMount.tsx` + `TrapDoorAnimation.tsx`; refactor for clean state machine: `CLOSED → OPENING → OPEN → CLOSING → CLOSED`
- Trigger sources:
  - **Game start**: open at intro sequence start (player drop animation), then close
  - **Round end**: open when player triggers "present" interaction
- New component: `<PlateOnRope>`
  - Uses existing `plate_big.glb` (or pack equivalent — query asset library if missing)
  - Procedural rope via `THREE.TubeGeometry` along a Catmull-Rom spline from ceiling to counter
  - Descent animation: rope extends, plate eases down to counter height (~1.0m above island)
  - Ascent animation: reverse, with plate retracted into trapdoor
- Sausage placement interaction: tap or drag-drop the cooked sausage onto the plate (snap to socket)
- Presentation flow state machine in Koota: `PreparingPresent → PlateDescending → AwaitingSausage → SausagePlaced → PlateAscending → JudgmentPause → Verdict`
- Judgment pause: 2-3s of silence, TV static ramps via existing TV shader uniform
- Verdict: Mr. Sausage 9-reaction + SurrealText queue (T0.D) + match-or-disgust state from T0.C
- Mount in App.tsx: confirm position above island counter (currently `[0, 3, 0]`)

**Acceptance**:
- Browser test: complete a round (skip blowout via test harness), trigger present, observe trapdoor open → plate descend → place sausage → plate ascend → trapdoor close → verdict text appears within 8s
- Unit test for state machine transitions
- Visual check: rope is visible, plate model loads, no console errors

**Files**: `src/components/kitchen/TrapDoorMount.tsx`, `src/components/kitchen/TrapDoorAnimation.tsx`, `src/components/kitchen/PlateOnRope.tsx`, `src/components/kitchen/PresentationFlow.tsx`, `src/ecs/hooks.ts` (presentation state), `src/App.tsx` (wiring), tests

**Dependencies**: T0.C (verdict reads HungerState), T0.D (verdict text uses SurrealText queue)

---

### T1.C — Style points throughout

**Story**: As a player, I want my finesse at every station to be measured and rewarded with flair points, and I want Mr. Sausage to whisper acknowledgment when I do something stylish, so cooking feels like performance.

**Why**: `recordFlairPoint(reason, points)` exists in `src/ecs/hooks.ts:476` and is called only from `BlowoutStation.tsx:142`. Six other stations have no scoring. The verdict screen reads nothing from `flairPoints`. The whole "style is the point" pillar is dead-coded.

**Scope** — wire `recordFlairPoint` into:
- **`ChoppingBlock.tsx`**: chop rhythm scoring (interval consistency), near-edge precision bonus → unit test the scoring function pure-logic
- **`Grinder.tsx`**: plunger rhythm consistency, efficient chute clearing (no overflow) → particle counter feeds the score
- **`Stuffer.tsx`**: smooth crank (no stalls), clean casing attach gesture → variance of crank delta-time
- **`Stove.tsx`**: correct heat zone (sausage stays in optimal-temp band), no burst-risk near-overcook → integral of "in zone" time
- **`Sink.tsx`**: audit existing behaviour and assign a rinse-completeness or rhythm score
- **`PhysicsFreezerChest.tsx`**: not a flair point — but emit a `selectionEvent` for the deduction loop (T0.C)
- **TieGesture** (find current location): fast double-tap → +flair
- **`GameOverScreen.tsx`**: refactor `GameOverScreen.tsx:51-56` (currently hard-coded rank-only verdicts) to:
  - Read `flairPoints` from store
  - Display cumulative breakdown (per-reason rows with point totals)
  - Compute style-weighted verdict (e.g., `Glorious` if `flair > 200`, `Adequate` if 80-200, `Pathetic` if < 80)
- Mr. Sausage whispers: each `recordFlairPoint` call triggers `enqueueSurrealMessage()` (T0.D) with a small congratulatory line, throttled to 1 per 3s

**Acceptance**:
- Unit test for each station's scoring function (pure logic, no R3F)
- Browser test: trigger a flair event, assert SurrealText whisper queued
- GameOverScreen test: mount with mocked flairPoints, assert breakdown rendered + verdict tier computed
- All 7 stations now call `recordFlairPoint` at least once in a happy-path interaction

**Files**: `src/components/stations/ChoppingBlock.tsx`, `Grinder.tsx`, `Stuffer.tsx`, `Stove.tsx`, `Sink.tsx`, `PhysicsFreezerChest.tsx`, plus TieGesture wherever it lives; `src/components/ui/GameOverScreen.tsx`; tests

**Dependencies**: T0.A (seeded variance), T0.D (whispers)

---

## Tier 2 — Polish + atmosphere (parallel after Tier 1)

### T2.A — Jigsaw Billy TV upgrade

**Story**: As a player, I want the TV to feel like a Jigsaw Billy puppet — red-tinted, periodically swivelling toward me with a creepy servo whine, head-tilted, with static bursts at phase transitions.

**Scope**:
- Swap green phosphor `#44ff55` → red menace `#ff2200` in `TV.tsx`
- Add Y-axis swivel servo: lerp toward player position on a 5-7s schedule, with audible servo whine via existing AudioEngine
- Slight Z-axis tilt (Jigsaw signature)
- Static burst shader uniform driven by phase transitions (Koota subscription)

**Acceptance**:
- Browser screenshot test from 4 player positions, asserts TV head rotation tracks
- Audio test: servo whine sample played on swivel
- Static burst observed on phase change

**Files**: `src/components/stations/TV.tsx`, `src/components/stations/TV.browser.test.tsx`

**Dependencies**: Tier 1 complete

---

### T2.B — SlaughterhouseDressing component (place 60 unused GLBs)

**Story**: As a player, I want the basement to feel inhabited by violence — chainsaw on the wall, bear trap near my mattress, cage in the corner, pipes and chains overhead, debris on the floor — so the room tells me what happens here.

**Scope**:
- New components (each <100 LOC):
  - `<WallTrophies>` — chainsaw wall-mounted over stove, ONE horror mask above stove as family heirloom
  - `<CeilingHazards>` — overhead pipes + horror_wires_hr_1 chains
  - `<FloorDebris>` — brick, plank, cardboard box, metal barrel scattered with seeded positions
  - `<FarCornerCage>` — cage with horror_flesh.glb inside
  - `<BearTrapByMattress>` — placed near existing mattress
  - `<WallShelf>` — utility shelf with prop GLBs
- All static `RigidBody type="fixed"`, no `castShadow`, low-priority preload
- Position via seeded RNG (T0.A) so each save has consistent dressing
- Asset selection: query asset library MCP for chainsaw, bear_trap, cage, pipe, chain, brick, plank, cardboard_box, metal_barrel, horror_mask, horror_flesh, horror_wires_hr_1

**Acceptance**:
- Browser screenshot test from 4 viewport perspectives; assert mesh count exceeds threshold (>40 set-dressing meshes added)
- Frame time stays <16ms (perf test)
- All 6 components named-export

**Files**: `src/components/environment/dressing/WallTrophies.tsx`, `CeilingHazards.tsx`, `FloorDebris.tsx`, `FarCornerCage.tsx`, `BearTrapByMattress.tsx`, `WallShelf.tsx`, `SlaughterhouseDressing.tsx` (orchestrator), tests

**Dependencies**: T0.A (seeded placement)

---

### T2.C — POC fidelity tuning

**Story**: As a player, I want the particle density to match the original POC's "feel" — more grinder chunks, denser stove splats, fuller blowout sprays — now that the systems are correct enough to scale up.

**Scope**:
- `Grinder.tsx`: chunk pool 5 → 20; spawn count per ingredient computed from `composition.density`
- `Stove.tsx`: FBO 256 → 512, `displacementScale` 0.2 → 1.5, splat pool 100 → 1000
- `BlowoutStation.tsx`: particle pool 80 → 1000

**Acceptance**:
- Visual browser test confirming density delta at each station
- Perf test: frame time stays <16ms on mobile-390 viewport
- No regressions in existing browser tests

**Files**: `src/components/stations/Grinder.tsx`, `Stove.tsx`, `BlowoutStation.tsx`, perf test

**Dependencies**: T2.B (so we know the scene budget)

---

### T2.D — Audit findings: dialogue effects + verdict screen

**Story**: As a developer, I want known dead-coded paths fixed so the audit signal shrinks.

**Scope**:
- **Dialogue effects**: `applyEffects()` in dialogue runner (find current location) is defined but never called. Wire it into the runner so `effect: 'stall'` adds time and `effect: 'anger'` adds strikes
- **Verdict screen**: `GameOverScreen.tsx:51-56` already addressed in T1.C — verify here that the audit flag is cleared

**Acceptance**:
- Unit tests for dialogue effects (stall + anger paths exercised)
- Audit re-run shows both items resolved

**Files**: `src/engine/DialogueEngine.ts` (or wherever runner lives), `src/components/ui/GameOverScreen.tsx`, tests

**Dependencies**: T1.C

---

## Dependencies Graph

```
T0.A (seeded RNG)
  └─> T0.B (composition pillar)
        └─> T0.C (deduction loop)
              └─> T0.D (surreal text)
                    ├─> T1.A (blowout climax)        ─┐
                    ├─> T1.B (presentation climax)   ─┼─> T2.A (TV upgrade)
                    └─> T1.C (style points)          ─┤
                                                     ├─> T2.B (set dressing)
                                                     ├─> T2.C (fidelity tuning)
                                                     └─> T2.D (audit fixes)
```

**Sequential** (must run in order): T0.A → T0.B → T0.C → T0.D
**Parallel wave 1** (after Tier 0): T1.A, T1.B, T1.C
**Parallel wave 2** (after Tier 1): T2.A, T2.B, T2.C, T2.D

---

## Acceptance Criteria Summary (all tasks)

Every task in this PRD must satisfy these global gates:

1. **Test-first**: a contract test file is committed BEFORE the implementation file (per AGENTS.md build principle)
2. **Doc-first**: module-level JSDoc explains WHY (purpose, design intent), not just WHAT
3. **Typecheck clean**: `pnpm typecheck` passes
4. **Lint clean**: `pnpm lint` passes (Biome 2.4)
5. **Tests green**: `pnpm test` and any new browser tests pass
6. **No 2D HUD**: zero new 2D overlays during gameplay (diegetic-only rule)
7. **No `Math.random` in gameplay**: all randomness via `useRunRng()` (after T0.A lands)
8. **Named exports**: no default exports
9. **LOC discipline**: no new file > 400 LOC; split along clear seams
10. **Conventional commits**: `feat(composition):`, `feat(deduction):`, `fix(verdict):`, etc.

---

## Technical Notes

- **Branch**: `feat/deep-hierarchical-validation` (do not switch branches)
- **No push without explicit user approval**
- **Commit slicing**: data layer → consumers → visuals → tests; each commit leaves typecheck + tests green
- **Mock `useGLTF`** in any new jsdom unit test that touches R3F components loading GLBs
- **Browser tests** under `tests/micro/*.browser.test.tsx` for anything visual
- **JSON as single source of truth**: any new tunable belongs in `src/config/*.json`
- **Asset library MCP**: query for any new GLBs needed in T2.B before assuming local availability

---

## Risks

1. **T0.A migration scope is broad** — touching 10+ files across three subsystems. Mitigation: land the new module + test FIRST, then migrate one file per commit so each commit stays bisectable.
2. **T0.B may surface latent Stuffer rendering bugs** — the casing material is intricate. Mitigation: add visual regression test during this task, not after.
3. **T0.C is the largest single task** — clue generation + match logic + state machine + UI integration. Mitigation: split into T0.C.1 (ClueGenerator pure logic + tests) and T0.C.2 (state machine + integration) if it exceeds 400 LOC.
4. **T1.A canvas-texture persistence across rounds** — Capacitor SQLite blob serialization is unproven. Mitigation: localStorage fallback for now; defer SQLite to a follow-up task.
5. **T2.B perf budget** — adding 40+ static meshes risks breaking the 16ms frame. Mitigation: add perf assertion in the same browser test that adds the meshes; back off counts if needed.
6. **Mid-task discovery of new lost requirements** — likely. Mitigation: per the brief, create a follow-up task rather than expanding scope mid-task.
