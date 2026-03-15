# Active Context — Will It Blow?

**Last updated:** 2026-03-14

## Current Branch

`feat/greenfield-complete` — Capacitor + R3F + Tailwind architecture pivot.

## Current Focus

Greenfield rebuild with new stack: Vite + React 19 + R3F + Rapier + Capacitor 6 + Tailwind CSS + DaisyUI. Koota ECS for all game state. sql.js + capacitor-sqlite for persistence.

## Stack Pivot Summary

Migrated from:
- React Native + Expo + Metro + react-native-wgpu
- Jest + Maestro for testing
- Native-first (no web target)

Migrated to:
- Vite + React 19 + Capacitor 6
- Vitest + Playwright for testing
- Web-first with native deployment via Capacitor
- Tailwind CSS + DaisyUI for UI components

## Recent Work

### Capacitor + R3F Pivot (2026-03-14)
- Replaced Expo/Metro with Vite bundler
- Added Capacitor 6 for native iOS/Android deployment
- Added Tailwind CSS 4 + DaisyUI 5 for UI components
- Switched testing from Jest/Maestro to Vitest/Playwright
- Koota ECS retained as sole state management
- Rapier physics retained
- Tone.js retained for audio

## Decisions Made

- Orchestrators own ALL game logic — HUDs are pure read-only display
- ECS input primitives drive game state (not 2D gestures)
- `challengePhase` store field bridges orchestrator-HUD dialogue transitions
- Old 2D challenge overlays fully deleted (not deprecated)
- Data-driven config: ~200 magic numbers extracted to JSON files
- Web-first development with Capacitor for native deployment
- Tailwind + DaisyUI for pre-game UI (title screen, difficulty selector)

## What's Next

1. Polish gameplay mechanics and station interactions
2. Native testing on real devices via Capacitor
3. Audio refinement
4. Asset optimization
5. Production deployment
