# Batch: lost-requirements-restoration

**Created**: 2026-04-08
**Project**: Will It Blow?
**Branch**: `feat/deep-hierarchical-validation`
**PRD**: `docs/plans/2026-04-08-lost-requirements-restoration.md`
**Config**: stop_on_failure=false, auto_commit=true, parallelism=by_wave
**Teammates**: scene-architect, challenge-dev, store-warden, asset-pipeline, doc-keeper

## Execution Order

- **Wave 1 (sequential)**: T0.A → T0.B → T0.C → T0.D
- **Wave 2 (parallel)**: T1.A, T1.B, T1.C
- **Wave 3 (parallel)**: T2.A, T2.B, T2.C, T2.D

## Tasks

### Wave 1 — Tier 0 substrate (sequential)

1. **[P0] T0.A — Seeded deterministic RNG (Mulberry32)**
   - Agent: `store-warden`
   - Files: `src/engine/RunSeed.ts`, `src/engine/__tests__/RunSeed.test.ts`, `src/ecs/actions.ts`, `src/ecs/hooks.ts`, `src/components/stations/PhysicsFreezerChest.tsx`, `Grinder.tsx`, `Stove.tsx`, `Sink.tsx`, `BlowoutStation.tsx`, `src/components/sausage/Sausage.tsx`, `SausageGeometry.ts`, `src/components/environment/SurrealText.tsx`
   - Criteria:
     - `src/engine/RunSeed.ts` exports `createSeededRng`, `getRunSeed`, `setRunSeed`
     - Mulberry32 implementation, no new deps
     - Unit test pins same-seed determinism (1000 draws identical)
     - `grep -rE "Math\.random" src/engine src/components/stations src/components/sausage src/ecs` returns 0 hits
     - `pnpm typecheck` and `pnpm test` green
   - Dependencies: none

2. **[P0] T0.B — Composition pillar end-to-end via Stuffer casing**
   - Agent: `challenge-dev`
   - Files: `src/ecs/hooks.ts` (selection), `src/components/stations/Stuffer.tsx`, `src/components/stations/PhysicsFreezerChest.tsx`, `tests/micro/Stuffer.browser.test.tsx`
   - Criteria:
     - `useGameStore` exposes `currentRoundSelection`, `addToSelection`, `removeFromSelection`, `clearSelection`
     - `Stuffer.tsx` calls `compositeMix` from at least one production code path
     - Casing material colour/transmission visibly responds to selection
     - Browser test asserts pixel colour delta when selection changes
   - Dependencies: 1

3. **[P0] T0.C — Zoombinis-in-Hell deduction loop**
   - Agent: `challenge-dev`
   - Files: `src/engine/ClueGenerator.ts`, `src/engine/__tests__/ClueGenerator.test.ts`, `src/ecs/traits.ts`, `src/ecs/hooks.ts`, `src/engine/RoundManager.ts`
   - Criteria:
     - `Clue` type + `generateClue` + `matchSelection` exported
     - 3 clue templates: literal, misdirection, shock-me
     - Match logic supports superset, missing-trait, cramming bonus
     - `HungerState` Koota trait with `currentClue`, `disgustMeter`, `fridgeInventory`, `matchHistory`, `roundIndex`
     - Disgust accumulation + win condition (empty fridge) tested
     - Determinism: same seed → same clue sequence
     - Browser test completes a 3-round run via test harness
   - Dependencies: 1, 2

4. **[P0] T0.D — Reactive SurrealText slide-down system**
   - Agent: `scene-architect`
   - Files: `src/components/environment/SurrealText.tsx`, `src/components/environment/surrealText/cameraSurface.ts`, `src/components/environment/surrealText/messageQueue.ts`, `src/ecs/hooks.ts`, `src/components/environment/__tests__/SurrealText.test.tsx`, `tests/micro/SurrealText.browser.test.tsx`
   - Criteria:
     - State machine: MOUNTED → SEEN → READING → DROPPING → REMOVED
     - Koota `surrealTextQueue` + `enqueueSurrealMessage` action
     - Camera-aware surface picking when surface unspecified
     - Browser test: governor faces wall-N, message mounts there, dwells, drops
     - Zero new 2D overlays
   - Dependencies: 1, 3

### Wave 2 — Tier 1 core mechanics (parallel after Wave 1)

5. **[P1] T1.A — Will It Blow splatter climax**
   - Agent: `challenge-dev`
   - Files: `src/components/stations/BlowoutStation.tsx`, `src/components/stations/blowout/CerealBoxTarget.tsx`, `CanvasTextureSplatter.ts`, `compositeTier.ts`, `tests/micro/BlowoutStation.browser.test.tsx`
   - Criteria:
     - `<CerealBoxTarget>` component renders with surreal-drawing base texture
     - `<CanvasTextureSplatter>` exposes `paintSplat(uv, ingredient, scale)`
     - Splat shape varies by `decomposition` type (chunks/paste/powder/shards/liquid)
     - Pickup-tube → walk → aim → blow flow works
     - Composite tier function tested at all 4 boundaries (massive/clean/weak/dud)
     - `recordFlairPoint` called with non-zero points on successful blow
     - Splatter persists across round transitions (localStorage acceptable)
     - Browser test: synthesize spray, assert non-zero canvas pixels at expected UVs
   - Dependencies: 1, 2, 4

