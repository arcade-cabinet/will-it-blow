---
title: Active Context
domain: memory-bank
status: current
last-verified: "2026-03-13"
summary: "Current session — feat/poc-exploration branch, gap analysis complete, doc updates in progress"
---

# Active Context — Will It Blow?

**Last updated:** 2026-03-13

## Current Branch

`feat/poc-exploration` — greenfield rebuild replacing Phase 2 ECS architecture with procedural R3F components

## Current Focus

Gap analysis complete. Updating all docs to reflect the actual greenfield state vs the inherited main-branch documentation.

## Gap Analysis Summary (2026-03-13)

### Macro: Architecture Delta

| Metric | main | feat/poc-exploration | Delta |
|--------|------|---------------------|-------|
| Components | ~118 | 34 | -71% |
| ECS files | 75 | 0 | -100% |
| Config files | 36 | 1 | -97% |
| Test suites | ~96 | 7 | -93% |
| Tests | ~1529 | 62 (52 pass) | -96% |
| Store lines | 1038 | 236 | -77% |
| Binary assets | 0 (untracked) | 62 (Git LFS) | +62 |

### Meso: Component Status

**18 COMPLETE** — Grinder, Stuffer, Stove, ChoppingBlock, BlowoutStation, TV, Sink, Sausage, SausageGeometry, CameraRail, IntroSequence, FirstPersonControls, MrSausage3D, BasementRoom, SurrealText, ScatterProps/Prop, TitleScreen, DialogueOverlay

**2 PARTIAL** — PhysicsFreezerChest (geometry only), ProceduralIngredients (partial rendering)

**2 STUBS** — Kitchen.tsx (empty fragment), ChestFreezer.tsx (no interactivity)

**Missing from main** — GameOverScreen, LoadingScreen, ChallengeHeader, StrikeCounter, ProgressGauge, all 4 HUDs, CrtShader, IngredientChallenge, TastingChallenge, RoundTransition, CombatHUD, HiddenObjectOverlay, SettingsScreen, HintButton

### Micro: Engine/Store Gaps

- Store dead fields: `dialogueActive`, `currentDialogueLine` (never read)
- `finalScore` typed as `any`
- GameOrchestrator PHASES missing TIE_CASING and BLOWOUT
- App.tsx has no `results` phase rendering
- Console suppression hides `Maximum update depth exceeded` errors
- DialogueEngine effects system untested and likely dead code
- No ChallengeRegistry, SausagePhysics, or assetUrl engine modules

## Decisions Made

- **POC pivot**: Deleted old ECS/layout complexity in favor of playable procedural simplicity
- **Camera rail**: Replaced FPS free-walk with automatic camera rail between stations
- **Diegetic UI**: SurrealText for in-world instructions instead of floating HUD overlays
- **OGG audio**: Sample-based audio supplements Tone.js synthesis
- **Git LFS**: Binary assets tracked to keep repo size manageable
- **Procedural stations**: Each station is a self-contained R3F component

## What's Next

1. Finish updating all docs with gap analysis findings (in progress)
2. Fix failing tests (10 of 62)
3. Add missing UI components: GameOverScreen, LoadingScreen, HUDs
4. Wire up GameOrchestrator with missing phases (TIE_CASING, BLOWOUT)
5. Type `finalScore` properly; remove dead store fields
6. Merge feat/poc-exploration to main
7. Continue building out station interactions
8. Mobile testing on real devices
