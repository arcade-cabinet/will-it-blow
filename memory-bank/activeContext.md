# Active Context — Will It Blow?

**Last updated:** 2026-03-03

## Current Branch

`main` — all feature branches merged

## Current Focus

Phase 2 Sprints 1-3 are complete. All major gameplay systems are implemented. Current focus is on data-driven challenge manifest refinement and remaining plan items from the comprehensive Phase 2 design doc.

## Merged PRs

| PR | Branch | Status |
|----|--------|--------|
| #25 | feat/sausage-factory-kitchen | Merged — Phase 1 complete |
| #27 | Phase 2 Sprint 1 | Merged — difficulty, horror, input |
| #28 | Phase 2 Sprint 2 | Merged — enemy encounters |
| #29 | Phase 2 Sprint 3 | Merged — blowout, multi-round, hidden objects, cleanup |

## Recent Work

### Task #20: JSDoc cleanup + progress.md update (2026-03-03) — COMPLETE
- Replaced all `resolveTargets()` references with `resolveLayout()` in JSDoc/comments:
  - `src/engine/FurnitureLayout.ts` (FurnitureRule.target doc + getStationTarget params + stale comment)
  - `src/components/kitchen/FurnitureLoader.tsx` (module doc)
  - `src/components/kitchen/TrapDoorMount.tsx` (module doc)
  - `src/components/kitchen/FridgeStation.tsx` (props JSDoc)
  - `src/components/GameWorld.tsx` (module doc + StationSensor props JSDoc)
  - `src/components/kitchen/TransferBowl.tsx` (module doc, already fixed by linter)
- Updated `memory-bank/progress.md` to reflect Phase 2 Sprints 1–3 completion, 1529 tests, 100% CI/CD

### Task #14: Replace `as any` traversals (2026-03-03) — COMPLETE
- Created `src/engine/threeUtils.ts` with typed `traverseMeshes(root, callback)` utility
- Updated `FurnitureLoader.tsx` and `HorrorPropsLoader.tsx` to use it
- Added `RapierRigidBody` + `RapierObject3D` typed interfaces in `GrabSystem.tsx`

### Phase 2 Sprint 3 (2026-03-03) — COMPLETE
- Blowout challenge: TieGesture, BlowoutOrchestrator (ECS), CerealBox splat, PlaceSetting, BlowoutHUD
- Multi-round loop: RoundManager (C(12,3) combo tracking), TrapDoorAnimation, RoundTransition UI
- Hidden objects: CabinetDrawer (spring animations), KitchenAssembly, HiddenObjectOverlay
- Cleanup mechanics: ProceduralSink, CleanupManager, CleanupHUD
- CI/CD: Fully hardened with parallel lint, typecheck, test, build jobs

### Phase 2 Sprint 2 (2026-03-02) — COMPLETE
- Enemy encounter system: 5 enemy types, 5 weapons, 4 spawn cabinets
- ECS: EnemySpawnSystem + CombatSystem + CabinetBurst + CombatHUD
- AI state machine: spawning→approaching→attacking→stunned→dying→dead
- Difficulty-scaled spawn probability

### Phase 2 Sprint 1 (2026-03-02) — COMPLETE
- Difficulty system: 5 tiers (Rare→Well Done), JSON config-driven
- Horror scene dressing: 21 PSX GLBs via tiered HorrorPropsLoader
- InputManager: Universal input with JSON bindings, keyboard/mouse/gamepad/touch

### Phase 1 Completion (2026-03-02) — COMPLETE
- ECS orchestrators promoted to full game drivers (Grinder, Stuffer, Cooking)
- Thin HUD components (GrindingHUD, StuffingHUD, CookingHUD) — read-only Zustand subscribers
- Old 2D challenge overlays deleted
- 769 tests, 55 suites at Phase 1 close; grew to 1530 tests, 94 suites by Sprint 3

## Test Health

- **1530 tests** across **94 suites**
- Biome lint clean, TypeScript clean
- CI: parallel lint + typecheck + test + build

## Known Issues

- TypeScript stack overflow requires `node --stack-size=8192` (handled by `pnpm typecheck`)
- Mobile touch controls untested on real devices
- Native audio is a complete no-op

## Decisions Made

- Orchestrators own ALL game logic — HUDs are pure read-only display
- ECS input primitives drive game state (not 2D gestures)
- `challengePhase` store field bridges orchestrator→HUD dialogue transitions
- Old 2D challenge overlays fully deleted (not deprecated)
- Data-driven config: ~200 magic numbers extracted to JSON files
- CI/CD runs parallel jobs for fast feedback

## What's Next

1. Data-driven challenge manifest: centralize all challenge parameters in JSON config
2. Remaining Phase 2 plan items (polish, balancing, asset optimization)
3. Mobile testing on real devices
4. Native audio implementation
