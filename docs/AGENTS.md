<!--
title: Documentation Index
domain: reference
status: current
engine: r3f
last-verified: 2026-03-13
depends-on: []
agent-context: doc-keeper
summary: Master index of all docs — frontmatter schema, domain map, agent routing
-->

# Documentation Index

Quick-reference index for agents navigating the Will It Blow? documentation tree.

---

## Frontmatter Schema Reference

Every `.md` file under `docs/` and `docs/plans/` carries an HTML comment frontmatter block at the top. Fields:

| Field | Type | Valid Values | Purpose |
|-------|------|-------------|---------|
| `title` | string | Free text | Human-readable doc title |
| `domain` | enum | `core` \| `plan` \| `reference` | Classification bucket |
| `status` | enum | `current` \| `stale` \| `historical` \| `completed` | Freshness indicator |
| `engine` | enum | `r3f` \| `babylon` \| `babylon->r3f` | Which rendering engine the doc describes |
| `last-verified` | date | ISO 8601 (`YYYY-MM-DD`) | When an agent last confirmed accuracy |
| `depends-on` | array | Doc basenames without `.md` extension | Prerequisite reading |
| `agent-context` | string | Comma-separated agent names from `.claude/agents/` | Which agents should read this doc |
| `summary` | string | One line | Elevator-pitch description |

**Status meanings:**

- `current` -- Reflects the live codebase. Safe to follow.
- `stale` -- Mostly correct but has known gaps. Verify against code before relying on details.
- `completed` -- Plan that was fully executed. Accurate as historical record of what was built.
- `historical` -- Plan from a superseded era (e.g., BabylonJS). Do NOT follow implementation details; useful only for understanding design rationale.

---

## Quick Review Commands

```bash
# Scan all doc frontmatter without reading full content:
head -10 docs/*.md
head -10 docs/plans/*.md
```

---

## Doc Index

### Core Docs

| File | Title | Status | Domain | Summary |
|------|-------|--------|--------|---------|
| `architecture.md` | Architecture Overview | current | core | System design, directory structure, data flow for R3F/WebGPU game |
| `3d-rendering.md` | 3D Rendering & Scene System | current | core | R3F setup, materials, lighting, cameras, stations |
| `game-design.md` | Game Design | current | core | Gameplay mechanics, scoring, challenges, Mr. Sausage |
| `state-management.md` | State Management | current | core | Zustand store schema, actions, state flow |
| `audio.md` | Audio System | current | core | Tone.js synthesis, sound design, integration points |
| `testing.md` | Testing Strategy | current | core | Jest testing strategy, R3F test-renderer, coverage |
| `deployment.md` | Deployment & CI/CD | current | core | CI/CD pipeline, GitHub Pages, build commands |
| `development-guide.md` | Development Guide | current | core | Conventions, patterns, pitfalls, how to add features |
| `status.md` | Project Status & Remaining Work | current | plan | Current completion status reflecting Phase 2 features |

### Plan Docs

