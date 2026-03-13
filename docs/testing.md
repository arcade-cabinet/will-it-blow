---
title: Testing Strategy
domain: core
status: current
last-verified: 2026-03-13
depends-on: [3d-rendering, state-management]
agent-context: doc-keeper, challenge-dev
summary: "Jest testing — 7 suites, 62 tests (52 pass, 10 fail), greenfield rebuild coverage"
---

# Testing Strategy

## Overview

The greenfield rebuild on `feat/poc-exploration` has significantly reduced test coverage. The old 1529-test suite was tied to the deleted ECS architecture.

- **Framework:** Jest 29.6.3 with `react-native` preset + `babel-preset-expo`
- **Test count:** 62 tests across 7 suites (52 pass, 10 fail)
- **Runtime:** ~1.3 seconds
- **Pass rate:** 83.9%

## Running Tests

```bash
# All tests
pnpm test

# CI mode (no watch, force exit)
pnpm test -- --ci --forceExit

# Without watchman (needed in worktrees)
npx jest --no-watchman --ci --forceExit

# Single file
pnpm test -- DemandScoring
```

## Test Files

### Passing Suites

#### `src/engine/__tests__/DemandScoring.test.ts`

Tests demand bonus calculation: ingredient tag matching, cook preference scoring, breakdown structure.

#### `src/engine/__tests__/DifficultyConfig.test.ts`

Tests difficulty tier resolution and config parsing from difficulty.json.

#### `src/engine/__tests__/RoundManager.test.ts`

Tests multi-round loop: C(12,3) combo tracking, round advancement, combo uniqueness.

#### `__tests__/IngredientMatcher.test.ts`

Tests tag-based ingredient matching: keyword matching, criteria resolution, edge cases.

#### `src/components/challenges/__tests__/TieGesture.test.tsx`

Tests swipe-to-tie gesture recognition and scoring.

### Failing Suites

#### `src/store/__tests__/gameStore.test.ts`

Tests reference store actions that don't exist on this branch (e.g., `startNewGame`, `completeChallenge`, `addStrike`, `returnToMenu`). Tests need rewriting to match the actual 236-line store.

#### `src/components/camera/__tests__/SurrealText.spec.tsx`

Fails with Babel parse error — likely an import incompatibility with R3F test-renderer setup.

## What's NOT Tested

### Missing Test Coverage

1. **All station components** — Grinder, Stuffer, Stove, ChoppingBlock, BlowoutStation, TV, Sink, ChestFreezer (0 tests)
2. **Sausage physics** — Sausage.tsx, SausageGeometry.ts (0 tests)
3. **Camera system** — CameraRail, IntroSequence, FirstPersonControls (0 tests)
4. **UI components** — TitleScreen, DifficultySelector, DialogueOverlay (0 tests)
5. **Characters** — MrSausage3D, reactions (0 tests)
6. **Environment** — Kitchen, BasementRoom, SurrealText, ScatterProps (0 tests)
7. **Kitchen** — KitchenSetPieces, LiquidPourer, ProceduralIngredients, TrapDoorAnimation (0 tests)
8. **Engine** — GameOrchestrator, DialogueEngine, AudioEngine, Ingredients (0 tests on this branch)
9. **E2E** — Playwright spec exists but is not committed/integrated

### Systemic Gaps

- No R3F component tests (old tests deleted with ECS architecture)
- No audio tests
- No visual regression tests
- No challenge interaction tests
- No E2E integration tests in CI

## Type Checking

```bash
pnpm typecheck    # Uses node --stack-size=8192 for Three.js types
```

**Do NOT use** `npx tsc --noEmit` directly — stack overflow with Three.js recursive types.

## CI Integration

`.github/workflows/ci.yml` runs on push to `main` and `feat/**`:

```yaml
- run: pnpm install --frozen-lockfile
- run: pnpm test -- --ci --forceExit
```

**Note:** CI will currently report 10 test failures. The failing tests need to be fixed or removed.

## Adding New Tests

### Pure logic modules (safe to test directly)

- `src/engine/DemandScoring.ts`
- `src/engine/IngredientMatcher.ts`
- `src/engine/RoundManager.ts`
- `src/engine/DifficultyConfig.ts`
- `src/engine/DialogueEngine.ts`
- `src/engine/Ingredients.ts`
- `src/store/gameStore.ts`

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

## Planned Work

### Immediate Fixes
- Fix or rewrite `gameStore.test.ts` to match actual store API
- Fix `SurrealText.spec.tsx` Babel import issue
- Get to 100% pass rate (62/62)

### Coverage Expansion
- Add station component tests (Grinder, Stuffer, Stove are highest priority)
- Add GameOrchestrator tests (phase navigation, demand generation)
- Add DialogueEngine tests (tree walking, effects)
- Add E2E playthrough test in CI
