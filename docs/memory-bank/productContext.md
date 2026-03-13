---
title: Product Context
domain: memory-bank
status: current
last-verified: "2026-03-13"
summary: "Why this exists, UX goals, target platforms, input methods"
---

# Product Context — Will It Blow?

## Why This Exists

An arcade cabinet game exploring the horror-comedy crossover in the cooking genre. Part of the `arcade-cabinet` project collection. The game is meant to be tense, funny, and replayable with a short play session (~5 minutes per run).

## Target Platforms

| Platform | Status | Notes |
|----------|--------|-------|
| **Web** | Primary dev target | Deployed to GitHub Pages |
| **iOS** | Supported via Expo | Untested on devices |
| **Android** | Supported via Expo | Untested on devices |

**Live deployment:** https://arcade-cabinet.github.io/will-it-blow/

## User Experience Goals

- **Tension** — "Will my sausage explode?" drives engagement through each challenge
- **Dark humor** — Horror premise played for laughs (Mr. Sausage is both threatening and absurd)
- **Satisfying mechanics** — Each challenge has distinct feel: picking, dragging, holding, controlling
- **Replayability** — Multi-round loop with C(12,3) ingredient combo tracking; demand scoring varies each run
- **Quick sessions** — Full game loop takes ~5 minutes, encouraging "one more try"
- **Diegetic immersion** — Instructions and feedback appear as in-world text (SurrealText), not floating HUD

## Input Methods

| Method | Platform | Implementation |
|--------|----------|----------------|
| Camera rail (automatic) | All | CameraRail.tsx — smooth pan between stations |
| Touch tap/drag | Mobile | Challenge-specific gestures on 3D meshes |
| Mouse click/drag | Desktop | R3F `onPointerDown` / `onPointerMove` on meshes |
| Mobile joystick | Mobile | For free-look within a station's view area |

The POC pivot replaced FPS free-walk (WASD + pointer-lock) with a camera rail system. Players no longer navigate the kitchen freely; the camera moves automatically between stations on a predetermined path.

## Mr. Sausage Character

The central character experience. He appears on an in-game CRT television and:

- Introduces each challenge with dialogue (typewriter text + branching choices)
- Reacts to player performance in real-time (9 procedural animations)
- Delivers the final verdict with dramatic score reveals
- Has a distinct personality: sadistic, demanding, darkly humorous

The CRT shader (chromatic aberration, scanlines, flicker) reinforces the horror atmosphere.

## Audio

OGG sample-based audio replaces the previous pure Tone.js synthesis approach:
- Per-station sound effects (grinder, sizzle, squelch, pressure hiss)
- Ambient horror drone
- Rating songs per verdict rank
- Binary audio assets tracked via Git LFS

## Design Origins

The factory mechanics were prototyped through an iterative conversation with Gemini AI, building a self-contained Three.js + Rapier3D proof-of-concept across 14 exchanges. The POC proved bone-chain sausage physics, FBO fluid dynamics, drag-and-drop casing attachment, and the full grind→stuff→cook sequential flow. All mechanics have been ported to production R3F components.

- **Original Gemini conversation:** https://gemini.google.com/app/5546a3ed9463e9b0

## Aesthetic

- Grimy basement kitchen with PBR textures (tile walls, concrete ceiling, grime decals)
- Fluorescent tube lights with procedural flicker
- CRT television glow
- Diegetic UI: in-world text meshes (SurrealText) for instructions and feedback
- Red X marks for strikes
- First-person perspective on camera rail

## What Players See

```
MENU → LOADING → INTRO (camera rail tour) → 7 CHALLENGES → RESULTS (rank badge) → MENU
```

Camera smoothly rails between stations (~2.5 seconds, ease-in-out) between challenges.
