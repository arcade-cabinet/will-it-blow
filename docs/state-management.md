<!--
title: State Management
domain: core
status: current
engine: r3f
last-verified: 2026-03-01
depends-on: [architecture, game-design]
agent-context: store-warden, challenge-dev
summary: Zustand store schema, actions, state flow
-->

# State Management

## Overview

All game state lives in a single Zustand store (`src/store/gameStore.ts`). There are no React Context providers, no prop drilling for game state, and no local component state for shared game data.

Components subscribe to specific slices of the store using Zustand selectors, which prevents unnecessary re-renders.

## Store Schema

### Lifecycle State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `appPhase` | `'menu' \| 'loading' \| 'playing'` | `'menu'` | Controls which top-level component renders (TitleScreen / LoadingScreen / GameWorld+GameUI) |
| `gameStatus` | `'menu' \| 'playing' \| 'victory' \| 'defeat'` | `'menu'` | In-game state machine. Victory/defeat triggers GameOverScreen overlay. |

### Progression State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `currentChallenge` | `number` | `0` | Index into CHALLENGE_ORDER (0=ingredients, 1=grinding, 2=stuffing, 3=cooking, 4=tasting) |
| `challengeScores` | `number[]` | `[]` | Accumulated scores for completed challenges |
| `strikes` | `number` | `0` | Strikes in current challenge (0–3). Resets between challenges. |
| `hintsRemaining` | `number` | `3` | Hints available for the entire game |

### Challenge Ephemeral State

These fields are set by challenge overlays and read by 3D station components:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `challengeProgress` | `number` | `0` | 0–100 progress through current challenge |
| `challengePressure` | `number` | `0` | 0–100 pressure level (stuffing challenge) |
| `challengeIsPressing` | `boolean` | `false` | Whether player is currently pressing/holding (stuffing) |
| `challengeTemperature` | `number` | `70` | Current temperature in °F (cooking challenge) |
| `challengeHeatLevel` | `number` | `0` | 0–100 heat control setting (cooking challenge) |

### Meta State

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `totalGamesPlayed` | `number` | `0` | Lifetime games played (persists across games in session, not saved to disk) |
| `variantSeed` | `number` | `0` | Seed for deterministic variant selection (set to Date.now() on startNewGame) |

## Actions

### `setAppPhase(phase)`

Sets the app lifecycle phase. Called by:
- LoadingScreen → `'playing'` when assets are preloaded
- Title screen → `'loading'` on "NEW GAME"

### `startNewGame()`

Resets all game state for a fresh playthrough:
- `appPhase` → `'playing'`
- `gameStatus` → `'playing'`
- `currentChallenge` → 0
- `challengeScores` → []
- All ephemeral state → defaults
- `hintsRemaining` → 3
- `totalGamesPlayed` += 1
- `variantSeed` → Date.now()

### `continueGame()`

Resets challenge-level ephemeral state but preserves progression. Used when retrying after non-fatal failure.

### `completeChallenge(score)`

Advances to next challenge:
- Appends score to `challengeScores`
- Increments `currentChallenge`
- Resets all challenge ephemeral state
- If last challenge (index 4), sets `gameStatus` → `'victory'`

### `addStrike()`

Increments strikes. If strikes ≥ 3, sets `gameStatus` → `'defeat'`.

### `useHint()`

Decrements `hintsRemaining` (minimum 0).

### `returnToMenu()`

Resets to menu: `appPhase` → `'menu'`, `gameStatus` → `'menu'`, all ephemeral state → defaults.

## State Flow Diagram

```text
                    ┌──────────────────────────────┐
                    │         MENU                  │
                    │  appPhase='menu'              │
                    │  gameStatus='menu'            │
                    └──────────┬───────────────────┘
                               │ setAppPhase('loading')
                    ┌──────────▼───────────────────┐
                    │         LOADING               │
                    │  appPhase='loading'           │
                    │  gameStatus='menu'            │
                    └──────────┬───────────────────┘
                               │ startNewGame()
                    ┌──────────▼───────────────────┐
                    │         PLAYING               │
                    │  appPhase='playing'           │
                    │  gameStatus='playing'         │
                    │  currentChallenge: 0→1→2→3→4  │
                    └──┬───────────────┬───────────┘
                       │               │
          addStrike()  │               │ completeChallenge(score)
          strikes ≥ 3  │               │ currentChallenge ≥ 5
                       ▼               ▼
                    DEFEAT          VICTORY
                    gameStatus=     gameStatus=
                    'defeat'        'victory'
                       │               │
                       └───────┬───────┘
                               │ returnToMenu()
                               ▼
                             MENU
```

## Subscription Patterns

### Challenge overlay → Store

```typescript
// Challenge reads variant seed, writes progress/strikes
const { variantSeed, setChallengeProgress, addStrike, completeChallenge } = useGameStore();
```

### 3D Station → Store (via GameWorld)

```typescript
// GameWorld reads challenge state, passes to station components as props
const { challengeProgress, challengePressure, strikes } = useGameStore();
// ...
<StufferStation fillLevel={challengeProgress} pressureLevel={challengePressure} />
```

### App.tsx → Store

```typescript
// Top-level phase routing
const appPhase = useGameStore(s => s.appPhase);
// Renders TitleScreen, LoadingScreen, or GameWorld+GameUI based on phase
```

## Constants

```typescript
const TOTAL_CHALLENGES = 5;
const INITIAL_HINTS = 3;
const MAX_STRIKES = 3;
```

## Known Limitation: No Persistence

The store is in-memory only. Closing the browser tab loses all state. The "CONTINUE" button on the title screen exists but has no backing save/load system. `totalGamesPlayed` resets to 0 on page reload.
