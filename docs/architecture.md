---
title: Architecture Overview
domain: core
status: current
last-verified: 2026-03-13
depends-on: [state-management, 3d-rendering, game-design]
agent-context: scene-architect, challenge-dev
summary: System design, directory structure, data flow for R3F/WebGPU game
---

# Architecture Overview

## System Design

Will It Blow? is a first-person horror sausage-making mini-game. The player is trapped in a grimy basement kitchen and must complete 7 sequential challenges under the watchful eye of Mr. Sausage, a menacing sentient sausage displayed on a CRT television.

### Two-Layer Rendering Stack

```text
┌──────────────────────────────────────────┐
│  Layer 2: React Native UI Overlays       │  ← Buttons, progress bars, dialogue
│  (StyleSheet.absoluteFillObject, z=10)   │
├──────────────────────────────────────────┤
│  Layer 1: React Three Fiber Canvas       │  ← Kitchen GLB, stations, lighting
│  (Three.js WebGPU via R3F reconciler)    │
├──────────────────────────────────────────┤
│  Root: SafeAreaView (React Native)       │  ← Root container, flex: 1
└──────────────────────────────────────────┘
```

- **Root** provides the container and background color (#0a0a0a).
- **Layer 1** is the R3F `<Canvas>` rendering Three.js via `WebGPURenderer`. On web, this uses browser-native WebGPU. On native, `react-native-wgpu` provides a Dawn-based WebGPU surface. WebXR support is available on web via `@react-three/xr`. It renders the 3D kitchen environment, station meshes, and CRT TV.
- **Layer 2** is React Native overlays (`pointerEvents="box-none"`) that float above the 3D scene. All game UI lives here: challenge controls, dialogue, menus, results.

### Platform Strategy

The app targets web (primary), iOS, and Android via Expo SDK 55 + React Native 0.83.

A single `GameWorld.tsx` works on all platforms — R3F's `<Canvas>` uses `WebGPURenderer` with `react-native-wgpu` on native and browser WebGPU on web. Metro config has a WebGPU resolver that maps bare `'three'` imports to `'three/webgpu'` on native. No platform-specific file splitting for the 3D layer.

Only remaining platform split:
- `AudioEngine.web.ts` — Full Tone.js synthesis
- `AudioEngine.ts` — Native stub (no-op placeholder)

### Key Technology Choices

| Technology | Version | Role |
|-----------|---------|------|
| React Native | 0.83.2 | UI framework, cross-platform |
| Three.js | 0.183.1 | 3D engine (WebGPU renderer, TSL shaders) |
| React Three Fiber | 9.5.0 | React reconciler for Three.js (declarative JSX scene graph) |
| @react-three/drei | 10.7.7 | Helpers: useGLTF, Environment, etc. |
| @react-three/xr | 6.6.29 | WebXR support (web only) |
| @react-three/cannon | 6.6.0 | Physics (optional, available) |
| react-native-wgpu | 0.5.7 | Dawn-based WebGPU surface for native (iOS/Android) |
| Zustand | 5.0.11 | State management (replaces React Context) |
| Tone.js | 15.1.22 | Web audio synthesis (procedural SFX) |
| Expo | 55.0.0 | Build toolchain, dev server, deployment |

## App Lifecycle

```text
App.tsx
  └─ useGameStore(s => s.appPhase)
     ├─ 'menu'    → <TitleScreen />           Pure 2D, no R3F Canvas mounted
     ├─ 'loading' → <LoadingScreen />          Preloads kitchen.glb via fetch()
     └─ 'playing' → <GameWorld /> + <GameUI /> R3F Canvas + overlay stack
```

The `appPhase` state machine prevents the heavy R3F Canvas and GLB model from mounting until the player actually starts a game. This keeps the menu fast and avoids loading delays on first paint.

## Directory Structure

```text
will-it-blow/
├── App.tsx                          Root layout (SafeAreaView → phase routing)
├── src/
│   ├── store/
│   │   └── gameStore.ts             Zustand store (all game state + actions)
│   ├── engine/
│   │   ├── ChallengeRegistry.ts     Challenge configs, variant selection, verdict
│   │   ├── Ingredients.ts           25 ingredients with stats
│   │   ├── IngredientMatcher.ts     Tag/criteria matching for ingredient selection
│   │   ├── SausagePhysics.ts        Pure scoring functions
│   │   ├── DialogueEngine.ts        Dialogue tree walker
│   │   ├── AudioEngine.ts           Native audio stub (no-op)
│   │   └── AudioEngine.web.ts       Tone.js synthesis engine
│   ├── ecs/
│   │   ├── types.ts                  Entity type — all components as optional fields
│   │   ├── world.ts                  World + queries (vibrating, rotating, orbiting, cookable, etc.)
│   │   ├── systems/                  7 behavior systems (pure update fn + React component)
│   │   ├── renderers/                MeshRenderer, LightRenderer, LatheRenderer + ECSScene
│   │   └── orchestrators/            GrinderOrchestrator, StufferOrchestrator, CookingOrchestrator, BlowoutOrchestrator
│   ├── input/
│   │   ├── InputManager.ts           Universal input with JSON bindings (keyboard/mouse/gamepad/touch)
│   │   └── InputActions.ts           Engine-agnostic input abstraction
│   ├── config/
│   │   ├── difficulty.json           5 tiers (Rare→Well Done): hints/strikes/timePressure/enemyChance
│   │   ├── enemies.json              5 enemy types, 5 weapons, 4 spawn cabinets
│   │   └── blowout.json              Blowout challenge config
│   ├── components/
│   │   ├── GameWorld.tsx             R3F Canvas, FPSController, station orchestrator
│   │   ├── characters/
│   │   │   ├── MrSausage3D.tsx       Procedural 3D character (meshBasicMaterial, self-lit)
│   │   │   └── __tests__/MrSausage3D.test.tsx
│   │   ├── kitchen/
│   │   │   ├── KitchenEnvironment.tsx Room: walls, floor, ceiling, GLB model, lighting
│   │   │   ├── FridgeStation.tsx      3D fridge with ingredient meshes (onClick picking)
│   │   │   ├── GrinderStation.tsx     3D grinder with crank animation
│   │   │   ├── StufferStation.tsx     3D stuffer with pressure visualization
│   │   │   ├── StoveStation.tsx       3D stove with temperature glow
│   │   │   ├── CrtTelevision.tsx      CRT TV with Mr. Sausage + shader
│   │   │   └── __tests__/            Tests for all station components
│   │   ├── effects/
│   │   │   ├── CrtShader.ts          TSL NodeMaterial (chromatic aberration, WGSL/GLSL)
│   │   │   └── __tests__/CrtShader.test.ts
│   │   ├── ingredients/
│   │   │   ├── Ingredient3D.tsx      Shape-based ingredient meshes (8 types)
│   │   │   └── __tests__/Ingredient3D.test.tsx
│   │   ├── challenges/
│   │   │   ├── IngredientChallenge.tsx Fridge: pick matching ingredients (bridge pattern)
│   │   │   ├── ChoppingChallenge.tsx   Chopping: knife-work mechanic
│   │   │   ├── GrindingHUD.tsx         Grinder: thin read-only HUD (ECS orchestrator drives logic)
│   │   │   ├── StuffingHUD.tsx         Stuffer: thin read-only HUD (ECS orchestrator drives logic)
│   │   │   ├── CookingHUD.tsx          Stove: thin read-only HUD (ECS orchestrator drives logic)
│   │   │   ├── BlowoutHUD.tsx          Blowout: tie gesture + scoring HUD
│   │   │   └── TastingChallenge.tsx    Verdict: score reveal + rank (bridge pattern)
│   │   ├── ui/
│   │   │   ├── TitleScreen.tsx         Butcher shop menu + continue button
│   │   │   ├── LoadingScreen.tsx       Asset preload + progress
│   │   │   ├── DifficultySelector.tsx  "Choose Your Doneness" screen (5 tiers)
│   │   │   ├── ChallengeHeader.tsx     "CHALLENGE N/7" header
│   │   │   ├── StrikeCounter.tsx       3 lives display
│   │   │   ├── HintButton.tsx          Hint trigger (stub)
│   │   │   ├── ProgressGauge.tsx       Animated progress bar
│   │   │   ├── DialogueOverlay.tsx     Typewriter text + choices
│   │   │   ├── CombatHUD.tsx           Enemy encounter HUD
│   │   │   ├── HiddenObjectOverlay.tsx Cabinet drawer + assembly parts
│   │   │   ├── RoundTransition.tsx     Multi-round transition UI
│   │   │   └── GameOverScreen.tsx      Victory/defeat + rank badge
│   │   └── __tests__/GameWorld.test.tsx
│   ├── e2e/
│   │   └── *.spec.ts                 Playwright E2E tests (headed, system Chrome)
│   └── data/
│       ├── challenges/
│       │   └── variants.ts            6 ingredient + 3 grinding + 3 stuffing + 3 cooking variants
│       └── dialogue/
│           ├── intro.ts               Opening dialogue
│           ├── ingredients.ts         Fridge phase dialogue
│           ├── grinding.ts            Grinder phase dialogue
│           ├── stuffing.ts            Stuffer phase dialogue
│           ├── cooking.ts             Stove phase dialogue
│           └── verdict.ts             Rank-specific verdict dialogue
├── public/
│   ├── models/
│   │   ├── kitchen.glb               PBR-textured kitchen (15.5 MB, Blender bake)
│   │   ├── kitchen-original.glb      Original untextured GLB (970 KB)
│   │   └── sausage.glb               Legacy sausage model (unused, 1 MB)
│   └── textures/
│       ├── environment.env            Prefiltered IBL cubemap
│       ├── concrete_*.jpg             Concrete PBR set (color, normal, roughness)
│       ├── tile_floor_*.jpg           Floor tile PBR set
│       ├── tile_wall_*.jpg + ao       Wall tile PBR set (with ambient occlusion)
│       ├── grime_drip_*.jpg           Drip overlay (color, normal, opacity, roughness)
│       └── grime_base_*.jpg           Baseboard mold overlay
├── __tests__/                        Jest test files (pure logic)
├── docs/plans/                       Design & implementation documents
├── .github/workflows/
│   ├── ci.yml                        Tests on push (main + feat/**)
│   └── cd.yml                        Web export → GitHub Pages deploy
└── CLAUDE.md                         AI assistant instructions
```

## Data Flow

### Bridge Pattern (Ingredients, Tasting)

```text
User Input (touch/click)
  → React Native event handler (challenge overlay)
    → Zustand store action (setChallengeProgress, addStrike, etc.)
      → React re-render
        → GameWorld reads store → updates 3D station visuals (via useFrame)
        → Challenge overlay reads store → updates UI (progress bar, strikes)
        → On completeChallenge(score):
          → Store advances currentChallenge
          → FPSController animates camera to next station
          → Next challenge overlay mounts
```

### ECS Orchestrator Pattern (Grinding, Stuffing, Cooking, Blowout)

```text
ECS Orchestrator (useFrame loop)
  → Spawns/despawns entities via miniplex world
  → Runs game logic (timers, scoring, zone detection)
  → Writes bridge fields to Zustand (challengeTimeRemaining, challengeSpeedZone, challengePhase)
    → Thin HUD component reads bridge fields from store (ZERO input handling)
    → HUD renders read-only progress bars, timers, zone indicators
  → On completeChallenge(score):
    → Store advances currentChallenge
    → Orchestrator unmounts, entities despawn automatically
```

The Zustand store is the single source of truth. 3D stations and UI overlays both subscribe to it independently. There is no direct communication between the 3D layer and the UI layer — they coordinate through the store. ECS orchestrators own game logic for their challenges and write bridge fields to the store for thin HUDs to read.

## Planned Work

### POC Factory Mechanics Port
- Procedural station components planned: Grinder mechanics (InstancedMesh chunks, ground meat particles), Stuffer mechanics (TubeGeometry casing growth, SquigglyCurve), Cooking mechanics (FBO grease wave simulation, steam particles, temperature dial)
- Bone-chain sausage body with Rapier rigid bodies per bone segment (spring constant 80, damping 10) — currently SausageBody.ts has SkinnedMesh but no physics
- `@react-spring/three` planned for declarative object transitions (bowl slides, sausage carries) alongside existing `useFrame` procedural animations
- See `docs/plans/2026-03-01-sausage-factory-kitchen-design.md` for full design

### Extended Game Flow State Machine
- Design calls for expanding from 7-challenge sequence to a 12+ state machine: MENU -> LOADING -> INTRO_DIALOGUE -> OPEN_FRIDGE -> PICK_INGREDIENTS -> CLOSE_FRIDGE -> FILL_GRINDER -> GRINDING -> MOVE_BOWL -> ATTACH_CASING -> STUFFING -> MOVE_SAUSAGE -> MOVE_PAN -> COOKING -> TASTING -> VERDICT -> GAME_OVER
- Waypoint markers and proximity sensors guide player between expanded stations
- See `docs/plans/2026-03-01-sausage-factory-kitchen-plan.md` for implementation tasks
