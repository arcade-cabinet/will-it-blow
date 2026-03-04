# Active Context — Will It Blow?

**Last updated:** 2026-03-04

## Current Branch

`feat/dual-zone-touch-controls` — dual-zone mobile touch controls, Rapier sensor fix, E2E tests

## Current Focus

PR #33: Dual-zone touch controls for mobile, Rapier KINEMATIC_FIXED sensor detection fix, real-playthrough E2E tests with 5 mobile device profiles.

## Merged PRs

| PR | Branch | Status |
|----|--------|--------|
| #25 | feat/sausage-factory-kitchen | Merged — Phase 1 complete |
| #27 | Phase 2 Sprint 1 | Merged — difficulty, horror, input |
| #28 | Phase 2 Sprint 2 | Merged — enemy encounters |
| #29 | Phase 2 Sprint 3 | Merged — blowout, multi-round, hidden objects, cleanup |

## Open PRs

| PR | Branch | Status |
|----|--------|--------|
| #33 | feat/dual-zone-touch-controls | Open — dual-zone touch controls, Rapier fix, E2E tests |

## Recent Work

### PR #33: Dual-zone touch controls + Rapier fix + E2E tests (2026-03-04) — IN PROGRESS

- **Dual-zone SwipeFPSControls**: split-screen touch input — left half for movement, right half for look/interact
- **Rapier KINEMATIC_FIXED bitmask fix**: `activeCollisionTypes={15 | 8704}` for sensor detection with kinematic bodies
- **GameGovernor additions**: `setCamera(pos, yaw)`, `debugMeshes()`, `setSceneBg()` for Playwright automation
- **Playwright mobile profiles**: 5 device configurations (iPhone SE, iPhone 14 Pro, Pixel 7, iPad Mini, Galaxy S23)
- **E2E test specs**: real-playthrough E2E tests + touch-controls E2E tests
- **Asset preloading + standoff camera**: fix for real playthrough screenshots

## Test Health

- **1587 tests** across **96 suites**
- Biome lint clean, TypeScript clean
- CI: parallel lint + typecheck + test + build

## Known Issues

- TypeScript stack overflow requires `node --stack-size=8192` (handled by `pnpm typecheck`)
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
