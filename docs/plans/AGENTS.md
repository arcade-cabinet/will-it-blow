<!--
title: Plan Archive Index
domain: reference
status: current
engine: r3f
last-verified: 2026-03-04
depends-on: []
agent-context: doc-keeper
summary: Index of all 21 plan documents with status, engine era, and reading guide
-->

# Plan Archive Index

Index of all design and implementation plans for Will It Blow?

---

## Plan Archive

| File | Title | Status | Engine | Summary |
|------|-------|--------|--------|---------|
| `2026-02-26-will-it-blow-game-design.md` | Original Game Design Document | historical | babylon | Original game design -- React Native + BabylonJS, 8 phases, ingredient system, audio |
| `2026-02-26-will-it-blow-implementation.md` | Original Implementation Plan | historical | babylon | Full BabylonJS implementation plan -- 16 tasks across data, engine, audio, UI, 3D |
| `2026-02-26-gameplay-elevation-design.md` | Gameplay Elevation Design | historical | babylon | Design for physics mini-games + 3D Mr. Sausage with Babylon.js primitives |
| `2026-02-26-gameplay-elevation-plan.md` | Gameplay Elevation Implementation Plan | historical | babylon | Task-by-task plan for physics mini-games, MrSausage3D, Ingredient3D, scene rewrites |
| `2026-02-27-first-person-horror-kitchen-design.md` | First-Person Horror Kitchen Redesign | historical | babylon->r3f | SAW-meets-Muppets horror escape room with sequential challenges, waypoint nav, CRT TV |
| `2026-02-27-horror-kitchen-implementation.md` | Horror Kitchen Redesign -- Implementation | historical | babylon->r3f | Task-by-task horror kitchen pivot -- Zustand, challenges, dialogue, waypoints, stations |
| `2026-02-27-mobile-xr-design.md` | Mobile-First + XR/AR Input Abstraction Design | historical | babylon | Input abstraction layer, haptic feedback, Havok physics, GLB fridge, gyroscope, XR/AR |
| `2026-02-27-mobile-xr-implementation.md` | Mobile-First + XR/AR Implementation Plan | historical | babylon | Task-by-task input adapters, haptic service, Havok physics, GLB fridge, gyro camera |
| `2026-02-27-camera-rail-and-lighting.md` | Camera Rail & Fluorescent Lighting | historical | babylon->r3f | Auto-rail camera, fluorescent tube fixtures with flicker, procedural CRT shader |
| `2026-02-27-r3f-migration-design.md` | React Three Fiber Migration -- Design | completed | r3f | Replace reactylon + Babylon.js with R3F + Three.js -- declarative JSX, Jest-testable 3D |
| `2026-02-27-r3f-migration-implementation.md` | React Three Fiber Migration -- Implementation | completed | r3f | Task-by-task Babylon-to-R3F migration -- deps, 3D components, test-renderer, cleanup |
| `2026-02-28-webgpu-migration.md` | WebGPU Migration Implementation Plan | completed | r3f | WebGL-to-WebGPU via react-native-wgpu -- Metro resolver, TSL NodeMaterial, XR support |
| `2026-03-01-free-roam-navigation-design.md` | Free-Roam Kitchen Navigation Design | completed | r3f | FPS pointer-lock + WASD nav, mobile joystick, proximity triggers, fridge GLB fix |
| `2026-03-01-kitchen-diorama-design.md` | Kitchen Diorama Redesign -- Design | completed | r3f | Target-based placement, discrete GLB segments, PBR textures, three-layer architecture |
| `2026-03-01-kitchen-diorama-plan.md` | Kitchen Diorama Redesign -- Implementation | completed | r3f | FurnitureLayout targets, FurnitureLoader GLB, PBR room textures, grime decals, wiring |
| `2026-03-01-phase2-will-it-blow-design.md` | Phase 2 Design -- Will It Blow + Difficulty + Multi-Round | current | r3f | Phase 2 game expansion -- blowout mechanic, 5-tier difficulty, multi-round loop, hidden objects |
| `2026-03-01-phase2-will-it-blow-plan.md` | Phase 2 Implementation Plan | current | r3f | Task-by-task execution plan for Phase 2 -- 21 tasks across 5 waves |
| `2026-03-01-room-architecture.md` | Room Architecture -- The Sausage Factory Kitchen | stale | r3f | Definitive spatial reference -- room layout, GLB inventory, procedural geometry, station walkthroughs |
| `2026-03-01-sausage-factory-kitchen-design.md` | Sausage Factory Kitchen -- Game Completion Design | active | r3f | Complete game system design -- title screen, loading, procedural factory mechanics, horror kitchen |
| `2026-03-01-sausage-factory-kitchen-plan.md` | Sausage Factory Kitchen -- Implementation Plan | active | r3f | Five-phase implementation -- foundation, asset swap, room expansion, factory system, polish |
| `2026-03-02-comprehensive-phase1-phase2-plan.md` | Comprehensive Phase 1 + Phase 2 Plan | current | r3f | Complete remaining Phase 1 gaps, then full Phase 2 implementation |

