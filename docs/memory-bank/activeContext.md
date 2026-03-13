# Active Context — Will It Blow?

**Last updated:** 2026-03-13

## Current Branch

`main` — 30+ commits ahead of origin. All 28 PRD tasks complete.

## Current Focus

All PRD tasks complete. Project is in maintenance/polish phase. 37 test suites, 397 tests, 0 failures. 0 lint errors, 0 TypeScript errors.

## Merged PRs

| PR | Branch | Status |
|----|--------|--------|
| #25 | feat/sausage-factory-kitchen | Merged — Phase 1 complete |
| #27 | Phase 2 Sprint 1 | Merged — difficulty, horror, input |
| #28 | Phase 2 Sprint 2 | Merged — enemy encounters |
| #29 | Phase 2 Sprint 3 | Merged — blowout, multi-round, hidden objects, cleanup |
| #33 | feat/dual-zone-touch-controls | Merged — dual-zone touch controls, Rapier fix, E2E tests |

## Open PRs

None.

## Recent Work

### All 28 PRD Tasks Complete (2026-03-13)

- All 7 challenge mechanics fully implemented with scoring
- Data-driven config: audio.json with 40+ OGG assets, phase-specific music mapping, spatial sounds
- 12 JSON config files in src/config/ (audio, blowout, camera, chopping, demands, dialogue, grinder, ingredients, rounds, scoring, stove, stuffer)
- CRT shader (TSL NodeMaterial) exists and is integrated
- GameOverScreen, LoadingScreen, HintDialogue, all HUDs implemented
- Kitchen.tsx has GLB loading working
- AudioEngine.ts (procedural Web Audio API synthesis) and AudioEngine.web.ts (Tone.js) both implemented

## Test Health

- **397 tests** across **37 suites**, **0 failures**
- Biome lint clean (0 errors), TypeScript clean (0 errors)
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

1. Mobile testing on real devices
2. Native audio implementation
3. Polish, balancing, asset optimization
4. Push to origin / production deployment
