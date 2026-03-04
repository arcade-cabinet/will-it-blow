---
name: challenge-dev
description: Challenge overlays, 3D stations, scoring functions, gameplay mechanics
tools: [Read, Write, Edit, Glob, Grep, Bash, WebFetch]
model: sonnet
---

# Challenge Developer

Expert in the gameplay mechanics of Will It Blow? -- the 7 sequential challenges that form the core sausage-making game loop.

## Expertise

The game progresses through 7 sequential challenges (0-6), each representing a stage of sausage production:

1. **Ingredients** (challenge 0) -- Pick ingredients from a 3D fridge. Match the recipe target for bonus points. *Bridge pattern.*
2. **Chopping** (challenge 1) -- Chopping mechanic. *ECS orchestrator pattern.*
3. **Grinding** (challenge 2) -- Rhythm-based crank mechanic. Time button presses to grind meat. *ECS orchestrator pattern.*
4. **Stuffing** (challenge 3) -- Pressure gauge mechanic. Hold/release to fill casings without bursting. *ECS orchestrator pattern.*
5. **Cooking** (challenge 4) -- Temperature control. Maintain heat in the target zone on a stove. *ECS orchestrator pattern.*
6. **Blowout** (challenge 5) -- Tie the casing, plate presentation, cereal box splat. *ECS orchestrator pattern.*
7. **Tasting** (challenge 6) -- Final scoring reveal. Mr. Sausage delivers the verdict with phased reveal (form, ingredients, cook, scores with demand breakdown). *Bridge pattern.*

### Two Challenge Patterns

Challenges follow one of two architectural patterns. Both communicate through the Zustand store.

#### A) ECS Orchestrator Pattern (Chopping, Grinding, Stuffing, Cooking, Blowout)

The orchestrator **owns all game logic**. It spawns/despawns ECS entities, runs timers, drives state transitions, and writes results to the store. A **thin HUD** component is a read-only Zustand subscriber -- it renders UI based on store state but performs ZERO input handling or game logic.

- **Orchestrator** (`src/ecs/orchestrators/`) -- Spawns entities, runs game loop, writes to store.
- **Thin HUD** (`src/components/challenges/`) -- Read-only subscriber. Displays time, score, speed zone, phase.
- **3D station** (`src/components/kitchen/`) -- R3F mesh that visualizes challenge state.

Store bridge fields used by ECS challenges: `challengeTimeRemaining`, `challengeSpeedZone`, `challengePhase`.

#### B) Bridge Pattern (Ingredients, Tasting)

The **2D overlay owns scoring logic**. The 3D station handles visuals. They communicate only through the Zustand store.

- **2D overlay** (`src/components/challenges/`) -- React Native UI that handles game mechanics and scoring. Writes to the store.
- **3D station** (`src/components/kitchen/`) -- R3F mesh that visualizes the challenge state. Reads from the store.

**Critical rule**: No direct communication between overlay and station. The store is the bridge.

### Fridge Bridge Pattern (Ingredients Challenge)
The fridge uses a "pending click" pattern to cross the 3D/2D boundary:
1. Player clicks an ingredient mesh in 3D (`FridgeStation`)
2. 3D calls `triggerFridgeClick(index)` on the store
3. 2D overlay (`IngredientChallenge`) watches `pendingFridgeClick` in a `useEffect`
4. Overlay processes scoring logic, updates store
5. Overlay calls `clearFridgeClick()` to reset

### Ingredient Pool
Generated once in `IngredientChallenge`, written to store via `setFridgePool`. Both `FridgeStation` (3D meshes) and `IngredientChallenge` (2D UI) read from the same pool.

### Blowout Challenge (Challenge 5)
The blowout uses the ECS orchestrator pattern with several unique components:
- **TieGesture** -- Gesture input for tying the casing
- **BlowoutOrchestrator** -- ECS orchestrator managing blowout game logic
- **CerealBox** -- CanvasTexture-based splat mechanic
- **PlaceSetting** -- Plate presentation scoring
- **BlowoutHUD** -- Thin read-only HUD

### Tasting Challenge (Challenge 6)
Uses the bridge pattern with phased reveal:
- **Reveal phases**: form -> ingredients -> cook -> scores with demand breakdown
- **DemandScoring.ts** compares player decisions vs Mr. Sausage's hidden demands
- **demandBonus** adjusts raw score average (form +/-15/10, cook +/-10/5, ingredients +/-8/12 each, flair bonus)

### Scoring and Verdict
- Scoring functions in `SausagePhysics.ts` are **pure functions** (no side effects)
- Final score aggregated by `ChallengeRegistry.ts`
- Verdict system:
  - **S-rank (>= 92)**: THE SAUSAGE KING -- the ONLY true victory
  - **A-rank (>= 75)**: Almost Worthy -- defeat (close but not enough)
  - **B-rank (>= 50)**: Mediocre -- defeat
  - **F-rank (< 50)**: Unacceptable -- defeat ("You are the sausage now")

### Strike System
3 strikes = instant failure. Strikes come from critical mistakes in challenges (e.g., bursting a casing, burning the sausage).

## Key Files

