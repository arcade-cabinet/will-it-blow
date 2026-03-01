<!--
title: First-Person Horror Kitchen Redesign — Design Document
domain: plan
status: historical
engine: babylon→r3f
last-verified: 2026-03-01
depends-on: ["2026-02-26-gameplay-elevation-design.md"]
agent-context: scene-architect, challenge-dev
summary: Design for transforming the game into a SAW-meets-Muppets horror escape room with sequential challenges, waypoint navigation, CRT TV Mr. Sausage, and Zustand state management.
-->

# Will It Blow? — Horror Kitchen Redesign

**Date:** 2026-02-27
**Status:** Approved

## Concept

A sausage-making horror escape room. SAW meets Muppets. You wake up in Mr. Sausage's basement kitchen. A grimy CRT television flickers to life — Mr. Sausage's enormous floating head fills the screen, flanked by static. He has demands. Make his sausage. Make it perfect. Or become the next one.

**Tone:** Campy horror-comedy. The setting is terrifying, the execution is absurd. Think Untitled Goose Game meets Jigsaw. Blood is ketchup-colored. Mr. Sausage delivers deadpan threats with a chef hat and handlebar mustache.

## Core Loop

```
[Title Screen] → [New Game / Continue]
                      ↓
[CRT TV lights up — Mr. Sausage delivers challenge]
                      ↓
[Player navigates kitchen via waypoints]
                      ↓
[Interact with station to attempt challenge]
                      ↓
[Success?] ──yes──→ [Save progress, next challenge unlocks]
     ↓ no                    ↓
[Strike counter]      [CRT TV: "Good. Now..."]
     ↓                       ↓
[3 strikes?]          [Next challenge begins]
     ↓ yes
[Fade to black — "You are the sausage now"]
```

Challenges are sequential. Each game run tackles challenges in fixed order (1 → 2 → 3 → 4 → 5). Progress persists via Zustand + AsyncStorage. "Continue Game" resumes at the next unsolved challenge. Each challenge type has randomized variants for replayability.

## Challenges

### Challenge 1: Ingredient Selection (Fridge Station)

Mr. Sausage gives a cryptic demand: "I want something SWEET and SAVORY. Don't disappoint me."

- Fridge contains 8-12 ingredients on shelves
- Hidden criteria randomized from a pool (taste profiles, textures, categories)
- Tap ingredient → it animates onto counter
- Mr. Sausage reacts: excitement = correct, disgust = wrong (strike), nervous = close but wrong (strike with soft hint)
- Need 3-4 correct ingredients to complete
- 3 strikes = challenge failed

Variant pool: 6-8 criteria combinations. Ingredient positions shuffled each game.

Builds on existing `Ingredients.ts` (25 ingredients with stats). Extended with category tags: sweet, savory, spicy, smooth, chunky, etc.

### Challenge 2: Grinding (Grinder Station)

"Grind my meat and grind it well."

- Circular drag gesture on crank handle
- Angular velocity tracked — too fast (>threshold) = splatter (strike), too slow (<threshold) = timer penalty
- Sweet spot: maintain medium speed consistently
- Progress bar fills as you grind
- 3 splatters or timer expiry = challenge failed

Visual: meat chunks enter hopper, ground meat exits with particles. Splatters hit the screen (4th-wall break + screen-shake).

### Challenge 3: Stuffing (Stuffer Station)

"Fill the casing. Gently."

- Press and hold to push plunger
- Two gauges: Fill (0-100%) and Pressure (0-100%)
- Pressing fills casing AND increases pressure
- Releasing lets pressure slowly decay
- Pressure > 90% = casing tears (instant fail)
- Must reach 100% fill with pressure below 90%
- Rhythm: push... release... push... release... (bomb defusal pacing)

Visual: casing inflates. Pressure changes casing color (green → yellow → red). Tear = dramatic burst + meat explosion.

### Challenge 4: Cooking (Stove Station)

"Don't you dare burn my beautiful creation."

- Vertical swipe controls heat (up = hotter, down = cooler)
- Thermometer shows internal temperature
- Target: cook to 160F (green zone) and hold 5 seconds
- Too hot → sausage chars, temperature overshoots
- Too cold → timer runs out
- Sausage color morphs: pink → brown (perfect) → black (burnt)

