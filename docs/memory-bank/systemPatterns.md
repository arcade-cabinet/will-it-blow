---
title: System Patterns
domain: memory-bank
status: current
last-verified: "2026-03-13"
depends-on:
  - architecture
summary: "Architecture patterns — two-layer rendering, challenge patterns, camera rail, procedural components"
---

# System Patterns — Will It Blow?

This is a summary of key architecture patterns. For detailed conventions, see domain docs (e.g., `docs/3d-rendering.md`, `docs/game-design.md`).

## Two-Layer Rendering

```
Layer 2: React Native UI Overlays    <- Buttons, progress bars, dialogue, challenges
Layer 1: React Three Fiber Canvas    <- Kitchen GLB, stations, lighting, Mr. Sausage
Root:    SafeAreaView (React Native)  <- Container, background (#0a0a0a)
```

- Layer 1 is the R3F `<Canvas>` — renders 3D kitchen, procedural station meshes, CRT TV
- Layer 2 is React Native views with `pointerEvents="box-none"` floating above the 3D scene
- Both layers subscribe independently to the Zustand store — no direct communication between them

## Challenge Component Patterns

Challenges follow two patterns depending on the station:

### Procedural Station Pattern (Grinding, Stuffing, Cooking, Chopping, Blowout)

Greenfield procedural R3F components that own their own geometry, physics, and game logic:

- **Station component** (R3F, in 3D Canvas) owns all game logic: phase machine, scoring, strikes, timers, audio
- **Station** reads player input from R3F events (`onPointerDown`, `onPointerMove`) and writes to Zustand store
- **HUD overlay** (React Native) is pure read-only — subscribes to Zustand and displays values
- Data flow: R3F pointer events → station logic → Zustand → HUD display

Files: `src/components/stations/*.tsx` + `src/components/challenges/*.tsx`

### Bridge Pattern (Ingredients, Tasting)

```
challenge = overlay (challenges/) + 3D station (stations/) + dialogue (data/dialogue/)
```

- **Overlay** (React Native) owns scoring logic and writes to store
- **3D Station** (R3F) handles visual interaction (freezer clicks, sausage display)
- Coordinate through Zustand store (no direct communication)

Files: `src/components/challenges/*.tsx` + `src/components/stations/*.tsx`

## Camera Rail System

Replaces the old FPS free-walk (WASD + pointer-lock). The camera follows a predefined rail path between stations:

- `CameraRail.tsx` — Manages camera position/rotation along the rail
- `IntroSequence.tsx` — Initial camera tour of the kitchen on game start
- Camera smoothly interpolates between station viewpoints (~2.5s, ease-in-out)
- Players do not navigate the kitchen freely; the camera moves automatically between challenges

Source: `src/components/camera/`

## Diegetic UI (SurrealText)

In-world text meshes replace traditional floating HUD elements for instructions and feedback:

- `SurrealText.tsx` — Renders text as 3D meshes positioned in the scene
- Text appears near the relevant station, reinforcing spatial immersion
- Used for challenge instructions, timer displays, and Mr. Sausage's demands

Source: `src/components/environment/SurrealText.tsx`

## State Machine

Two separate state fields manage lifecycle:

- `appPhase`: `'menu'` | `'loading'` | `'playing'` — controls which top-level component renders
- `gameStatus`: `'menu'` | `'playing'` | `'victory'` | `'defeat'` — in-game state

```
menu → loading → playing (challenge 0→1→2→3→4→5→6) → victory/defeat → menu
```

`currentChallenge` (0-6) tracks progression through the 7 challenges. See `src/store/gameStore.ts`.

## Sausage Physics (Rapier)

Ported from the POC — bone-chain sausage body with spring forces:

- `Sausage.tsx` — SkinnedMesh with Rapier rigid bodies per bone segment
- Spring forces tie Rapier bodies to sausage bones (custom `useFrame` hook)
- `SausageGeometry.ts` — Procedural tube geometry and link curves

Source: `src/components/sausage/`

## Multi-Round Loop

- `RoundManager.ts` — Tracks C(12,3) ingredient combinations across rounds
- `TrapDoorAnimation.tsx` — Escape sequence between rounds
- Ensures no repeated ingredient combos within a session

## Asset URL Resolution

Dynamic asset URLs (GLB, textures, audio) use `getWebBasePath()` from `src/engine/assetUrl.ts`. This derives the base path from `<script src>` tags at runtime, handling the GitHub Pages `/will-it-blow/` prefix correctly.