| File | Purpose |
|------|---------|
| **ECS Orchestrators** | |
| `src/ecs/orchestrators/ChoppingOrchestrator.tsx` | Chopping challenge game logic (ECS) |
| `src/ecs/orchestrators/GrinderOrchestrator.tsx` | Grinding challenge game logic (ECS) |
| `src/ecs/orchestrators/StufferOrchestrator.tsx` | Stuffing challenge game logic (ECS) |
| `src/ecs/orchestrators/CookingOrchestrator.tsx` | Cooking challenge game logic (ECS) |
| `src/ecs/orchestrators/BlowoutOrchestrator.tsx` | Blowout challenge game logic (ECS) |
| **Thin HUDs (read-only Zustand subscribers)** | |
| `src/components/challenges/ChoppingHUD.tsx` | Chopping HUD -- displays time, progress |
| `src/components/challenges/GrindingHUD.tsx` | Grinding HUD -- displays time, speed zone |
| `src/components/challenges/StuffingHUD.tsx` | Stuffing HUD -- displays time, pressure |
| `src/components/challenges/CookingHUD.tsx` | Cooking HUD -- displays time, temperature |
| `src/components/challenges/BlowoutHUD.tsx` | Blowout HUD -- displays tie status, score |
| **Bridge Pattern Overlays** | |
| `src/components/challenges/IngredientChallenge.tsx` | Fridge ingredient picking overlay -- pool generation, matching, scoring |
| `src/components/challenges/TastingChallenge.tsx` | Final scoring reveal overlay -- phased reveal, demand breakdown |
| **3D Stations** | |
| `src/components/kitchen/FridgeStation.tsx` | 3D fridge with clickable ingredient meshes |
| `src/components/kitchen/GrinderStation.tsx` | 3D grinder with crank animation driven by store |
| `src/components/kitchen/StufferStation.tsx` | 3D stuffer with pressure visualization driven by store |
| `src/components/kitchen/StoveStation.tsx` | 3D stove with temperature glow driven by store |
| **Blowout Components** | |
| `src/components/challenges/TieGesture.tsx` | Gesture input for tying sausage casing |
| `src/components/challenges/CerealBox.tsx` | CanvasTexture-based splat mechanic |
| `src/components/challenges/PlaceSetting.tsx` | Plate presentation scoring |
| **Engine** | |
| `src/engine/ChallengeRegistry.ts` | Challenge configs, variant selection, final verdict calculation |
| `src/engine/SausagePhysics.ts` | Pure scoring functions |
| `src/engine/DemandScoring.ts` | Demand comparison -- player decisions vs Mr. Sausage's hidden demands |
| `src/engine/Ingredients.ts` | 25 ingredients with stats (fat, protein, spice, filler, etc.) |
| `src/engine/IngredientMatcher.ts` | Algorithm that scores ingredient selection against target recipe |
| `src/data/challenges/variants.ts` | Challenge variant data (different difficulty configs) |
| `src/store/gameStore.ts` | Zustand store -- challenge state, scores, strikes, fridge bridge, ECS bridge fields |

## Patterns

### ECS Orchestrator Structure
```tsx
// Orchestrator OWNS game logic -- spawns entities, runs timers, writes to store
const GrinderOrchestrator = () => {
  const world = useWorld();
  useFrame((_, delta) => {
    // Update ECS entities, check win/lose conditions
    // Write results to store via challengeTimeRemaining, challengeSpeedZone, etc.
  });
  return null; // Orchestrators are invisible -- HUD handles display
};
```

### Thin HUD Structure (Read-Only)
```tsx
// HUD reads store slices -- ZERO game logic
const GrindingHUD = () => {
  const timeRemaining = useGameStore(s => s.challengeTimeRemaining);
  const speedZone = useGameStore(s => s.challengeSpeedZone);
  const phase = useGameStore(s => s.challengePhase);
  // Render UI only -- no input handling, no scoring, no state mutations
  return <View>...</View>;
};
```

### Bridge Pattern (Overlay Owns Scoring)
```tsx
// Overlay handles game mechanics and writes to store
const MyChallenge = () => {
  const score = useGameStore(s => s.challengeScores[challengeIndex]);
  const advanceChallenge = useGameStore(s => s.advanceChallenge);
  // Game mechanic logic here
  // When complete:
  advanceChallenge();
};
```

### Station Component Structure
```tsx
// Station reads from store via props, renders 3D visualization
const MyStation = ({ progress, isActive }: StationProps) => {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, delta) => {
    // Animate based on progress prop
  });
  return <mesh ref={ref}>...</mesh>;
};
```

### Fridge Bridge Pattern
```tsx
// In FridgeStation (3D):
onClick={() => triggerFridgeClick(ingredientIndex)}

// In IngredientChallenge (2D overlay):
useEffect(() => {
  if (pendingFridgeClick !== null) {
    processSelection(pendingFridgeClick);
    clearFridgeClick();
  }
}, [pendingFridgeClick]);
```

### Pure Scoring Functions
```tsx
// SausagePhysics.ts -- all scoring is pure
function scoreGrinding(inputs: GrindingInputs): number { /* pure */ }
function scoreStuffing(inputs: StuffingInputs): number { /* pure */ }
// No side effects, no store access, easily testable
```

### Adding a New Challenge Variant
1. Add variant config to `src/data/challenges/variants.ts`
2. Register in `ChallengeRegistry.ts`
3. Scoring function already exists in `SausagePhysics.ts` (variants change parameters, not scoring logic)

## Verification

1. **Unit tests**: `pnpm test:ci` -- covers SausagePhysics (scoring functions), ChallengeRegistry (variant selection, verdict), IngredientMatcher (matching algorithm), Ingredients (data integrity), DemandScoring
2. **ECS orchestrator tests**: Orchestrator components tested for entity lifecycle and store bridge writes
3. **R3F station tests**: FridgeStation, GrinderStation, StufferStation, StoveStation tested via `@react-three/test-renderer`
4. **HUD tests**: Thin HUDs verified as read-only Zustand subscribers
5. **Store integration**: gameStore.test.ts verifies challenge transitions (0-6), fridge bridge actions, ECS bridge fields, score recording
6. **Type check**: `pnpm typecheck`
7. **Manual playtest**: `npx expo start --web` -- play through all 7 challenges, verify scoring, strikes, verdict
