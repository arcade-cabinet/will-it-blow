---
title: State Management
domain: core
status: current
last-verified: 2026-03-13
depends-on: [architecture, game-design]
agent-context: store-warden, challenge-dev
summary: Zustand store schema (236 lines), actions, state flow — greenfield rebuild
---

# State Management

## Overview

All game state lives in a single Zustand store (`src/store/gameStore.ts`, 236 lines). No React Context providers, no prop drilling, no local component state for shared game data.

Components subscribe via Zustand selectors: `useGameStore(s => s.fieldName)`.

## Store Schema

### Lifecycle State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `appPhase` | `'title' \| 'playing' \| 'results'` | `'title'` | Controls top-level rendering. **Note:** `'results'` has no rendering path in App.tsx |
| `introActive` | `boolean` | `true` | Whether intro camera sequence is playing |
| `introPhase` | `number` | `0` | Current phase of intro sequence |
| `posture` | `Posture` | `'prone'` | Player posture: `'prone' \| 'sitting' \| 'standing'` |
| `idleTime` | `number` | `0` | Time since last posture change |

### Progression & Difficulty

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `difficulty` | `string` | `'medium'` | Difficulty tier ID |
| `currentRound` | `number` | `1` | Current round (1-indexed) |
| `totalRounds` | `number` | `3` | Total rounds for this difficulty |
| `usedIngredientCombos` | `string[][]` | `[]` | Previously used ingredient combos (sorted, for C(12,3) tracking) |

### Station Gameplay State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `gamePhase` | `GamePhase` | `'SELECT_INGREDIENTS'` | Current station/phase in the 13-phase machine |
| `groundMeatVol` | `number` | `0` | 0.0–1.0 grinder output volume |
| `stuffLevel` | `number` | `0` | 0.0–1.0 casing fill level |
| `casingTied` | `boolean` | `false` | Whether casing has been tied off |
| `cookLevel` | `number` | `0` | 0.0–1.0 cook progress |

### Scoring State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `selectedIngredientIds` | `string[]` | `[]` | IDs of selected ingredients for this round |
| `mrSausageReaction` | `Reaction` | `'idle'` | Current Mr. Sausage animation |
| `mrSausageDemands` | `object \| null` | `null` | Hidden demands: `{ desiredTags, hatedTags, cookPreference }` |
| `finalScore` | `any \| null` | `null` | **BUG: typed as `any`** — contains `{ calculated, totalScore, breakdown }` |

### Dialogue State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `currentDialogueLine` | `any \| null` | `null` | **DEAD FIELD** — setter exists but DialogueOverlay uses internal ref |
| `dialogueActive` | `boolean` | `false` | **DEAD FIELD** — setter exists but never read by any component |

### Input State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `joystick` | `{x, y}` | `{x:0, y:0}` | Virtual joystick position from mobile touch controls |
| `lookDelta` | `{x, y}` | `{x:0, y:0}` | Accumulated look deltas from touch/swipe |
| `interactPulse` | `number` | `0` | Incrementing counter for interact triggers |

## GamePhase Type (13 phases)

```typescript
type GamePhase =
  | 'SELECT_INGREDIENTS'
  | 'CHOPPING'
  | 'FILL_GRINDER'
  | 'GRINDING'
  | 'MOVE_BOWL'
  | 'ATTACH_CASING'
  | 'STUFFING'
  | 'TIE_CASING'
  | 'BLOWOUT'
  | 'MOVE_SAUSAGE'
  | 'MOVE_PAN'
  | 'COOKING'
  | 'DONE';
```

**Known issue:** GameOrchestrator.tsx PHASES array only contains 11 of these — `TIE_CASING` and `BLOWOUT` are missing, so dev shortcuts (n/p keys) skip them.

## Actions

### `setAppPhase(phase)`

Sets app lifecycle. Called by TitleScreen → `'playing'`.

### `setDifficulty(diff, total)`

