---
title: Architecture Overview
domain: core
status: current
last-verified: 2026-03-13
depends-on: [state-management, 3d-rendering, game-design]
agent-context: scene-architect, challenge-dev
summary: System design, directory structure, data flow for greenfield R3F game
---

# Architecture Overview

## System Design

Will It Blow? is a first-person horror sausage-making mini-game. The player is trapped in a grimy basement kitchen and must complete sequential challenges under the watchful eye of Mr. Sausage, a menacing sentient sausage displayed on a CRT television.

**Tone:** SAW meets cooking show. Dark humor. The horror is played for laughs but the atmosphere is genuinely unsettling.

### Two-Layer Rendering Stack

```text
┌──────────────────────────────────────────┐
│  Layer 2: React Native UI Overlays       │  ← Buttons, progress bars, dialogue
│  (StyleSheet.absoluteFillObject, z=10)   │
├──────────────────────────────────────────┤
│  Layer 1: React Three Fiber Canvas       │  ← Kitchen GLB, stations, lighting
│  (Three.js via R3F reconciler)           │
├──────────────────────────────────────────┤
│  Root: SafeAreaView (React Native)       │  ← Root container, flex: 1
└──────────────────────────────────────────┘
```

- **Root** provides the container and background color (#0a0a0a).
- **Layer 1** is the R3F `<Canvas>` rendering Three.js. It renders the 3D kitchen environment, procedural station meshes, and sausage physics.
- **Layer 2** is React Native overlays (`pointerEvents="box-none"`) that float above the 3D scene. Game UI lives here: dialogue, menus, difficulty selection.

Both layers subscribe independently to the Zustand store — no direct communication between them.

### Platform Strategy

The app targets web (primary), iOS, and Android via Expo SDK 55 + React Native 0.83.

A single `GameWorld.tsx` works on all platforms — R3F's `<Canvas>` handles rendering. No platform-specific file splitting for the 3D layer.

Single audio file: `AudioEngine.ts` (Tone.js synthesis, works on web).

### Key Technology Choices

| Technology | Version | Role |
|-----------|---------|------|
| React Native | 0.83.2 | UI framework, cross-platform |
| Three.js | 0.183.1 | 3D engine |
| React Three Fiber | 9.5.0 | React reconciler for Three.js |
| @react-three/drei | 10.7.7 | Helpers: useGLTF, Environment, etc. |
| @react-three/rapier | — | Physics (sausage bone-chain) |
| Zustand | 5.0.11 | State management |
| Tone.js | 15.1.22 | Web audio synthesis |
| Expo | 55.0.0 | Build toolchain, dev server |

## App Lifecycle

```text
App.tsx
  └─ useGameStore(s => s.appPhase)
     ├─ 'title'   → <TitleScreen />           Start menu (pure 2D)
     ├─ 'playing'  → <GameWorld /> + overlays  R3F Canvas + UI stack
     └─ 'results'  → (NOT YET IMPLEMENTED)    No GameOverScreen exists
```

**Note:** The `appPhase` type includes `'results'` but App.tsx has no rendering path for it. Game completion shows verdict dialogue inline but cannot return to menu.

## Directory Structure

```text
will-it-blow/
├── App.tsx                          Root layout (SafeAreaView → phase routing)
├── src/
│   ├── store/
│   │   ├── gameStore.ts             Zustand store (236 lines, all game state + actions)
│   │   └── __tests__/gameStore.test.ts
│   ├── engine/
│   │   ├── GameOrchestrator.tsx     Phase navigation + dev shortcuts (n/p keys)
│   │   ├── DemandScoring.ts        Demand bonus calculation
│   │   ├── IngredientMatcher.ts    Tag-based ingredient matching
│   │   ├── RoundManager.ts         Multi-round loop, C(12,3) combo tracking
│   │   ├── DifficultyConfig.ts     Difficulty tier configuration
│   │   ├── DialogueEngine.ts       Dialogue tree walker
│   │   ├── AudioEngine.ts          Tone.js synthesis (single file, no platform split)
│   │   ├── Ingredients.ts          25 ingredients with stats
│   │   └── __tests__/              DemandScoring, DifficultyConfig, RoundManager tests
│   ├── config/
│   │   └── difficulty.json         5 difficulty tiers (only config file)
│   ├── components/
│   │   ├── GameWorld.tsx            R3F Canvas, station mounting, camera
│   │   ├── stations/               Procedural station components (9 files)
│   │   │   ├── Grinder.tsx         Grind mechanics + crank animation
│   │   │   ├── Stuffer.tsx         Casing fill + pressure
│   │   │   ├── Stove.tsx           Heat control + FBO grease simulation
│   │   │   ├── ChoppingBlock.tsx   Knife gesture mechanics
│   │   │   ├── BlowoutStation.tsx  Casing tie-off and blowout
│   │   │   ├── TV.tsx              CRT television with Mr. Sausage
│   │   │   ├── Sink.tsx            Cleanup between rounds
│   │   │   ├── ChestFreezer.tsx    Ingredient selection (stub)
│   │   │   └── PhysicsFreezerChest.tsx  Physics freezer (partial)
│   │   ├── camera/
│   │   │   ├── CameraRail.tsx      Camera interpolation between stations
│   │   │   ├── IntroSequence.tsx   Opening camera tour
│   │   │   ├── FirstPersonControls.tsx  Limited look-around
│   │   │   └── PlayerHands.tsx     First-person hand rendering
│   │   ├── sausage/
│   │   │   ├── Sausage.tsx         SkinnedMesh + Rapier bone-chain physics
│   │   │   └── SausageGeometry.ts  Procedural tube geometry
│   │   ├── characters/
│   │   │   ├── MrSausage3D.tsx     Procedural 3D character (self-lit)
│   │   │   └── reactions.ts        9 reaction animation types
│   │   ├── environment/
│   │   │   ├── Kitchen.tsx         Kitchen GLB loader (STUB — empty fragment)
│   │   │   ├── BasementRoom.tsx    Room enclosure
│   │   │   ├── SurrealText.tsx     Diegetic in-world text
│   │   │   ├── ScatterProps.tsx    Horror scene dressing placement
│   │   │   └── Prop.tsx            Individual prop rendering
│   │   ├── kitchen/
│   │   │   ├── KitchenSetPieces.tsx  Equipment/furniture placement
│   │   │   ├── LiquidPourer.tsx    Liquid pour effects
│   │   │   ├── ProceduralIngredients.tsx  Ingredient meshes (partial)
│   │   │   ├── TrapDoorAnimation.tsx  Escape sequence
│   │   │   └── TrapDoorMount.tsx   Trap door mounting point
│   │   ├── challenges/
│   │   │   └── TieGesture.tsx      Swipe-to-tie mechanic
│   │   ├── controls/
│   │   │   └── SwipeFPSControls.tsx  Touch swipe for mobile look
│   │   └── ui/
│   │       ├── TitleScreen.tsx     Start menu
│   │       ├── DifficultySelector.tsx  "Choose Your Doneness" (5 tiers)
│   │       └── DialogueOverlay.tsx Typewriter text + choices
│   └── data/
│       └── dialogue/               8 dialogue trees (intro, per-station, verdict)
├── __tests__/
│   └── IngredientMatcher.test.ts
├── public/
│   ├── models/kitchen.glb          PBR-textured kitchen (Git LFS)
│   ├── audio/sfx/                  OGG sound effects (Git LFS)
│   ├── audio/music/                Background music (Git LFS)
│   └── textures/                   PBR texture sets
├── e2e/
│   └── greenfield-playthrough.spec.ts  Playwright E2E (not committed)
├── .github/workflows/
│   ├── ci.yml                      Tests on push (main + feat/**)
│   └── cd.yml                      Web export → GitHub Pages
└── CLAUDE.md                       AI assistant instructions
```

## Data Flow

### Procedural Station Pattern (All Stations)

In the greenfield rebuild, stations are self-contained R3F components. There are no ECS orchestrators — each station owns its own game logic:

```text
User Input (touch/click on 3D mesh)
  → R3F onPointerDown / onPointerMove on mesh
    → Station component internal logic (useFrame loop)
      → Zustand store action (setGamePhase, setGroundMeatVol, etc.)
        → Other components re-render via store subscriptions
        → UI overlays read store for display values
```

### GameOrchestrator

```text
GameOrchestrator.tsx (React component, renders null)
  → On mount: generates Mr. Sausage demands
  → On DONE phase: calculates final score
  → Dev shortcuts: 'n' key advances phase, 'p' key goes back
  → PHASES array: 11 of 13 GamePhase values (missing TIE_CASING, BLOWOUT)
```

### State Flow

```text
appPhase: 'title' → 'playing' → 'results' (results NOT rendered)
gamePhase: SELECT_INGREDIENTS → CHOPPING → FILL_GRINDER → GRINDING → MOVE_BOWL →
           ATTACH_CASING → STUFFING → TIE_CASING → BLOWOUT → MOVE_SAUSAGE →
           MOVE_PAN → COOKING → DONE
```

The Zustand store is the single source of truth. 3D stations and UI overlays both subscribe independently. There is no direct communication between the 3D layer and the UI layer.

## Factory Mechanics (Ported from POC)

All core POC factory mechanics have been ported to production R3F components:

| Mechanic | Production File | Status |
|----------|-----------------|--------|
| Bone-chain sausage physics (Rapier rigid bodies, spring forces K=80, damp=10) | `src/components/sausage/Sausage.tsx` | Ported |
| Procedural meat textures (Canvas API `generateMeatTexture`) | `src/components/sausage/SausageGeometry.ts` | Ported |
| FBO grease wave simulation (ping-pong heightfield 256×256, damping 0.98) | `src/components/stations/Stove.tsx` | Ported |
| Grinder particle system (InstancedMesh, 300 max particles) | `src/components/stations/Grinder.tsx` | Ported |
| Stuffer casing extrusion (SquigglyCurve + QuadraticBezierCurve3) | `src/components/stations/Stuffer.tsx` | Ported |
| Station state machine (13-phase GamePhase) | `gamePhase` in Zustand store | Ported |

## Planned Work

### Missing UI Components
- `GameOverScreen` — Results screen with rank badge (S/A/B/F)
- `LoadingScreen` — Asset preload progress
- `ChallengeHeader` — "CHALLENGE N/7" display
- `StrikeCounter` — Lives display
- `ProgressGauge` — Animated progress bar
- Per-station HUDs (grinding, stuffing, cooking, blowout)
- `TastingChallenge` — Verdict with demand breakdown

### Missing Engine Modules
- `ChallengeRegistry.ts` — Variant selection, challenge configs
- `SausagePhysics.ts` — Pure scoring functions
- `assetUrl.ts` — Dynamic asset URL resolution for GitHub Pages

### Store Improvements
- Type `finalScore` with proper interface
- Remove dead fields (`dialogueActive`, `currentDialogueLine`)
- Add `returnToMenu()` full game reset action
- Add missing phases to GameOrchestrator PHASES array