---

## Historical Plans (BabylonJS Era)

**9 plans** from 2026-02-26 and 2026-02-27 with `status: historical`.

These document the BabylonJS era of the project. They are valuable for understanding **why** architectural decisions were made -- the horror kitchen pivot, the shift from 8 phases to 7 sequential challenges, the input abstraction layer design, and the mobile-first XR ambitions.

**Do NOT follow their technical implementation.** The codebase has fully migrated to React Three Fiber + Three.js WebGPU. BabylonJS APIs (`SceneLoader.ImportMeshAsync`, `ActionManager`, `PBRMaterial`, `scene.onBeforeRenderObservable`, Havok physics) no longer exist in the project.

**Design-vs-implementation pairs:**

| Design Doc | Implementation Doc |
|-----------|-------------------|
| `2026-02-26-will-it-blow-game-design.md` | `2026-02-26-will-it-blow-implementation.md` |
| `2026-02-26-gameplay-elevation-design.md` | `2026-02-26-gameplay-elevation-plan.md` |
| `2026-02-27-first-person-horror-kitchen-design.md` | `2026-02-27-horror-kitchen-implementation.md` |
| `2026-02-27-mobile-xr-design.md` | `2026-02-27-mobile-xr-implementation.md` |
| *(standalone)* | `2026-02-27-camera-rail-and-lighting.md` |

---

## Completed Plans (R3F/WebGPU Era)

**6 plans** from 2026-02-27 through 2026-03-01 with `status: completed`.

These document the **actual implementation** that shipped. Reference these for understanding current architecture decisions -- why R3F over Babylon, how the WebGPU migration worked, the FPS controller design, and the target-based furniture layout system.

**Design-vs-implementation pairs:**

| Design Doc | Implementation Doc |
|-----------|-------------------|
| `2026-02-27-r3f-migration-design.md` | `2026-02-27-r3f-migration-implementation.md` |
| *(standalone)* | `2026-02-28-webgpu-migration.md` |
| `2026-03-01-free-roam-navigation-design.md` | *(design-only, tasks embedded)* |
| `2026-03-01-kitchen-diorama-design.md` | `2026-03-01-kitchen-diorama-plan.md` |

**Chronological reading order** (if you want the full migration story):
1. R3F migration design + implementation (the engine swap)
2. WebGPU migration (renderer upgrade + CRT shader rewrite)
3. Free-roam navigation (FPS controls replacing waypoints)
4. Kitchen diorama design + plan (target-based layout, PBR textures)

---

## Active/Current Plans (Phase 2 Era)

**6 plans** from 2026-03-01 through 2026-03-02 with `status: current` or `active`.

These document Phase 2 expansion features -- the blowout mechanic, difficulty system, multi-round gameplay, enemy encounters, hidden objects, and cleanup mechanics.

**Design-vs-implementation pairs:**

| Design Doc | Implementation Doc |
|-----------|-------------------|
| `2026-03-01-phase2-will-it-blow-design.md` | `2026-03-01-phase2-will-it-blow-plan.md` |
| `2026-03-01-sausage-factory-kitchen-design.md` | `2026-03-01-sausage-factory-kitchen-plan.md` |
| *(standalone reference)* | `2026-03-01-room-architecture.md` |
| *(comprehensive)* | `2026-03-02-comprehensive-phase1-phase2-plan.md` |

---

## Reading Guide

| You want to know... | Read this |
|--------------------|-----------|
| How does X work right now? | Core docs (`docs/*.md`), not plans |
| Why was X designed this way? | Check the relevant completed plan |
| What was tried before the current approach? | Check the historical plans from the same domain |
| How do I add a new feature? | `docs/development-guide.md` first, then relevant core doc |
| What changed between Babylon and R3F? | `2026-02-27-r3f-migration-design.md` has a pattern translation table |
| What is the target-based layout system? | `2026-03-01-kitchen-diorama-design.md` defines it; `docs/3d-rendering.md` documents current state |

**General rule:** Design docs explain the *intent* and *rationale*. Implementation docs list the *tasks* that were executed. Core docs describe the *current system*. Always prefer core docs for how things work today.
