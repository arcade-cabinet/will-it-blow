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
Layer 2: HTML/CSS Overlays (Tailwind) <- Pre-game UI, gesture overlays, round transitions
Layer 1: React Three Fiber Canvas     <- Kitchen GLB, stations, lighting, Mr. Sausage
Root:    Vite + Capacitor app          <- Container, background (#000)
```

- Layer 1 is the R3F `<Canvas>` — renders 3D kitchen, procedural station meshes, CRT TV
- Layer 2 is HTML overlays (Tailwind/DaisyUI) floating above the 3D scene for pre-game UI only
- Both layers subscribe independently to Koota ECS state via `useGameStore` hooks — no direct communication between them
- During gameplay: zero 2D overlays (diegetic SurrealText only)

## Challenge Component Pattern

All stations follow the same procedural pattern in the greenfield rebuild:

### Procedural Station Pattern (All Stations)

Self-contained R3F components in `src/components/stations/` that own their own geometry, physics, and game logic:

- **Station component** (R3F, in 3D Canvas) owns all logic: input handling, state updates, visual feedback
- **Station** reads player input from R3F events (`onPointerDown`, `onPointerMove`) and writes to Koota ECS state
- **UI overlays** (when implemented) will be read-only Koota subscribers — display only
- Data flow: R3F pointer events → station logic → Koota ECS → UI display

Files: `src/components/stations/*.tsx`

Supporting components:
- `src/components/challenges/TieGesture.tsx` — Swipe-to-tie gesture for BlowoutStation
- `src/components/ui/DialogueOverlay.tsx` — Typewriter text overlay

**Note:** The old main branch used two patterns (ECS orchestrator + bridge). Those are deleted. HUD overlays for each station are not yet implemented.

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

Two state fields manage lifecycle:

- `appPhase`: `'title'` | `'playing'` | `'results'` — controls which top-level component renders
- `gamePhase`: 13-phase enum tracking station progression (SELECT_INGREDIENTS → ... → DONE)

```
title → playing (gamePhase cycles through 13 stations) → results (NOT YET RENDERED)
```

**Known gaps:** No `'results'` rendering path in App.tsx. No `returnToMenu()` action to get back to title. See `src/store/gameStore.ts`.

## Sausage Physics (Rapier)

Bone-chain sausage body with spring forces:

- `Sausage.tsx` — SkinnedMesh with Rapier rigid bodies per bone segment
- Spring forces tie Rapier bodies to sausage bones (custom `useFrame` hook)
- `SausageGeometry.ts` — Procedural tube geometry and link curves

Source: `src/components/sausage/`

## Multi-Round Loop

- `RoundManager.ts` — Tracks C(12,3) ingredient combinations across rounds
- `TrapDoorAnimation.tsx` — Escape sequence between rounds
- Ensures no repeated ingredient combos within a session

## Asset URL Resolution

**Note:** `src/engine/assetUrl.ts` (with `getWebBasePath()`) does NOT exist on the greenfield branch. Asset URLs are currently hardcoded (e.g., `/models/kitchen.glb`, `/audio/sfx/chop-1.ogg`). This will break on GitHub Pages deployment where the base path is `/will-it-blow/`. Restoring `assetUrl.ts` is a prerequisite for deployment.
