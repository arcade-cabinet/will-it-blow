# Architecture Overview

## System Design

Will It Blow? is a first-person horror sausage-making mini-game. The player is trapped in a grimy basement kitchen and must complete 5 sequential challenges under the watchful eye of Mr. Sausage, a menacing sentient sausage displayed on a CRT television.

### Three-Layer Rendering Stack

```text
┌──────────────────────────────────────────┐
│  Layer 3: React Native UI Overlays       │  ← Buttons, progress bars, dialogue
│  (StyleSheet.absoluteFillObject, z=10)   │
├──────────────────────────────────────────┤
│  Layer 2: Babylon.js 3D Scene            │  ← Kitchen GLB, stations, lighting
│  (Engine → Scene → Camera/Meshes/Lights) │
├──────────────────────────────────────────┤
│  Layer 1: SafeAreaView (React Native)    │  ← Root container, flex: 1
└──────────────────────────────────────────┘
```

- **Layer 1** provides the root container and background color (#0a0a0a).
- **Layer 2** is the Babylon.js engine running inside a `<canvas>` element (web) or NativeEngine (mobile). It renders the 3D kitchen environment, station meshes, and CRT TV.
- **Layer 3** is React Native overlays (`pointerEvents="box-none"`) that float above the 3D scene. All game UI lives here: challenge controls, dialogue, menus, results.

### Platform Strategy

The app targets web (primary), iOS, and Android via Expo SDK 55 + React Native 0.83.

Platform-specific code uses Metro file extensions:
- `GameWorld.web.tsx` — Uses `reactylon/web` Engine (WebGPU/WebGL canvas)
- `GameWorld.native.tsx` — Uses `reactylon/native` NativeEngine
- `AudioEngine.web.ts` — Full Tone.js synthesis
- `AudioEngine.ts` — Native stub (no-op placeholder)

All other code is cross-platform.

### Key Technology Choices

| Technology | Version | Role |
|-----------|---------|------|
| React Native | 0.83.2 | UI framework, cross-platform |
| Babylon.js | 8.53.0 | 3D engine (WebGPU primary, WebGL fallback) |
| reactylon | 3.5.4 | React reconciler for Babylon.js (JSX scene graph) |
| cannon-es | 0.20.0 | Physics engine (gravity, collisions) |
| Zustand | 5.0.11 | State management (replaces React Context) |
| Tone.js | 15.1.22 | Web audio synthesis (procedural SFX) |
| Expo | 55.0.0 | Build toolchain, dev server, deployment |

## App Lifecycle

```text
App.tsx
  └─ useGameStore(s => s.appPhase)
     ├─ 'menu'    → <TitleScreen />           Pure 2D, no Babylon engine
     ├─ 'loading' → <LoadingScreen />          Preloads kitchen.glb via fetch()
     └─ 'playing' → <GameWorld /> + <GameUI /> Babylon engine + overlay stack
```

The `appPhase` state machine prevents the heavy Babylon.js engine from mounting until the player actually starts a game. This keeps the menu fast and avoids loading delays on first paint.

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
│   ├── components/
│   │   ├── GameWorld.tsx             Platform resolver (Metro extension)
│   │   ├── GameWorld.web.tsx         Babylon.js scene orchestrator (web)
│   │   ├── GameWorld.native.tsx      Babylon.js scene orchestrator (native)
│   │   ├── characters/
│   │   │   └── MrSausage3D.tsx       Procedural 3D character (self-lit)
│   │   ├── kitchen/
│   │   │   ├── KitchenEnvironment.tsx Room: walls, floor, ceiling, GLB model, lighting
│   │   │   ├── FridgeStation.tsx      3D fridge with ingredient meshes
│   │   │   ├── GrinderStation.tsx     3D grinder with crank animation
│   │   │   ├── StufferStation.tsx     3D stuffer with pressure visualization
│   │   │   ├── StoveStation.tsx       3D stove with temperature glow
│   │   │   └── CrtTelevision.tsx      CRT TV with Mr. Sausage + shader
│   │   ├── effects/
│   │   │   └── CrtShader.ts          GLSL chromatic aberration post-process
│   │   ├── challenges/
│   │   │   ├── IngredientChallenge.tsx Fridge: pick matching ingredients
│   │   │   ├── GrindingChallenge.tsx   Grinder: speed control drag mechanic
│   │   │   ├── StuffingChallenge.tsx   Stuffer: hold-to-fill pressure mgmt
│   │   │   ├── CookingChallenge.tsx    Stove: temperature control
│   │   │   └── TastingChallenge.tsx    Verdict: score reveal + rank
│   │   └── ui/
│   │       ├── TitleScreen.tsx         Butcher shop menu
│   │       ├── LoadingScreen.tsx       Asset preload + progress
│   │       ├── ChallengeHeader.tsx     "CHALLENGE N/5" header
│   │       ├── StrikeCounter.tsx       3 lives display
│   │       ├── HintButton.tsx          Hint trigger (stub)
│   │       ├── ProgressGauge.tsx       Animated progress bar
│   │       ├── DialogueOverlay.tsx     Typewriter text + choices
│   │       └── GameOverScreen.tsx      Victory/defeat + rank badge
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
├── __tests__/                        Jest test files (pure logic only)
├── docs/plans/                       Design & implementation documents
├── .github/workflows/
│   ├── ci.yml                        Tests on push (main + feat/**)
│   └── cd.yml                        Web export → GitHub Pages deploy
└── CLAUDE.md                         AI assistant instructions
```

## Data Flow

```text
User Input (touch/click)
  → React Native event handler (challenge overlay)
    → Zustand store action (setChallengeProgress, addStrike, etc.)
      → React re-render
        → GameWorld reads store → updates 3D station visuals
        → Challenge overlay reads store → updates UI (progress bar, strikes)
        → On completeChallenge(score):
          → Store advances currentChallenge
          → GameWorld animates camera walk to next station
          → Next challenge overlay mounts
```

The Zustand store is the single source of truth. 3D stations and UI overlays both subscribe to it independently. There is no direct communication between the 3D layer and the UI layer — they coordinate through the store.