| File | Title | Status | Domain | Summary |
|------|-------|--------|--------|---------|
| `plans/2026-02-26-will-it-blow-game-design.md` | Original Game Design Document | historical | plan | Original game design -- React Native + BabylonJS, 8 phases, ingredient system, audio |
| `plans/2026-02-26-will-it-blow-implementation.md` | Original Implementation Plan | historical | plan | Full BabylonJS implementation plan -- 16 tasks across data, engine, audio, UI, 3D |
| `plans/2026-02-26-gameplay-elevation-design.md` | Gameplay Elevation Design | historical | plan | Design for physics mini-games + 3D Mr. Sausage with Babylon.js primitives |
| `plans/2026-02-26-gameplay-elevation-plan.md` | Gameplay Elevation Implementation Plan | historical | plan | Task-by-task plan for physics mini-games, MrSausage3D, Ingredient3D, scene rewrites |
| `plans/2026-02-27-first-person-horror-kitchen-design.md` | First-Person Horror Kitchen Redesign | historical | plan | SAW-meets-Muppets horror escape room with sequential challenges, waypoint nav, CRT TV |
| `plans/2026-02-27-horror-kitchen-implementation.md` | Horror Kitchen Redesign -- Implementation Plan | historical | plan | Task-by-task horror kitchen pivot -- Zustand, challenges, dialogue, waypoints, stations |
| `plans/2026-02-27-mobile-xr-design.md` | Mobile-First + XR/AR Input Abstraction Design | historical | plan | Input abstraction layer, haptic feedback, Havok physics, GLB fridge, gyroscope, XR/AR |
| `plans/2026-02-27-mobile-xr-implementation.md` | Mobile-First + XR/AR Implementation Plan | historical | plan | Task-by-task input adapters, haptic service, Havok physics, GLB fridge, gyro camera |
| `plans/2026-02-27-camera-rail-and-lighting.md` | Camera Rail & Fluorescent Lighting | historical | plan | Auto-rail camera, fluorescent tube fixtures with flicker, procedural CRT shader |
| `plans/2026-02-27-r3f-migration-design.md` | React Three Fiber Migration -- Design | completed | plan | Replace reactylon + Babylon.js with R3F + Three.js -- declarative JSX, Jest-testable 3D |
| `plans/2026-02-27-r3f-migration-implementation.md` | React Three Fiber Migration -- Implementation | completed | plan | Task-by-task Babylon-to-R3F migration -- deps, 3D components, test-renderer, cleanup |
| `plans/2026-02-28-webgpu-migration.md` | WebGPU Migration Implementation Plan | completed | plan | WebGL-to-WebGPU via react-native-wgpu -- Metro resolver, TSL NodeMaterial, XR support |
| `plans/2026-03-01-free-roam-navigation-design.md` | Free-Roam Kitchen Navigation Design | completed | plan | FPS pointer-lock + WASD nav, mobile joystick, proximity triggers, fridge GLB fix |
| `plans/2026-03-01-kitchen-diorama-design.md` | Kitchen Diorama Redesign -- Design | completed | plan | Target-based placement, discrete GLB segments, PBR textures, three-layer architecture |
| `plans/2026-03-01-kitchen-diorama-plan.md` | Kitchen Diorama Redesign -- Implementation | completed | plan | FurnitureLayout targets, FurnitureLoader GLB, PBR room textures, grime decals, wiring |
| `plans/2026-03-01-phase2-will-it-blow-design.md` | Phase 2 Design -- Will It Blow + Difficulty + Multi-Round | current | plan | Phase 2 game expansion -- blowout mechanic, 5-tier difficulty, multi-round loop, hidden objects |
| `plans/2026-03-01-phase2-will-it-blow-plan.md` | Phase 2 Implementation Plan | current | plan | Task-by-task execution plan for Phase 2 -- 21 tasks across 5 waves |
| `plans/2026-03-01-room-architecture.md` | Room Architecture -- The Sausage Factory Kitchen | stale | reference | Definitive spatial reference -- room layout, GLB inventory, procedural geometry, station walkthroughs |
| `plans/2026-03-01-sausage-factory-kitchen-design.md` | Sausage Factory Kitchen -- Game Completion Design | active | plan | Complete game system design -- title screen, loading, procedural factory mechanics, horror kitchen |
| `plans/2026-03-01-sausage-factory-kitchen-plan.md` | Sausage Factory Kitchen -- Implementation Plan | active | plan | Five-phase implementation -- foundation, asset swap, room expansion, factory system, polish |
| `plans/2026-03-02-comprehensive-phase1-phase2-plan.md` | Comprehensive Phase 1 + Phase 2 Plan | current | plan | Complete remaining Phase 1 gaps, then full Phase 2 implementation |

---

## Domain Map

Which docs relate to which code areas:

| Domain | Docs | Key Code Paths |
|--------|------|---------------|
| **3D / Scene** | `architecture.md`, `3d-rendering.md` | `src/components/GameWorld.tsx`, `src/components/kitchen/`, `src/components/controls/` |
| **Gameplay** | `game-design.md`, `state-management.md` | `src/engine/`, `src/store/gameStore.ts`, `src/components/challenges/` |
| **Infrastructure** | `deployment.md`, `testing.md`, `development-guide.md` | `.github/workflows/`, `jest.config.js`, `metro.config.js`, `app.json` |
| **Audio** | `audio.md` | `src/engine/AudioEngine.web.ts`, `src/engine/AudioEngine.ts`, `src/config/audio.json` |
| **Status** | `status.md` | N/A (meta-document tracking project completion) |

---

## Agent Routing

Which agent should read which docs before acting:

| Agent | Required Reading | Role |
|-------|-----------------|------|
| `scene-architect` | `architecture.md`, `3d-rendering.md`, `development-guide.md` | 3D scene graph, R3F components, kitchen layout, cameras, lighting |
| `challenge-dev` | `game-design.md`, `state-management.md`, `audio.md` | Challenge overlays, scoring logic, game flow, dialogue |
| `store-warden` | `state-management.md`, `architecture.md` | Zustand store schema, actions, state transitions |
| `asset-pipeline` | `deployment.md` | CI/CD, build config, GitHub Pages, asset URLs |
| `doc-keeper` | All docs | Documentation maintenance, frontmatter accuracy, status tracking |

**Note:** All 5 agents exist as files in `.claude/agents/`: scene-architect, challenge-dev, store-warden, asset-pipeline, doc-keeper.
