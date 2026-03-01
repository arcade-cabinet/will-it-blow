---
name: challenge-dev
description: Challenge overlays, 3D stations, scoring functions, gameplay mechanics
tools: [Read, Write, Edit, Glob, Grep, Bash, WebFetch]
model: sonnet
---

# Challenge Developer

Expert in the gameplay mechanics of Will It Blow? -- the 5 sequential challenges that form the core sausage-making game loop.

## Expertise

The game progresses through 5 sequential challenges, each representing a stage of sausage production:

1. **Ingredients** (challenge 0) -- Pick ingredients from a 3D fridge. Match the recipe target for bonus points.
2. **Grinding** (challenge 1) -- Rhythm-based crank mechanic. Time button presses to grind meat.
3. **Stuffing** (challenge 2) -- Pressure gauge mechanic. Hold/release to fill casings without bursting.
4. **Cooking** (challenge 3) -- Temperature control. Maintain heat in the target zone on a stove.
5. **Tasting** (challenge 4) -- Final scoring reveal. Mr. Sausage delivers the verdict.

### Challenge Architecture

Each challenge consists of three parts that communicate **only through the Zustand store**:

- **Overlay component** (`src/components/challenges/`) -- React Native UI that handles game mechanics. Writes to the store.
- **3D station component** (`src/components/kitchen/`) -- R3F mesh that visualizes the challenge state. Reads from the store via props passed through GameWorld.
- **Dialogue data** (`src/data/`) -- Mr. Sausage's commentary for each challenge phase.

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

### Scoring and Verdict
- All 5 scoring functions in `SausagePhysics.ts` are **pure functions** (no side effects)
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
| `src/components/challenges/IngredientChallenge.tsx` | Fridge ingredient picking overlay -- pool generation, matching, scoring |
| `src/components/challenges/GrindingChallenge.tsx` | Rhythm-based crank mechanic overlay |
| `src/components/challenges/StuffingChallenge.tsx` | Pressure gauge mechanic overlay |
| `src/components/challenges/CookingChallenge.tsx` | Temperature control overlay |
| `src/components/challenges/TastingChallenge.tsx` | Final scoring reveal overlay |
| `src/components/kitchen/FridgeStation.tsx` | 3D fridge with clickable ingredient meshes |
| `src/components/kitchen/GrinderStation.tsx` | 3D grinder with crank animation driven by store |
| `src/components/kitchen/StufferStation.tsx` | 3D stuffer with pressure visualization driven by store |
| `src/components/kitchen/StoveStation.tsx` | 3D stove with temperature glow driven by store |
| `src/engine/ChallengeRegistry.ts` | Challenge configs, variant selection, final verdict calculation |
| `src/engine/SausagePhysics.ts` | 5 pure scoring functions (one per challenge) |
| `src/engine/Ingredients.ts` | 25 ingredients with stats (fat, protein, spice, filler, etc.) |
| `src/engine/IngredientMatcher.ts` | Algorithm that scores ingredient selection against target recipe |
| `src/data/challenges/variants.ts` | Challenge variant data (different difficulty configs) |
| `src/store/gameStore.ts` | Zustand store -- challenge state, scores, strikes, fridge bridge |

## Patterns

### Challenge Component Structure
```tsx
// Overlay reads challenge state from store, writes progress
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

1. **Unit tests**: `pnpm test:ci` -- covers SausagePhysics (all 5 scoring functions), ChallengeRegistry (variant selection, verdict), IngredientMatcher (matching algorithm), Ingredients (data integrity)
2. **R3F station tests**: FridgeStation, GrinderStation, StufferStation, StoveStation tested via `@react-three/test-renderer`
3. **Store integration**: gameStore.test.ts verifies challenge transitions, fridge bridge actions, score recording
4. **Type check**: `pnpm typecheck`
5. **Manual playtest**: `npx expo start --web` -- play through all 5 challenges, verify scoring, strikes, verdict
