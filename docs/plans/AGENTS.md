---
title: Plan Archive Index
domain: reference
status: current
last-verified: 2026-03-13
depends-on: []
agent-context: doc-keeper
summary: Index of all plan documents — active plans here, historical/completed in archive/
---

# Plan Archive Index

## Active Plans (This Directory)

| File | Title | Status | Summary |
|------|-------|--------|---------|
| `2026-03-01-phase2-will-it-blow-design.md` | Phase 2 Design | current | Blowout, difficulty, multi-round, hidden objects |
| `2026-03-01-phase2-will-it-blow-plan.md` | Phase 2 Implementation | current | 21 tasks across 5 waves |
| `2026-03-01-sausage-factory-kitchen-design.md` | Kitchen Design | active | Procedural factory mechanics, horror kitchen |
| `2026-03-01-sausage-factory-kitchen-plan.md` | Kitchen Implementation | active | Five-phase plan |
| `2026-03-02-comprehensive-phase1-phase2-plan.md` | Comprehensive Plan | current | Phase 1 gaps + full Phase 2 |
| `2026-03-10-asset-inventory.md` | Asset Inventory | on-hold | 750+ PSX GLBs, PBR materials, SFX |
| `2026-03-10-diegetic-ui-system.md` | Diegetic UI System | speculative | SurrealText concept |
| `2026-03-01-room-architecture.md` | Room Architecture | stale | Spatial reference (verify against code) |

Key plan content has been **folded into domain docs** as "Planned Work" sections. Plans remain here for full context and rationale.

---

## Archived Plans (`archive/`)

15 historical and completed plans. Organized by era:

### Historical (BabylonJS Era) — Do NOT Follow Implementation

| File | Title | Engine |
|------|-------|--------|
| `archive/2026-02-26-will-it-blow-game-design.md` | Original Game Design | babylon |
| `archive/2026-02-26-will-it-blow-implementation.md` | Original Implementation | babylon |
| `archive/2026-02-26-gameplay-elevation-design.md` | Gameplay Elevation Design | babylon |
| `archive/2026-02-26-gameplay-elevation-plan.md` | Gameplay Elevation Plan | babylon |
| `archive/2026-02-27-first-person-horror-kitchen-design.md` | Horror Kitchen Redesign | babylon→r3f |
| `archive/2026-02-27-horror-kitchen-implementation.md` | Horror Kitchen Implementation | babylon→r3f |
| `archive/2026-02-27-mobile-xr-design.md` | Mobile-First + XR Design | babylon |
| `archive/2026-02-27-mobile-xr-implementation.md` | Mobile-First + XR Implementation | babylon |
| `archive/2026-02-27-camera-rail-and-lighting.md` | Camera Rail & Lighting | babylon→r3f |

### Completed (R3F/WebGPU Era) — Architectural Rationale

| File | Title | Engine |
|------|-------|--------|
| `archive/2026-02-27-r3f-migration-design.md` | R3F Migration Design | r3f |
| `archive/2026-02-27-r3f-migration-implementation.md` | R3F Migration Implementation | r3f |
| `archive/2026-02-28-webgpu-migration.md` | WebGPU Migration | r3f |
| `archive/2026-03-01-free-roam-navigation-design.md` | Free-Roam Navigation Design | r3f |
| `archive/2026-03-01-kitchen-diorama-design.md` | Kitchen Diorama Design | r3f |
| `archive/2026-03-01-kitchen-diorama-plan.md` | Kitchen Diorama Implementation | r3f |

---

## Reading Guide

| You want to know... | Read this |
|--------------------|-----------|
| How does X work right now? | Core docs (`docs/*.md`), not plans |
| Why was X designed this way? | Relevant completed plan in `archive/` |
| What was tried before? | Historical plans in `archive/` |
| What's planned next? | Active plans in this directory |
| How do I add a feature? | `docs/development-guide.md` |

**General rule:** Domain docs (`docs/*.md`) describe the *current system*. Plans describe *intent and rationale*. Always prefer domain docs for how things work today.