Sets difficulty and resets round tracking: `difficulty`, `totalRounds`, `currentRound → 1`, `usedIngredientCombos → []`.

### `nextRound()`

Archives current ingredient combo into `usedIngredientCombos`, increments `currentRound`, resets per-round state (gamePhase, groundMeatVol, stuffLevel, casingTied, cookLevel, selectedIngredientIds, finalScore).

### `generateDemands()`

Randomly generates Mr. Sausage's hidden demands from 9 possible tags (sweet, savory, meat, spicy, comfort, absurd, fast-food, chunky, smooth). Picks 2 desired tags, 1 hated tag, and a random cook preference (rare/medium/well-done/charred).

### `calculateFinalScore()`

Calls `calculateDemandBonus()` from DemandScoring.ts with current demands, selected ingredients, and cook level. Stores result as `finalScore` (typed as `any`).

### Setter Actions

Standard setters for all state fields: `setGamePhase`, `setGroundMeatVol` (accepts number or updater function), `setStuffLevel`, `setCasingTied`, `setCookLevel`, `addSelectedIngredientId`, `setMrSausageReaction`, etc.

### Input Actions

- `setJoystick(x, y)` — Update virtual joystick position
- `addLookDelta(dx, dy)` — Accumulate look deltas from touch/swipe
- `consumeLookDelta()` — Read and reset look delta (one-shot consumption)
- `triggerInteract()` — Increment interact pulse counter

## Missing Actions (compared to main)

| Action | Purpose | Status |
|--------|---------|--------|
| `startNewGame()` | Full game reset + `variantSeed` | Missing |
| `returnToMenu()` | Reset to menu state | Missing |
| `completeChallenge(score)` | Advance challenge + accumulate score | Missing |
| `addStrike()` | Increment strikes, trigger defeat at 3 | Missing |
| `useHint()` | Decrement hints | Missing |
| `continueGame()` | Reset ephemeral state, keep progression | Missing |

## State Flow

```text
                    ┌──────────────────────────────┐
                    │         TITLE                 │
                    │  appPhase='title'             │
                    └──────────┬───────────────────┘
                               │ setAppPhase('playing')
                    ┌──────────▼───────────────────┐
                    │         PLAYING               │
                    │  appPhase='playing'           │
                    │  gamePhase cycles:            │
                    │  SELECT → ... → DONE          │
                    └──────────┬───────────────────┘
                               │ (NO ACTION EXISTS)
                    ┌──────────▼───────────────────┐
                    │         RESULTS               │
                    │  appPhase='results'           │
                    │  (NOT RENDERED)               │
                    └──────────────────────────────┘
```

**Note:** There is no way to get back to `'title'` from `'playing'` or `'results'`. No `returnToMenu()` action exists.

## Subscription Patterns

### Station → Store

```typescript
// Station reads gamePhase, writes gameplay state
const gamePhase = useGameStore(s => s.gamePhase);
const setGroundMeatVol = useGameStore(s => s.setGroundMeatVol);
// ... uses setGroundMeatVol in useFrame or pointer handlers
```

### UI Overlay → Store

```typescript
// Overlay reads state for display
const cookLevel = useGameStore(s => s.cookLevel);
const mrSausageReaction = useGameStore(s => s.mrSausageReaction);
```

### App.tsx → Store

```typescript
const appPhase = useGameStore(s => s.appPhase);
// Renders TitleScreen or GameWorld+overlays based on phase
```

## Planned Work

### Store Fixes
- Type `finalScore` with proper `{ calculated: boolean; totalScore: number; breakdown: object }` interface
- Remove dead fields: `dialogueActive`, `currentDialogueLine`
- Add `returnToMenu()` action
- Add `startNewGame()` with full reset
- Add `completeChallenge(score)` for challenge progression
- Add `addStrike()` with defeat trigger
- Fix GameOrchestrator PHASES to include all 13 phases
