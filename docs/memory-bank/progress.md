---
title: Progress
domain: memory-bank
status: current
last-verified: "2026-03-13"
summary: "What works, what doesn't, milestones completed"
---

# Progress — Will It Blow?

**Last updated:** 2026-03-13

## Completion Overview

| Domain | % | Status |
|--------|---|--------|
| Core gameplay loop | 70% | 7 stations exist as procedural components; scoring and multi-round ported; challenge interactions being refined |
| 3D visuals | 75% | Greenfield procedural stations + GLB kitchen; camera rail; diegetic UI (SurrealText) |
| Physics/Rapier | 70% | Bone-chain sausage body ported from POC (spring forces, SkinnedMesh); station colliders |
| Audio (web) | 50% | OGG samples added; Tone.js synthesis still available; per-station wiring in progress |
| Audio (native) | 0% | Complete no-op stub |
| Camera system | 90% | Camera rail between stations (CameraRail.tsx + IntroSequence.tsx); smooth interpolation |
| Demand scoring | 80% | DemandScoring.ts restored; ingredient matching (IngredientMatcher.ts); demand bonus calculation |
| Multi-round | 80% | RoundManager with C(12,3) combo tracking; TrapDoorAnimation; round transitions |
| State management | 80% | Zustand store with challenge progression, player decisions, multi-round state |
| Mobile controls | 60% | PlayerHands, touch gestures on 3D meshes; needs real device testing |
| Testing | 30% | Old 1529-test ECS suite deleted; new tests for DemandScoring, RoundManager, IngredientMatcher, DifficultyConfig |
| Documentation | 70% | Undergoing major overhaul this session (frontmatter, DRY, memory-bank updates) |
| CI/CD | 90% | Parallel jobs: lint, typecheck, test, build — needs update for reduced test suite |

## What Works (POC Exploration Pivot)

### Greenfield Procedural Stations (2026-03-10 to 2026-03-13)

Self-contained R3F components with own geometry, physics, and game logic:
- `Grinder.tsx` — Procedural grinder with speed-zone mechanics
- `Stuffer.tsx` — Casing fill with pressure management
- `Stove.tsx` — Heat control with temperature targeting
- `ChoppingBlock.tsx` — Timing-based knife gestures
- `ChestFreezer.tsx` + `PhysicsFreezerChest.tsx` — Ingredient selection (replaces old fridge)
- `BlowoutStation.tsx` — Casing tie-off and blowout risk
- `TV.tsx` — CRT television with Mr. Sausage and verdict display
- `Sink.tsx` — Cleanup between rounds

### Camera Rail System
- `CameraRail.tsx` — Smooth camera movement between stations on predefined path
- `IntroSequence.tsx` — Opening camera tour of the kitchen
- `FirstPersonControls.tsx` — Limited look-around within station view area

### Sausage Physics (Ported from POC)
- `Sausage.tsx` — SkinnedMesh with Rapier rigid bodies per bone segment
- `SausageGeometry.ts` — Procedural tube geometry, SausageCurve, SausageLinksCurve
- Spring forces tie physics bodies to visual bones via custom `useFrame` hook

### Engine Systems (Restored)
- `DemandScoring.ts` — Compares player decisions vs Mr. Sausage's hidden demands
- `IngredientMatcher.ts` — Tag-based ingredient matching against demand criteria
- `RoundManager.ts` — Multi-round loop with C(12,3) combo tracking
- `DifficultyConfig.ts` — Difficulty tier configuration
- `DialogueEngine.ts` — Mr. Sausage commentary and typewriter text
- `GameOrchestrator.tsx` — Top-level game flow coordination

### Environment
- `Kitchen.tsx` — GLB kitchen scene with PBR materials
- `BasementRoom.tsx` — Room enclosure
- `SurrealText.tsx` — Diegetic in-world text meshes for instructions/feedback
- `ScatterProps.tsx` + `Prop.tsx` — Horror scene dressing
- `KitchenSetPieces.tsx` — Equipment and furniture placement
- `LiquidPourer.tsx` — Liquid pour effects
- `TrapDoorAnimation.tsx` + `TrapDoorMount.tsx` — Escape sequence between rounds

### Infrastructure
- Git LFS for binary assets (.ogg, .png, .glb)
- OGG audio samples for per-station SFX
- Biome 2.4 linting and formatting

## What Doesn't Work / Known Issues

- Test coverage significantly reduced (~30% of previous) — rebuilding for new architecture
- Native audio is a complete no-op
- Mobile touch controls untested on real devices
- Some station interactions still being refined (challenge-specific gestures)
- Old Phase 2 features (enemy encounters, hidden objects, cleanup mechanics) not yet re-implemented in new architecture

## Architecture Superseded by POC Pivot

The following Phase 2 systems were deleted during the POC exploration pivot and are no longer part of the codebase:

- **ECS (miniplex)**: Entity-component-system architecture, orchestrators, systems, renderers
- **Layout system**: resolveLayout, FurnitureLayout, gen-anchors, target-based placement
- **InputManager**: Universal input with JSON bindings, keyboard/mouse/gamepad/touch normalization
- **FPS free-walk**: FPSController, SwipeFPSControls, MobileJoystick, WASD + pointer-lock
- **Enemy encounters**: EnemySpawnSystem, CombatSystem, CabinetBurst, CombatHUD
- **Hidden objects**: CabinetDrawer, KitchenAssembly, HiddenObjectOverlay
- **Cleanup mechanics**: CleanupManager, CleanupHUD
- **Difficulty selector UI**: DifficultySelector "Choose Your Doneness" screen
- **Horror props loader**: HorrorPropsLoader tiered loading system
- **Rapier sensor pattern**: KINEMATIC_FIXED bitmask station triggers
- **Code splitting**: React.lazy() + Suspense at phase boundaries
- **WebXR**: @react-three/xr integration

These may be re-implemented in the new procedural architecture as needed.

## Milestones

| Date | Milestone |
|------|-----------|
| 2026-03-13 | Documentation overhaul — memory-bank updates, frontmatter, DRY content |
| 2026-03-13 | POC exploration: all PR feedback addressed, biome linting clean |
| 2026-03-12 | Multi-round replayability and missing interactions restored |
| 2026-03-12 | Full production parity: dialogue system, mobile controls |
| 2026-03-11 | Demand scoring and ingredient matching systems restored |
| 2026-03-11 | Advanced POC physics ported (Rapier bone-chain sausage) |
| 2026-03-10 | Greenfield procedural rewrite with hybrid asset injection |
| 2026-03-10 | Git LFS configured for binary assets |
| 2026-03-04 | PR #33 merged: dual-zone touch controls, Rapier KINEMATIC_FIXED fix |
| 2026-03-03 | Phase 2 Sprints 1-3 complete (superseded by POC pivot) |
| 2026-03-02 | PRs #25, #27, #28, #29 merged to main |
| 2026-03-02 | Phase 1 complete: ECS orchestrators (superseded by POC pivot) |
| 2026-03-01 | Documentation overhaul v1 (frontmatter, AGENTS.md, memory bank) |
| 2026-02-27 | Babylon.js to R3F migration complete |
| -- | GitHub Pages deployment live |
