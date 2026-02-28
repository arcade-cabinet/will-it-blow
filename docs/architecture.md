# Architecture Overview

## System Design

Will It Blow? is a first-person horror sausage-making mini-game. The player is trapped in a grimy basement kitchen and must complete 5 sequential challenges under the watchful eye of Mr. Sausage, a menacing sentient sausage displayed on a CRT television.

### Two-Layer Rendering Stack

```text
┌──────────────────────────────────────────┐
│  Layer 2: React Native UI Overlays       │  ← Buttons, progress bars, dialogue
│  (StyleSheet.absoluteFillObject, z=10)   │
├──────────────────────────────────────────┤
│  Layer 1: React Three Fiber Canvas       │  ← Kitchen GLB, stations, lighting
│  (Three.js WebGL via R3F reconciler)     │
├──────────────────────────────────────────┤
│  Root: SafeAreaView (React Native)       │  ← Root container, flex: 1
└──────────────────────────────────────────┘
```

- **Root** provides the container and background color (#0a0a0a).
- **Layer 1** is the R3F `<Canvas>` rendering Three.js via WebGL. On web, this is a `<canvas>` element. On native, it uses `expo-gl` for the GL context. It renders the 3D kitchen environment, station meshes, and CRT TV.
- **Layer 2** is React Native overlays (`pointerEvents="box-none"`) that float above the 3D scene. All game UI lives here: challenge controls, dialogue, menus, results.

### Platform Strategy

The app targets web (primary), iOS, and Android via Expo SDK 55 + React Native 0.83.

A single `GameWorld.tsx` works on all platforms — R3F's `<Canvas>` uses `expo-gl` on native and standard WebGL on web. No platform-specific file splitting for the 3D layer.

Only remaining platform split:
- `AudioEngine.web.ts` — Full Tone.js synthesis
- `AudioEngine.ts` — Native stub (no-op placeholder)

### Key Technology Choices

| Technology | Version | Role |
|-----------|---------|------|
| React Native | 0.83.2 | UI framework, cross-platform |
| Three.js | 0.183.1 | 3D engine (WebGL) |
| React Three Fiber | 9.5.0 | React reconciler for Three.js (declarative JSX scene graph) |
| @react-three/drei | 10.7.7 | Helpers: useGLTF, Environment, etc. |
| @react-three/cannon | 6.6.0 | Physics (optional, available) |
| expo-gl | 55.0.9 | Native GL context for Three.js on iOS/Android |
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
│   ├── components/
│   │   ├── GameWorld.tsx             R3F Canvas, CameraWalker, station orchestrator
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
│   │   │   ├── CrtShader.ts          Three.js ShaderMaterial (chromatic aberration)
│   │   │   └── __tests__/CrtShader.test.ts
│   │   ├── ingredients/
│   │   │   ├── Ingredient3D.tsx      Shape-based ingredient meshes (8 types)
│   │   │   └── __tests__/Ingredient3D.test.tsx
│   │   ├── challenges/
│   │   │   ├── IngredientChallenge.tsx Fridge: pick matching ingredients
│   │   │   ├── GrindingChallenge.tsx   Grinder: speed control drag mechanic
│   │   │   ├── StuffingChallenge.tsx   Stuffer: hold-to-fill pressure mgmt
│   │   │   ├── CookingChallenge.tsx    Stove: temperature control
│   │   │   └── TastingChallenge.tsx    Verdict: score reveal + rank
│   │   ├── ui/
│   │   │   ├── TitleScreen.tsx         Butcher shop menu
│   │   │   ├── LoadingScreen.tsx       Asset preload + progress
│   │   │   ├── ChallengeHeader.tsx     "CHALLENGE N/5" header
│   │   │   ├── StrikeCounter.tsx       3 lives display
│   │   │   ├── HintButton.tsx          Hint trigger (stub)
│   │   │   ├── ProgressGauge.tsx       Animated progress bar
│   │   │   ├── DialogueOverlay.tsx     Typewriter text + choices
│   │   │   └── GameOverScreen.tsx      Victory/defeat + rank badge
│   │   └── __tests__/GameWorld.test.tsx
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

```text
User Input (touch/click)
  → React Native event handler (challenge overlay)
    → Zustand store action (setChallengeProgress, addStrike, etc.)
      → React re-render
        → GameWorld reads store → updates 3D station visuals (via useFrame)
        → Challenge overlay reads store → updates UI (progress bar, strikes)
        → On completeChallenge(score):
          → Store advances currentChallenge
          → CameraWalker animates camera to next station
          → Next challenge overlay mounts
```

The Zustand store is the single source of truth. 3D stations and UI overlays both subscribe to it independently. There is no direct communication between the 3D layer and the UI layer — they coordinate through the store.