Visual: pan sizzles with particles. Smoke if overheating. Heat haze near pan.

### Challenge 5: The Tasting (CRT TV)

No player input — verdict scene.

- Cumulative score from challenges 1-4
- Mr. Sausage eats the sausage on the CRT (dramatic reaction animations)
- Dramatic pause with CRT static bursts

| Score | Rank | Outcome |
|-------|------|---------|
| 90-100% | S — THE SAUSAGE KING | Door unlocks. You escape. |
| 70-89% | A — Acceptable | "Again." New Game+ with harder variants. |
| 50-69% | B — Mediocre | "Disappointing." Retry from Challenge 1. |
| <50% | F — Unacceptable | "You are the sausage now." Fade to black. |

## Navigation

Fixed waypoint system (The Room / Myst style). Mobile-first.

```
Kitchen Layout (top-down):

      ┌─────────────────────────────┐
      │  [CRT TV mounted on wall]   │
      │         ▼                   │
      │     ● [1] CENTER            │
      │    / │ \                    │
      │   /  │  \                   │
      │  ●   ●   ●                 │
      │ [2] [3]  [4]               │
      │Fridge Grinder Stuffer       │
      │   \  │  /                   │
      │    \ │ /                    │
      │     ● [5]                   │
      │    Stove                    │
      │                             │
      │  [locked door]              │
      └─────────────────────────────┘
```

- 5 fixed positions with predefined camera view
- Drag to look around 360 degrees from each position
- Tap directional arrows to move between connected waypoints
- Smooth camera interpolation between positions
- During challenge close-ups, camera animates to station-specific view

## Mr. Sausage & CRT TV

Mr. Sausage's existing procedural mesh (35+ components, 8 reaction animations) is placed "inside" a CRT television:

- Box mesh with front plane using ShaderMaterial for CRT effects
- Effects: scanlines, chromatic aberration, screen flicker, vignette, static bursts
- MrSausage3D renders behind the CRT plane
- Existing reactions: idle, flinch, laugh, disgust, excitement, nervous, nod, talk
- New reactions needed: eating, judging (dramatic pause)

Mr. Sausage is Jigsaw — deadpan, cryptic, threatening, absurd.

## Dialogue System

Back-and-forth dialogue between player and Mr. Sausage.

- Mr. Sausage speaks (text near CRT with typewriter effect)
- Player gets 2-3 response options (floating choice buttons)
- Bold responses might anger Mr. Sausage (harder challenge) or amuse him (free hint)
- Safe responses keep status quo
- Dialogue trees defined per challenge as TypeScript data modules

```typescript
interface DialogueLine {
  speaker: 'sausage' | 'player';
  text: string;
  reaction?: MrSausageReaction;
  choices?: DialogueChoice[];
  effect?: DialogueEffect;
}

interface DialogueChoice {
  text: string;
  response: DialogueLine;
  effect?: 'hint' | 'taunt' | 'stall' | 'anger';
}
```

## Hint System

- 3 hints per game (lightbulb icon in corner)
- Tap hint → interactable objects get emissive glow pulse
- During ingredients: narrows down which ingredients match criteria
- During skill challenges: shows safe zone more clearly
- Limited supply creates tension

## Visual Atmosphere

Campy horror-comedy. Grimy basement kitchen.

- Cement walls and rust-stained tile (AmbientCG CC0 textures)
- Single swinging lightbulb casting dynamic shadows
- CRT TV with static flicker mounted on wall
- Meat splatter (bright cartoon red, not realistic gore)
- Dripping sounds, buzzing fluorescent, CRT hum
- Kenney asset packs (CC0) for kitchen equipment meshes
- Procedural MeshBuilder for custom geometry

## Technical Architecture

### Stack (Incremental Pivot)

Keep: React Native 0.83 + Babylon.js 8.53 + reactylon 3.5 + Cannon.js 0.20 + Expo 55 + platform splitting (.web.tsx / .native.tsx)

Add: Zustand (state persistence), CRT shader, waypoint navigation

### State Management

Replace React Context with Zustand + persist middleware (AsyncStorage).

