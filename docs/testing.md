# Testing Strategy

## Overview

Tests cover both **pure logic** and **R3F 3D component** behavior. R3F components are tested via `@react-three/test-renderer`, which renders the Three.js scene graph in Node.js without a canvas.

- **Framework:** Jest 29.6.3 with `react-native` preset + `babel-preset-expo`
- **Test count:** 265 tests across ~17 test files
- **Runtime:** ~1.6 seconds

## Running Tests

```bash
# All tests
pnpm test

# CI mode (no watch, force exit)
pnpm test -- --ci --forceExit

# Watch mode (development)
pnpm test -- --watch

# Single file
pnpm test -- SausagePhysics
```

## Test Files

### Pure Logic Tests (`__tests__/`)

#### `SausagePhysics.test.ts` (~32 tests)
Tests the 5 pure scoring functions:
- `calculateBlowRuffalos()` — blow power from hold duration × ingredient stats
- `checkBurst()` — probabilistic burst check against average risk
- `calculateTasteRating()` — taste score from ingredient stats + burst penalty
- `calculateFinalScore()` — weighted formula combining taste, blow, burst, bonus
- `getTitleTier()` — maps score (0–100) to tier name

#### `Ingredients.test.ts` (~15 tests)
Data integrity: all properties present, names unique, stat ranges valid, pool randomization works.

#### `ChallengeRegistry.test.ts` (~12 tests)
Variant seeding, challenge configs, `calculateFinalVerdict()` ranks, challenge order.

#### `IngredientMatcher.test.ts` (~10 tests)
Tag system, keyword-based matching, criteria matching, edge cases.

#### `DialogueEngine.test.ts` (~12 tests)
Line traversal, choice selection branching, effect tracking.

#### `gameStore.test.ts` (~20 tests)
Store state transitions, `startNewGame()`, `completeChallenge()`, `addStrike()`, `returnToMenu()`.

#### `App.test.tsx` (~15 tests)
End-to-end scoring pipeline, balance sanity checks, title tier distribution.

### R3F Component Tests (`src/components/**/\__tests__/`)

These use `@react-three/test-renderer` to render R3F components and inspect the Three.js scene graph.

#### `CrtShader.test.ts` (2 tests)
Verifies shader material creation and uniform presence.

#### `MrSausage3D.test.tsx` (4 tests)
Head sphere present, reaction prop updates, self-lit material verification.

#### `CrtTelevision.test.tsx` (5 tests)
TV housing geometry, CRT shader screen, Mr. Sausage embedded.

#### `KitchenEnvironment.test.tsx` (7 tests)
Room enclosure geometry, lighting setup, GLB model integration (useGLTF mocked).

#### `FridgeStation.test.tsx` (7 tests)
Fridge geometry, ingredient meshes, onClick picking, hint glow.

#### `GrinderStation.test.tsx` (7 tests)
Grinder geometry, crank animation, meat chunks, splatter particles.

#### `StufferStation.test.tsx` (12 tests)
Plunger animation, casing inflation, pressureToColor pure function, burst particles.

#### `StoveStation.test.tsx` (11 tests)
Burner glow, sausageColor pure function, sizzle/smoke particles.

#### `Ingredient3D.test.tsx` (4 tests)
8 shape types render correctly, self-lit material, color prop.

#### `GameWorld.test.tsx` (7 tests)
Canvas mounting, CameraWalker, station visibility logic.

## What's NOT Tested

1. **Audio engine** — Tone.js synthesis (would need audio context mock)
2. **Visual correctness** — No screenshot regression tests (use Playwright MCP for manual verification)
3. **Challenge overlay interactions** — Touch/drag handlers, timer logic, sub-phase transitions
4. **Real GLB loading** — useGLTF is mocked; actual model parsing not tested in Jest

## Type Checking

```bash
npx tsc --noEmit
```

TypeScript strict mode is enabled. Source files should produce zero errors.

## CI Integration

`.github/workflows/ci.yml` runs tests on push to `main` and `feat/**` branches:

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm test -- --ci --forceExit
```

## Adding New Tests

### Pure logic modules (safe to test directly)
- `src/engine/SausagePhysics.ts`
- `src/engine/Ingredients.ts`
- `src/engine/ChallengeRegistry.ts`
- `src/engine/IngredientMatcher.ts`
- `src/engine/DialogueEngine.ts`
- `src/store/gameStore.ts`
- `src/data/challenges/variants.ts`
- `src/data/dialogue/*.ts`

### R3F components (test via @react-three/test-renderer)

```tsx
import ReactThreeTestRenderer from '@react-three/test-renderer';

it('renders the mesh', async () => {
  const renderer = await ReactThreeTestRenderer.create(
    <MyComponent prop="value" />
  );
  const meshes = renderer.scene.findAll((node) => node.type === 'Mesh');
  expect(meshes.length).toBeGreaterThan(0);
});
```

**Important:** Mock `useGLTF` if the component loads GLB files:

```tsx
jest.mock('@react-three/drei', () => ({
  useGLTF: jest.fn(() => ({
    scene: new THREE.Group(),
    nodes: {},
    materials: {},
  })),
}));
```

### Exported pure functions from R3F components

Some station components export pure functions for testability:
- `StufferStation.tsx` → `pressureToColor(pressure: number)`
- `StoveStation.tsx` → `sausageColor(progress: number)`

These can be tested directly without the test renderer.
