---
title: Production Implementation Plan
domain: core
status: superseded
last-verified: 2026-03-13
summary: "SUPERSEDED by docs/superpowers/specs/2026-03-13-native-first-pivot-design.md"
---

# Production Implementation Plan

**STATUS: SUPERSEDED**

This plan has been superseded by the native-first pivot design spec:

**→ [docs/superpowers/specs/2026-03-13-native-first-pivot-design.md](../superpowers/specs/2026-03-13-native-first-pivot-design.md)**

## What changed

The original plan assumed web-first with browser workarounds for Rapier WASM, SharedArrayBuffer, and Playwright testing. All of those proved unstable. The native-first pivot:

- Drops web as a target
- Keeps `@react-three/rapier` (test on native — WASM race was browser-only)
- Replaces expo-sqlite with op-sqlite (native C++ SQLite, no WASM)
- Replaces Tone.js/AudioContext with expo-audio (native)
- Replaces Playwright with Maestro YAML flows
- Adds React Native Reusables for pre-game UI
- Maintains zero 2D overlays during gameplay (diegetic SurrealText only)

## Progress before pivot

Phases 1-2 from this plan were completed:
- Phase 1 ✅: Grovekeeper FPS input system ported (commit 1328b26)
- Phase 2 ✅: Zustand deleted, Koota ECS wired everywhere (commit 7756a5e)
- Phases 3-6: superseded by new spec's Phase 0-6