6. **[P1] T1.B — Presentation climax: trapdoor + plate on rope**
   - Agent: `scene-architect`
   - Files: `src/components/kitchen/TrapDoorMount.tsx`, `TrapDoorAnimation.tsx`, `PlateOnRope.tsx`, `PresentationFlow.tsx`, `src/ecs/hooks.ts`, `src/App.tsx`, tests
   - Criteria:
     - Trapdoor state machine CLOSED → OPENING → OPEN → CLOSING → CLOSED tested
     - `<PlateOnRope>` uses `plate_big.glb` + procedural `THREE.TubeGeometry` rope
     - Trapdoor opens at game-start (intro) AND on round-end (presentation)
     - Sausage placement: tap/drag-drop snaps to plate socket
     - Presentation flow: PreparingPresent → PlateDescending → AwaitingSausage → SausagePlaced → PlateAscending → JudgmentPause → Verdict
     - 2-3s judgment pause with TV static ramp
     - Verdict text rendered via SurrealText queue (T0.D)
     - Browser test: complete a round via test harness, verify full sequence within 8s
   - Dependencies: 3, 4

7. **[P1] T1.C — Style points throughout**
   - Agent: `challenge-dev`
   - Files: `src/components/stations/ChoppingBlock.tsx`, `Grinder.tsx`, `Stuffer.tsx`, `Stove.tsx`, `Sink.tsx`, TieGesture, `src/components/ui/GameOverScreen.tsx`, station + verdict tests
   - Criteria:
     - All 6 stations call `recordFlairPoint` at least once in happy-path interaction
     - Per-station scoring functions are pure logic, unit tested
     - `GameOverScreen.tsx` reads `flairPoints` and renders cumulative breakdown
     - Style-weighted verdict tier (Glorious/Adequate/Pathetic) computed from total
     - Mr. Sausage whispers via `enqueueSurrealMessage` on flair events, throttled 1/3s
     - Browser test: trigger flair, assert whisper queued
   - Dependencies: 1, 4

### Wave 3 — Tier 2 polish (parallel after Wave 2)

8. **[P2] T2.A — Jigsaw Billy TV upgrade**
   - Agent: `scene-architect`
   - Files: `src/components/stations/TV.tsx`, `TV.browser.test.tsx`
   - Criteria:
     - Phosphor colour `#44ff55` → `#ff2200`
     - Y-axis swivel servo lerps toward player on 5-7s schedule
     - Servo whine sample plays on swivel (AudioEngine)
     - Z-axis tilt (Jigsaw signature)
     - Static burst shader uniform on phase transitions
     - Browser screenshot test from 4 player positions
   - Dependencies: 5, 6, 7

9. **[P2] T2.B — SlaughterhouseDressing (place 60 unused GLBs)**
   - Agent: `asset-pipeline`
   - Files: `src/components/environment/dressing/WallTrophies.tsx`, `CeilingHazards.tsx`, `FloorDebris.tsx`, `FarCornerCage.tsx`, `BearTrapByMattress.tsx`, `WallShelf.tsx`, `SlaughterhouseDressing.tsx`, tests
   - Criteria:
     - 6 named-export components, each <100 LOC
     - Static `RigidBody type="fixed"`, no `castShadow`
     - Positions seeded via T0.A (deterministic per save)
     - Asset library MCP queried for chainsaw, bear_trap, cage, pipe, chain, brick, plank, cardboard_box, metal_barrel, horror_mask, horror_flesh, horror_wires_hr_1
     - >40 set-dressing meshes added (mesh count assertion)
     - Frame time stays <16ms on mobile-390 viewport
     - Browser screenshot test from 4 viewport perspectives
   - Dependencies: 1

10. **[P2] T2.C — POC fidelity tuning**
    - Agent: `scene-architect`
    - Files: `src/components/stations/Grinder.tsx`, `Stove.tsx`, `BlowoutStation.tsx`, perf test
    - Criteria:
      - Grinder chunk pool 5 → 20; spawn count from `composition.density`
      - Stove FBO 256 → 512, displacementScale 0.2 → 1.5, splat pool 100 → 1000
      - BlowoutStation particle pool 80 → 1000
      - Perf test: frame time stays <16ms on mobile-390
      - Visual browser test confirms density increase
    - Dependencies: 9

11. **[P2] T2.D — Audit findings: dialogue effects + verdict screen**
    - Agent: `challenge-dev`
    - Files: `src/engine/DialogueEngine.ts`, `src/components/ui/GameOverScreen.tsx`, tests
    - Criteria:
      - `applyEffects()` called from dialogue runner; `effect: 'stall'` adds time, `effect: 'anger'` adds strikes
      - Unit tests cover both stall and anger paths
      - Verdict screen audit flag cleared (verified via T1.C)
    - Dependencies: 7

## Global Gates (every task)

- Test file committed BEFORE implementation (test-first per AGENTS.md)
- Module JSDoc explains WHY
- `pnpm typecheck` clean
- `pnpm lint` clean (Biome 2.4)
- `pnpm test` green
- Zero new 2D HUD elements (diegetic-only)
- Named exports only (no default exports)
- No file > 400 LOC
- Conventional commits: `feat(composition):`, `feat(deduction):`, `fix(verdict):`, etc.
- Commit on `feat/deep-hierarchical-validation`; no push without explicit approval
