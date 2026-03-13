---
title: Active Context
domain: memory-bank
status: current
last-verified: "2026-03-13"
summary: "Current session — feat/poc-exploration branch, documentation overhaul"
---

# Active Context — Will It Blow?

**Last updated:** 2026-03-13

## Current Branch

`feat/poc-exploration` — major architectural pivot from Phase 2 ECS to greenfield procedural components

## Current Focus

Documentation architecture overhaul: DRYing out docs, adding YAML frontmatter to all memory-bank files, updating content to reflect the POC exploration pivot.

## Recent Work

### POC Exploration Pivot (2026-03-10 to 2026-03-13) — IN PROGRESS

A major architectural pivot that:

- **Deleted** the old Phase 2 ECS architecture (miniplex, layout system, input manager, ~1529 tests)
- **Rebuilt** as greenfield procedural R3F components (Grinder, Stuffer, Stove, ChoppingBlock, ChestFreezer, etc.)
- **Replaced** FPS free-walk (WASD + pointer-lock) with camera rail system (CameraRail.tsx, IntroSequence.tsx)
- **Ported** POC physics: Rapier bone-chain sausage body with spring forces (Sausage.tsx + SausageGeometry.ts)
- **Restored** demand scoring (DemandScoring.ts) and ingredient matching (IngredientMatcher.ts)
- **Restored** multi-round loop (RoundManager.ts with C(12,3) combo tracking)
- **Added** dialogue system and Mr. Sausage commentary
- **Added** diegetic UI via SurrealText (in-world 3D text meshes)
- **Added** mobile touch controls (PlayerHands.tsx, LiquidPourer.tsx)
- **Added** OGG sample audio (replacing pure Tone.js synthesis)
- **Added** Git LFS tracking for binary assets (.ogg, .png, .glb)

Key commits (11 total on branch):
- `d2a4f6f` feat: complete greenfield procedural rewrite with hybrid asset injection
- `0f92d3a` feat: restore advanced POC physics and interactions
- `28cb4a1` feat: restore demand scoring and ingredient matching systems
- `597cb48` feat: full production parity with dialogue and mobile controls
- `6a5bec3` feat: complete multi-round replayability and missing interactions
- `f82b355` fix: address all PR feedback and biome linting errors

## Merged PRs (pre-pivot)

| PR | Branch | Status |
|----|--------|--------|
| #25 | feat/sausage-factory-kitchen | Merged — Phase 1 complete |
| #27 | Phase 2 Sprint 1 | Merged — difficulty, horror, input |
| #28 | Phase 2 Sprint 2 | Merged — enemy encounters |
| #29 | Phase 2 Sprint 3 | Merged — blowout, multi-round, hidden objects, cleanup |
| #33 | feat/dual-zone-touch-controls | Merged — touch controls, Rapier fix |

## Test Health

Tests are being refactored to match the new architecture. The old 1529+ test suite was tied to the deleted ECS architecture. New tests cover:
- DemandScoring (unit tests)
- RoundManager (unit tests)
- IngredientMatcher (unit tests)
- DifficultyConfig (unit tests)

## Known Issues

- TypeScript stack overflow requires `node --stack-size=8192` (handled by `pnpm typecheck`)
- Native audio is a complete no-op
- Test suite is significantly reduced from pre-pivot — rebuilding coverage for new architecture

## Decisions Made

- **POC pivot**: Deleted old ECS/layout complexity in favor of playable procedural simplicity
- **Camera rail**: Replaced FPS free-walk with automatic camera rail between stations
- **Diegetic UI**: SurrealText for in-world instructions instead of floating HUD overlays
- **OGG audio**: Sample-based audio supplements Tone.js synthesis
- **Git LFS**: Binary assets tracked to keep repo size manageable
- **Procedural stations**: Each station is a self-contained R3F component with its own geometry and physics

## What's Next

1. Complete documentation overhaul (frontmatter, DRY content, memory-bank updates)
2. Merge `feat/poc-exploration` to main
3. Continue building out station interactions and polish
4. Expand test coverage for new procedural components
5. Mobile testing on real devices
