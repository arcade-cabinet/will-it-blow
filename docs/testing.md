# Testing Strategy

## Overview

Tests cover **pure logic only**. There are zero React component render tests because Babylon.js ESM imports are incompatible with Jest's CommonJS transform pipeline. This is a known, accepted limitation.

- **Framework:** Jest 29.6.3 with `react-native` preset + `babel-preset-expo`
- **Test count:** 172 tests across 7 test files (+ duplicate tests from 3d-fridge worktree)
- **Runtime:** ~0.6 seconds

## Running Tests

```bash
# All tests
npm test

# CI mode (no watch, force exit)
npm test -- --ci --forceExit

# Watch mode (development)
npm test -- --watch

# Single file
npm test -- SausagePhysics
```

## Test Files

### `__tests__/SausagePhysics.test.ts` (~32 tests)
Tests the 5 pure scoring functions:
- `calculateBlowRuffalos()` — blow power from hold duration × ingredient stats
- `checkBurst()` — probabilistic burst check against average risk
- `calculateTasteRating()` — taste score from ingredient stats + burst penalty
- `calculateFinalScore()` — weighted formula combining taste, blow, burst, bonus
- `getTitleTier()` — maps score (0–100) to tier name ("Sausage Disaster" → "THE SAUSAGE KING")

### `__tests__/Ingredients.test.ts` (~15 tests)
Data integrity validation:
- At least 11 ingredients exist
- All required properties present (name, tasteMod, textureMod, burstRisk, blowPower, color, shape)
- All names unique
- Stat ranges validated (tasteMod: -1 to 5, burstRisk: 0 to 1, etc.)
- Pool randomization works (returns requested count)

### `__tests__/ChallengeRegistry.test.ts` (~12 tests)
- Variant seeding is deterministic (same seed → same variant)
- All challenge configs exist and have required fields
- `calculateFinalVerdict()` returns correct ranks for score ranges
- Challenge order matches expected sequence

### `__tests__/IngredientMatcher.test.ts` (~10 tests)
- Tag system maps categories correctly
- Keyword-based meat detection works
- Criteria matching returns correct ingredients
- Edge cases: empty criteria, no matches

### `__tests__/DialogueEngine.test.ts` (~12 tests)
- Line traversal advances correctly
- Choice selection branches to correct next line
- Effect tracking accumulates across choices
- Edge cases: empty dialogue, single line

### `__tests__/gameStore.test.ts` (~20 tests)
- Initial state matches INITIAL_GAME_STATE
- `setAppPhase()` transitions correctly
- `startNewGame()` resets all state, increments totalGamesPlayed
- `completeChallenge()` advances challenge, triggers victory at end
- `addStrike()` increments strikes, triggers defeat at 3
- `useHint()` decrements (minimum 0)
- `returnToMenu()` resets to menu state

### `__tests__/App.test.tsx` (~15 tests)
End-to-end scoring pipeline tests:
- Full game simulation (select → grind → stuff → cook → taste)
- Balance sanity checks (ingredient stat distributions)
- Title tier distribution covers all tiers
- Scoring formula edge cases

## What's NOT Tested

1. **React component rendering** — Babylon.js ESM breaks Jest. No snapshot tests, no interaction tests.
2. **3D scene behavior** — Camera walks, mesh creation, material setup
3. **Audio engine** — Tone.js synthesis (would need audio context mock)
4. **Platform-specific code** — Metro file extension splitting (GameWorld.web vs .native)
5. **Visual correctness** — No screenshot regression tests
6. **Challenge overlay interactions** — Touch/drag handlers, timer logic, sub-phase transitions

## Type Checking

```bash
npx tsc --noEmit
```

TypeScript strict mode is enabled. Test files produce Jest type warnings (`Cannot find name 'describe'`) because `@types/jest` is not installed — these are expected and documented in CLAUDE.md. Source files should produce zero errors.

## CI Integration

`.github/workflows/ci.yml` runs tests on push to `main` and `feat/**` branches:

```yaml
- run: npm ci
- run: npm test -- --ci --forceExit
```

**Known CI gaps:**
- No `npx tsc --noEmit` step (type errors not caught in CI)
- No lint step (ESLint/Biome not run in CI)
- No Android build step (despite CLAUDE.md claiming it exists)

## Adding New Tests

Only test pure logic modules that don't import from `@babylonjs/core`, `reactylon`, `tone`, or `react-native` components. Safe modules to test:

- `src/engine/SausagePhysics.ts`
- `src/engine/Ingredients.ts`
- `src/engine/ChallengeRegistry.ts`
- `src/engine/IngredientMatcher.ts`
- `src/engine/DialogueEngine.ts`
- `src/store/gameStore.ts`
- `src/data/challenges/variants.ts`
- `src/data/dialogue/*.ts`

If you need to test component behavior, consider:
- Extracting logic into pure functions and testing those
- Using Playwright for visual/integration testing (see deployment docs)
