---
title: Documentation Index
domain: reference
status: current
last-verified: 2026-03-13
depends-on: []
agent-context: all
summary: Master index — frontmatter schema, doc catalog, domain map, agent routing, stability index
---

# Documentation Index

Quick-reference index for agents navigating the Will It Blow? documentation tree.

## How to Use This Index

Run `head -10` on any doc to read its frontmatter without loading the full file:

```bash
head -10 docs/*.md
head -10 docs/memory-bank/*.md
head -10 docs/plans/*.md
```

---

## Frontmatter Schema

Every `.md` file under `docs/` carries YAML frontmatter (`---` delimiters). Fields:

| Field | Type | Required | Valid Values | Purpose |
|-------|------|----------|-------------|---------|
| `title` | string | Yes | Free text | Human-readable doc title |
| `domain` | enum | Yes | `core` \| `memory-bank` \| `plan` \| `reference` | Classification bucket |
| `status` | enum | Yes | `current` \| `stale` \| `historical` \| `completed` \| `on-hold` | Freshness indicator |
| `last-verified` | date | Yes | ISO 8601 (`YYYY-MM-DD`) | When an agent last confirmed accuracy |
| `depends-on` | array | No | Doc basenames without `.md` | Prerequisite reading |
| `agent-context` | string | No | Comma-separated agent names | Which agents should read this doc |
| `summary` | string | Yes | One line | Elevator-pitch description |

**Status meanings:**

- `current` — Reflects the live codebase. Safe to follow.
- `stale` — Mostly correct but has known gaps. Verify against code before relying on details.
- `completed` — Plan that was fully executed. Accurate as historical record.
- `historical` — Plan from a superseded era (e.g., BabylonJS). Do NOT follow implementation details.
- `on-hold` — Paused work. Information is accurate but not actively being pursued.

---

## Core Docs

| File | Title | Status | Summary |
|------|-------|--------|---------|
| `architecture.md` | Architecture Overview | current | System design, directory structure, data flow, two-layer rendering |
| `3d-rendering.md` | 3D Rendering & Scene System | current | R3F setup, materials, lighting, cameras, stations, CRT shader |
| `game-design.md` | Game Design | current | Gameplay mechanics, scoring, challenges, difficulty, Mr. Sausage |
| `state-management.md` | State Management | current | Zustand store schema, actions, state flow, bridge patterns |
| `audio.md` | Audio System | current | Tone.js synthesis, OGG samples, sound design, integration points |
| `testing.md` | Testing Strategy | current | Jest, R3F test-renderer, Playwright E2E, coverage |
| `deployment.md` | Deployment & CI/CD | current | CI/CD pipeline, GitHub Pages, Git LFS, build commands |
| `development-guide.md` | Development Guide | current | Conventions, patterns, pitfalls, how to add features |
| `status.md` | Project Status | current | Greenfield rebuild status, gap inventory, remaining work |

## Memory Bank

| File | Purpose | Update Frequency |
|------|---------|-----------------|
| `memory-bank/AGENTS.md` | Memory bank protocol — read order, update rules, coordination | Stable |
| `memory-bank/projectbrief.md` | Core identity — premise, victory condition, design tension | Very rare |
| `memory-bank/productContext.md` | Why this exists, UX goals, target platforms | Rare |
| `memory-bank/systemPatterns.md` | Architecture patterns (lean summaries → domain docs for detail) | Per new pattern |
| `memory-bank/techContext.md` | Tech stack, dependencies, known pitfalls | Per dependency change |
| `memory-bank/activeContext.md` | Current session focus, decisions, blockers, next steps | Every session |
| `memory-bank/progress.md` | What works, what doesn't, milestones | Per milestone |

## Active Plans

| File | Title | Status | Summary |
|------|-------|--------|---------|
| `plans/2026-03-01-phase2-will-it-blow-design.md` | Phase 2 Design | current | Blowout, difficulty, multi-round loop, hidden objects |
| `plans/2026-03-01-phase2-will-it-blow-plan.md` | Phase 2 Implementation | current | 21 tasks across 5 waves |
| `plans/2026-03-01-sausage-factory-kitchen-design.md` | Kitchen Design | active | Procedural factory mechanics, horror kitchen aesthetic |
| `plans/2026-03-01-sausage-factory-kitchen-plan.md` | Kitchen Implementation | active | Five-phase plan: foundation → asset swap → room → factory → polish |
| `plans/2026-03-02-comprehensive-phase1-phase2-plan.md` | Comprehensive Plan | current | Phase 1 gap-filling + full Phase 2 roadmap |
| `plans/2026-03-10-asset-inventory.md` | Asset Inventory | on-hold | 750+ PSX GLBs, 1945 PBR materials, 147 SFX files |
| `plans/2026-03-10-diegetic-ui-system.md` | Diegetic UI System | speculative | SurrealText in-world messaging concept |
| `plans/2026-03-01-room-architecture.md` | Room Architecture | stale | Spatial reference — verify against code |

## Archived Plans

15 historical/completed plans in `plans/archive/`. See `plans/AGENTS.md` for the full index with reading guide.

---

## Domain Map

| Domain | Docs | Key Code Paths |
|--------|------|---------------|
| **3D / Scene** | `architecture.md`, `3d-rendering.md` | `src/components/GameWorld.tsx`, `src/components/stations/`, `src/components/camera/` |
| **Gameplay** | `game-design.md`, `state-management.md` | `src/engine/`, `src/store/gameStore.ts`, `src/components/challenges/` |
| **Infrastructure** | `deployment.md`, `testing.md`, `development-guide.md` | `.github/workflows/`, `jest.config.js`, `metro.config.js` |
| **Audio** | `audio.md` | `src/engine/AudioEngine.ts` |
| **Environment** | `3d-rendering.md` | `src/components/environment/`, `src/components/kitchen/` |
| **Status** | `status.md`, `memory-bank/progress.md` | N/A (meta-documents) |

---

## Agent Routing

| Agent | Required Reading | Role |
|-------|-----------------|------|
| `scene-architect` | `architecture.md`, `3d-rendering.md`, `development-guide.md` | 3D scene, R3F components, cameras, lighting, materials |
| `challenge-dev` | `game-design.md`, `state-management.md`, `audio.md` | Challenge overlays, scoring, game flow, dialogue |
| `store-warden` | `state-management.md`, `architecture.md` | Zustand store schema, actions, state transitions |
| `asset-pipeline` | `deployment.md`, `3d-rendering.md` | CI/CD, build config, GLB assets, textures |
| `doc-keeper` | All docs | Documentation maintenance, frontmatter, JSDoc, TypeDoc |

---

## Stability Index

| Directory | Stability | Notes |
|-----------|-----------|-------|
| `docs/memory-bank/` | Active | Updated every session (activeContext, progress) |
| `docs/*.md` (core) | Stable | Architecture docs, updated per major feature |
| `docs/plans/` | Active | New plans added, active plans updated |
| `docs/plans/archive/` | Frozen | Historical record, never modified |
| `docs/api/` | Generated | TypeDoc output, regenerated via `pnpm docs:build` |