```typescript
interface GameStore {
  currentChallenge: number;        // 0-4
  challengeScores: number[];       // Score per completed challenge
  gameStatus: 'menu' | 'playing' | 'victory' | 'defeat';
  strikes: number;                 // 0-3
  challengeProgress: number;       // 0-100
  hintsRemaining: number;
  totalGamesPlayed: number;

  startNewGame: () => void;
  continueGame: () => void;
  completeChallenge: (score: number) => void;
  addStrike: () => void;
  useHint: () => void;
}
```

### Challenge Registry

Each challenge is a self-contained module:

```typescript
interface ChallengeConfig {
  id: string;
  name: string;
  station: WaypointId;
  sceneComponent: React.ComponentType;
  overlayComponent: React.ComponentType;
  dialoguePool: DialogueLine[];
  variants: ChallengeVariant[];
  cameraPosition: CameraPreset;
}
```

New challenges added by creating scene + overlay + config entry. Engine iterates registry in order.

### Camera

Replace ArcRotateCamera with FreeCamera locked to waypoint positions. Rotation via touch drag (horizontal + limited vertical). No free movement — waypoint transitions only.

## File Structure

### Kept (modified)

- `App.tsx` — Swap GameProvider for Zustand
- `GameWorld.web.tsx` / `.native.tsx` — Waypoint camera, kitchen environment
- `MrSausage3D.tsx` — Keep entirely, add eating reaction
- `Ingredients.ts` — Extend with category tags
- `SausagePhysics.ts` — Adapt for challenge score aggregation

### Deleted

- All 6 scene components (TitleScene, GrinderScene, StufferScene, BlowScene, CookScene, TasteScene)
- `GameEngine.tsx` (replaced by Zustand store + challenge registry)
- `Constants.ts` (replaced by challenge configs + dialogue data)
- Most `ui/*.tsx` overlays (replaced by horror-themed equivalents)

### New

```
src/
├── store/
│   └── gameStore.ts
├── engine/
│   ├── ChallengeRegistry.ts
│   ├── DialogueEngine.ts
│   └── WaypointGraph.ts
├── components/
│   ├── kitchen/
│   │   ├── KitchenEnvironment.tsx
│   │   ├── CrtTelevision.tsx
│   │   ├── FridgeStation.tsx
│   │   ├── GrinderStation.tsx
│   │   ├── StufferStation.tsx
│   │   └── StoveStation.tsx
│   ├── challenges/
│   │   ├── IngredientChallenge.tsx
│   │   ├── GrindingChallenge.tsx
│   │   ├── StuffingChallenge.tsx
│   │   ├── CookingChallenge.tsx
│   │   └── TastingChallenge.tsx
│   ├── navigation/
│   │   ├── WaypointNavigator.tsx
│   │   └── NavigationArrow.tsx
│   ├── ui/
│   │   ├── TitleScreen.tsx
│   │   ├── DialogueOverlay.tsx
│   │   ├── HintButton.tsx
│   │   ├── StrikeCounter.tsx
│   │   ├── ProgressGauge.tsx
│   │   ├── ChallengeHeader.tsx
│   │   └── GameOverScreen.tsx
│   ├── effects/
│   │   ├── CrtShader.ts
│   │   ├── SwingingLight.tsx
│   │   └── MeatSplatter.tsx
│   └── characters/
│       └── MrSausage3D.tsx
├── data/
│   ├── dialogue/
│   │   ├── intro.ts
│   │   ├── ingredients.ts
│   │   ├── grinding.ts
│   │   ├── stuffing.ts
│   │   ├── cooking.ts
│   │   └── verdict.ts
│   └── challenges/
│       └── variants.ts
└── audio/
    └── AudioEngine.web.ts
```

### Testing

Test pure logic only (same pattern as current):
- ChallengeRegistry (variant selection, score aggregation)
- DialogueEngine (tree traversal, choice effects)
- WaypointGraph (pathfinding, valid transitions)
- Ingredients (category tagging, criteria matching)
- SausagePhysics (adapted scoring)
- Zustand store (state transitions, persistence)

No Babylon.js component tests (ESM incompatibility with Jest).
